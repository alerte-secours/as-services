const async = require("async")
const { ctx } = require("@modjo/core")
const ms = require("ms")
const cron = require("~/libs/cron")
const {
  // DEVICE_GEODATA_IOS_SILENT_PUSH_AGE,
  DEVICE_GEODATA_NOTIFICATION_AGE,
  DEVICE_GEODATA_CLEANUP_AGE,
} = require("~/constants/time")
const tasks = require("~/tasks")

const CLEANUP_CRON = "0 */4 * * *" // Run every 4 hours
const MAX_PARALLEL_PROCESS = 10
const COLDGEODATA_DEVICE_KEY_PREFIX = "device:geodata:"
const COLDGEODATA_OLD_KEY_PREFIX = "old:device:geodata:"
const COLDGEODATA_NOTIFIED_KEY_PREFIX = "notified:device:geodata:"
const HOTGEODATA_KEY = "device" // The key where hot geodata is stored
// const iosHeartbeatAge = Math.floor(ms(DEVICE_GEODATA_IOS_SILENT_PUSH_AGE) / 1000)
const notificationAge = Math.floor(ms(DEVICE_GEODATA_NOTIFICATION_AGE) / 1000) // Convert to seconds
const cleanupAge = Math.floor(ms(DEVICE_GEODATA_CLEANUP_AGE) / 1000) // Convert to seconds

module.exports = async function () {
  const logger = ctx.require("logger")
  const redisCold = ctx.require("keydbColdGeodata")
  const redisHot = ctx.require("redisHotGeodata")
  const { addTask } = ctx.require("amqp")

  return async function geodataCleanupCron() {
    logger.info("watcher geodataCleanupCron: daemon started")

    // Helper function to check if current time is within notification window (9-19h)
    function isWithinNotificationWindow() {
      const now = new Date()
      const hour = now.getHours()
      return hour >= 9 && hour < 19
    }

    // Process geodata cleanup with single loop for both notifications and cleanup
    async function processGeodataCleanup() {
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
              const age = data.updatedAt ? now - data.updatedAt : Infinity

              if (age > cleanupAge) {
                try {
                  // Remove from hot storage
                  await redisHot.zrem(HOTGEODATA_KEY, deviceId)

                  // Move to cleaned prefix in cold storage and clean notification flag atomically
                  const oldKey = `${COLDGEODATA_OLD_KEY_PREFIX}${deviceId}`
                  const notifiedKey = `${COLDGEODATA_NOTIFIED_KEY_PREFIX}${deviceId}`

                  const transaction = redisCold.multi()
                  transaction.rename(key, oldKey)
                  transaction.del(notifiedKey)
                  await transaction.exec()

                  logger.debug(
                    { deviceId, age: `${Math.floor(age / 3600)}h` },
                    "Removed old device data from hot storage and marked as cleaned in cold storage"
                  )
                } catch (error) {
                  logger.error(
                    { error, deviceId },
                    "Error cleaning device data"
                  )
                }
                // } else if (age > iosHeartbeatAge) {
                //   try {
                //     await addTask(tasks.IOS_GEOLOCATION_HEARTBEAT_SYNC, {
                //       deviceId,
                //     })

                //     logger.info(
                //       { deviceId, age: `${Math.floor(age / 3600)}h` },
                //       "Enqueued iOS geolocation heartbeat sync task"
                //     )
                //   } catch (heartbeatError) {
                //     logger.error(
                //       { deviceId, error: heartbeatError },
                //       "Error enqueueing iOS geolocation heartbeat sync task"
                //     )
                //   }
              } else if (age > notificationAge) {
                const notifiedKey = `${COLDGEODATA_NOTIFIED_KEY_PREFIX}${deviceId}`

                try {
                  // Check if we've already notified for this device
                  const alreadyNotified = await redisCold.exists(notifiedKey)

                  if (!alreadyNotified && isWithinNotificationWindow()) {
                    // Enqueue task to notify user about lost background geolocation
                    try {
                      await addTask(tasks.BACKGROUND_GEOLOCATION_LOST_NOTIFY, {
                        deviceId,
                      })

                      logger.info(
                        { deviceId, age: `${Math.floor(age / 3600)}h` },
                        "Enqueued background geolocation lost notification task"
                      )
                    } catch (notifError) {
                      logger.error(
                        { deviceId, error: notifError },
                        "Error enqueueing background geolocation lost notification task"
                      )
                    }
                    // Mark as notified with 48h expiry (cleanup age)
                    await redisCold.set(notifiedKey, "1", "EX", cleanupAge)
                  } else if (
                    !alreadyNotified &&
                    !isWithinNotificationWindow()
                  ) {
                    logger.debug(
                      { deviceId, age: `${Math.floor(age / 3600)}h` },
                      "Skipping notification outside business hours (9-19h)"
                    )
                  }
                } catch (error) {
                  logger.error(
                    { error, deviceId },
                    "Error processing notification for device"
                  )
                }
              }
            } catch (error) {
              logger.error({ error, key }, "Error processing device data")
            }
          })
        }
      } while (coldCursor !== "0")
    }

    // this is temporary function (fixing actual data)
    // async function cleanupOrphanedHotGeodata() {
    //   // Get all devices from hot storage
    //   const hotDevices = new Set()
    //   let hotCursor = "0"
    //   do {
    //     // Use zscan to iterate through the sorted set
    //     const [newCursor, items] = await redisHot.zscan(
    //       HOTGEODATA_KEY,
    //       hotCursor,
    //       "COUNT",
    //       "100"
    //     )
    //     hotCursor = newCursor

    //     // Extract device IDs (every other item in the result is a score)
    //     for (let i = 0; i < items.length; i += 2) {
    //       hotDevices.add(items[i])
    //     }
    //   } while (hotCursor !== "0")

    //   // Process each hot device
    //   await async.eachLimit(
    //     [...hotDevices],
    //     MAX_PARALLEL_PROCESS,
    //     async (deviceId) => {
    //       try {
    //         // Check if device exists in cold storage
    //         const coldKey = `${COLDGEODATA_DEVICE_KEY_PREFIX}${deviceId}`
    //         const exists = await redisCold.exists(coldKey)

    //         // If device doesn't exist in cold storage, remove it from hot storage
    //         if (!exists) {
    //           await redisHot.zrem(HOTGEODATA_KEY, deviceId)
    //           logger.debug(
    //             { deviceId },
    //             "Removed orphaned device data from hot storage (not found in cold storage)"
    //           )
    //         }
    //       } catch (error) {
    //         logger.error(
    //           { error, deviceId },
    //           "Error checking orphaned device data"
    //         )
    //       }
    //     }
    //   )
    // }

    // Schedule cleanup function to run periodically
    cron.schedule(CLEANUP_CRON, async () => {
      await processGeodataCleanup()
      // await cleanupOrphanedHotGeodata()
    })
  }
}
