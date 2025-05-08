const async = require("async")
const { ctx } = require("@modjo/core")
const ms = require("ms")
const cron = require("~/libs/cron")
const { DEVICE_GEODATA_MAX_AGE } = require("~/constants/time")
const tasks = require("~/tasks")

const CLEANUP_CRON = "0 */1 * * *" // Run every hour
const MAX_PARALLEL_PROCESS = 10
const COLDGEODATA_DEVICE_KEY_PREFIX = "device:geodata:"
const COLDGEODATA_OLD_KEY_PREFIX = "old:device:geodata:"
const HOTGEODATA_KEY = "device" // The key where hot geodata is stored
const maxAge = Math.floor(ms(DEVICE_GEODATA_MAX_AGE) / 1000) // Convert to seconds

module.exports = async function () {
  const logger = ctx.require("logger")
  const redisCold = ctx.require("keydbColdGeodata")
  const redisHot = ctx.require("redisHotGeodata")
  const { addTask } = ctx.require("amqp")

  return async function geodataCleanupCron() {
    logger.info("watcher geodataCleanupCron: daemon started")

    // Process keys in batches to avoid memory accumulation
    async function cleanupOldGeodata() {
      const now = Math.floor(Date.now() / 1000) // Current time in seconds
      let coldCursor = "0"

      do {
        // Get batch of keys using SCAN
        const [newCursor, keys] = await redisCold.scan(
          coldCursor,
          "MATCH",
          `${COLDGEODATA_DEVICE_KEY_PREFIX}*`,
          "COUNT",
          "100"
        )
        coldCursor = newCursor

        // Process this batch of keys immediately
        if (keys.length > 0) {
          await async.eachLimit(keys, MAX_PARALLEL_PROCESS, async (key) => {
            const deviceId = key.slice(COLDGEODATA_DEVICE_KEY_PREFIX.length)

            try {
              // Get device data from cold storage
              const deviceData = await redisCold.get(key)
              if (!deviceData) {
                return
              }

              // Parse stored JSON to get `updatedAt`
              const data = JSON.parse(deviceData)

              // const age = now - data.updatedAt
              const age = data.updatedAt ? now - data.updatedAt : Infinity // trick is for missing updatedAt field on old entries

              // If data is older than maxAge
              if (age > maxAge) {
                try {
                  // Remove from hot storage
                  await redisHot.zrem(HOTGEODATA_KEY, deviceId)

                  // Move to cleaned prefix in cold storage
                  const oldKey = `${COLDGEODATA_OLD_KEY_PREFIX}${deviceId}`
                  await redisCold.rename(key, oldKey)

                  logger.debug(
                    { deviceId, age: `${Math.floor(age / 3600)}h` },
                    "Removed old device data from hot storage and marked as cleaned in cold storage"
                  )

                  // Enqueue task to notify user about lost background geolocation
                  try {
                    await addTask(tasks.BACKGROUND_GEOLOCATION_LOST_NOTIFY, {
                      deviceId,
                    })

                    logger.info(
                      { deviceId },
                      "Enqueued background geolocation lost notification task"
                    )
                  } catch (notifError) {
                    logger.error(
                      { deviceId, error: notifError },
                      "Error enqueueing background geolocation lost notification task"
                    )
                  }
                } catch (error) {
                  logger.error(
                    { error, deviceId },
                    "Error cleaning device data"
                  )
                }
              }
            } catch (error) {
              logger.error(
                { error, key },
                "Error processing device data from cold storage"
              )
            }
          })
        }
      } while (coldCursor !== "0")
    }

    // this is temporary function (fixing actual data)
    async function cleanupOrphanedHotGeodata() {
      // Get all devices from hot storage
      const hotDevices = new Set()
      let hotCursor = "0"
      do {
        // Use zscan to iterate through the sorted set
        const [newCursor, items] = await redisHot.zscan(
          HOTGEODATA_KEY,
          hotCursor,
          "COUNT",
          "100"
        )
        hotCursor = newCursor

        // Extract device IDs (every other item in the result is a score)
        for (let i = 0; i < items.length; i += 2) {
          hotDevices.add(items[i])
        }
      } while (hotCursor !== "0")

      // Process each hot device
      await async.eachLimit(
        [...hotDevices],
        MAX_PARALLEL_PROCESS,
        async (deviceId) => {
          try {
            // Check if device exists in cold storage
            const coldKey = `${COLDGEODATA_DEVICE_KEY_PREFIX}${deviceId}`
            const exists = await redisCold.exists(coldKey)

            // If device doesn't exist in cold storage, remove it from hot storage
            if (!exists) {
              await redisHot.zrem(HOTGEODATA_KEY, deviceId)
              logger.debug(
                { deviceId },
                "Removed orphaned device data from hot storage (not found in cold storage)"
              )
            }
          } catch (error) {
            logger.error(
              { error, deviceId },
              "Error checking orphaned device data"
            )
          }
        }
      )
    }

    // Schedule both cleanup functions to run periodically
    cron.schedule(CLEANUP_CRON, async () => {
      await cleanupOldGeodata()
      await cleanupOrphanedHotGeodata()
    })
  }
}
