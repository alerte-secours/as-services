const { ctx } = require("@modjo/core")
const { taskCtx } = require("@modjo/microservice-worker/ctx")

const pushNotification = require("~/services/push-notification")

function createIosGeolocationHeartbeatSyncNotification() {
  return {
    data: {
      action: "geolocation-heartbeat-sync",
    },
    // Silent push notification
    notification: {
      silent: true,
    },
  }
}

module.exports = async function () {
  return Object.assign(
    async function iosGeolocationHeartbeatSync(params) {
      const logger = taskCtx.require("logger")
      const sql = ctx.require("postgres")
      const redisCold = ctx.require("keydbColdGeodata")

      const { deviceId } = params

      try {
        // Get the device information including phone_os and fcm_token
        const deviceResult = await sql`
          SELECT
            "user_id" as "userId",
            "phone_os" as "phoneOs",
            "fcm_token" as "fcmToken"
          FROM
            "device"
          WHERE
            id = ${deviceId}
          `

        if (!deviceResult || deviceResult.length === 0) {
          logger.warn(
            { deviceId },
            "No device found when sending iOS geolocation heartbeat sync"
          )
          return
        }

        const { userId, phoneOs, fcmToken } = deviceResult[0]

        // Only proceed if device is iOS
        if (phoneOs !== "ios") {
          logger.debug(
            { deviceId, phoneOs },
            "Skipping iOS heartbeat sync - device is not iOS"
          )
          return
        }

        if (!fcmToken) {
          logger.warn(
            { deviceId, userId },
            "No FCM token found for iOS device when sending heartbeat sync"
          )
          return
        }

        // Check if we've already sent a heartbeat sync for this device in the last 24h
        const heartbeatSentKey = `ios_heartbeat_sent:device:${deviceId}`
        const alreadySent = await redisCold.exists(heartbeatSentKey)

        if (alreadySent) {
          logger.debug(
            { deviceId, userId },
            "iOS heartbeat sync already sent for this device in the last 24h"
          )
          return
        }

        // Create silent notification config
        const notificationConfig =
          createIosGeolocationHeartbeatSyncNotification()

        // Send silent push notification
        logger.info(
          { deviceId, userId, notificationConfig },
          "Sending iOS silent push for geolocation heartbeat sync"
        )

        const { success } = await pushNotification({
          fcmToken,
          deviceId,
          notification: notificationConfig.notification,
          data: notificationConfig.data,
        })

        if (!success) {
          throw new Error(
            "Unable to send iOS geolocation heartbeat sync notification"
          )
        }

        // Mark as sent with 24h expiry to prevent duplicate sends
        await redisCold.set(heartbeatSentKey, "1", "EX", 24 * 60 * 60)

        logger.info(
          { deviceId, userId },
          "Successfully sent iOS geolocation heartbeat sync notification"
        )
      } catch (error) {
        logger.error(
          { deviceId, error },
          "Error sending iOS geolocation heartbeat sync notification"
        )
      }
    },
    {
      dedupOptions: { enabled: true },
    }
  )
}
