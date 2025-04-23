const async = require("async")
const { ctx } = require("@modjo/core")
const ms = require("ms")
const cron = require("~/libs/cron")
const { DEVICE_GEODATA_MAX_AGE } = require("~/constants/time")

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

  return async function geodataCleanupCron() {
    logger.info("watcher geodataCleanupCron: daemon started")

    async function cleanupOldGeodata() {
      const now = Math.floor(Date.now() / 1000) // Current time in seconds
      const coldKeys = new Set() // Store cold geodata keys
      let coldCursor = "0"
      do {
        const [newCursor, keys] = await redisCold.scan(
          coldCursor,
          "MATCH",
          `${COLDGEODATA_DEVICE_KEY_PREFIX}*`,
          "COUNT",
          "100"
        )
        coldCursor = newCursor
        keys.forEach((key) => coldKeys.add(key))
      } while (coldCursor !== "0")

      await async.eachLimit(
        [...coldKeys],
        MAX_PARALLEL_PROCESS,
        async (key) => {
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
              } catch (error) {
                logger.error({ error, deviceId }, "Error cleaning device data")
              }
            }
          } catch (error) {
            logger.error(
              { error, key },
              "Error processing device data from cold storage"
            )
          }
        }
      )
    }

    // Schedule the cleanup to run periodically
    cron.schedule(CLEANUP_CRON, cleanupOldGeodata)
  }
}
