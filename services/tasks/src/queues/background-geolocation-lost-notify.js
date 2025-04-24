const { ctx } = require("@modjo/core")
const { taskCtx } = require("@modjo/microservice-worker/ctx")

const addNotification = require("~/services/add-notification")

function createBackgroundGeolocationLostNotification() {
  return {
    data: {
      action: "background_geolocation_lost",
    },
    notification: {
      title: "Localisation en arrière-plan désactivée",
      body: "Votre localisation en arrière-plan a été désactivée. Veuillez vérifier les paramètres de l'application.",
      channel: "system",
      priority: "high",
      actionId: "open-settings",
    },
  }
}

module.exports = async function () {
  return Object.assign(
    async function backgroundGeolocationLostNotify(params) {
      const logger = taskCtx.require("logger")
      const sql = ctx.require("postgres")

      const { deviceId } = params

      try {
        // Get the user ID associated with this device
        const userResult = await sql`
          SELECT
            "user_id" as "userId"
          FROM
            "device"
          WHERE
            id = ${deviceId}
          `

        if (!userResult || userResult.length === 0) {
          logger.warn(
            { deviceId },
            "No user found for device when sending background geolocation lost notification"
          )
          return
        }

        const { userId } = userResult[0]

        // Get the FCM token for this device
        const deviceResult = await sql`
          SELECT
            "fcm_token" as "fcmToken"
          FROM
            "device"
          WHERE
            id = ${deviceId}
          `

        if (!deviceResult[0]?.fcmToken) {
          logger.warn(
            { deviceId, userId },
            "No FCM token found for device when sending background geolocation lost notification"
          )
          return
        }

        const { fcmToken } = deviceResult[0]

        // Create notification config
        const notificationConfig = createBackgroundGeolocationLostNotification()

        // Send notification
        const { success } = await addNotification({
          fcmToken,
          deviceId,
          userId,
          type: "background_geolocation_lost",
          ...notificationConfig,
        })

        if (!success) {
          throw new Error(
            "Unable to send background geolocation lost notification"
          )
        }

        logger.info(
          { deviceId, userId },
          "Successfully sent background geolocation lost notification"
        )
      } catch (error) {
        logger.error(
          { deviceId, error },
          "Error sending background geolocation lost notification"
        )
      }
    },
    {
      dedupOptions: { enabled: true },
    }
  )
}
