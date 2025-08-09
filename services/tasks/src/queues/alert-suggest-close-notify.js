const { ctx } = require("@modjo/core")
const { taskCtx } = require("@modjo/microservice-worker/ctx")

// const pushNotification = require("~/services/push-notification")
const addNotification = require("~/services/add-notification")
const { getAlertNotificationExpirationInSeconds } = require("~/constants/time")
const { LEVEL_COLORS } = require("~/constants/notifications")

function createSuggestCloseNotification({ code, level, alertId }) {
  const color = LEVEL_COLORS[level] || LEVEL_COLORS.green
  const expires = getAlertNotificationExpirationInSeconds()

  return {
    data: {
      action: "suggest-close",
      alertId,
      expires,
      code,
      level,
    },
    notification: {
      title: `Alerte toujours en cours - #${code}`,
      body: "Votre alerte est toujours ouverte, pensez à la terminer si la situation est résolue",
      channel: "suggest-close",
      icon: `notif-${level}`,
      priority: "high",
      ttl: expires,
      color,
      actionId: "open-alert",
    },
  }
}

module.exports = async function () {
  return Object.assign(
    async function alertSuggestCloseNotify(params) {
      const logger = taskCtx.require("logger")
      const sql = ctx.require("postgres")
      // logger.debug(`alertSuggestCloseNotify: ${JSON.stringify(params)}`)

      const { alertId } = params

      const [{ deviceId, code, level }] = await sql`
        SELECT
          "alert"."device_id" as "deviceId",
          "alert"."code" as "code",
          "alert"."level" as "level"
        FROM
          "alert"
        WHERE
          "alert"."id" = ${alertId}
        `

      const [{ fcmToken } = {}] = await sql`
        SELECT
          "device"."fcm_token" as "fcmToken"
        FROM
          "device"
        WHERE
          "device"."id" = ${deviceId}
        `

      if (!fcmToken) {
        await sql`
          UPDATE
            "alert"
          SET
            "suggest_close_sent" = FALSE
          WHERE
            "id" = ${alertId}
          `
        return
      }

      try {
        const notificationConfig = createSuggestCloseNotification({
          code,
          level,
          alertId,
        })

        // Get the userId for the device
        const [userInfo] = await sql`
          SELECT
            "user_id" as "userId"
          FROM
            "device"
          WHERE
            "id" = ${deviceId}
          `

        const { success } = await addNotification({
          fcmToken,
          deviceId,
          ...notificationConfig,
          userId: userInfo.userId,
          type: "suggest-close",
        })

        if (!success) {
          throw new Error("unable to send suggest-close notification")
        }

        await sql`
          UPDATE
            "alert"
          SET
            "suggest_close_sent" = TRUE
          WHERE
            "id" = ${alertId}
          `
      } catch (error) {
        logger.error(
          { error, alertId, deviceId },
          "unable to send suggest-close notification"
        )
        await sql`
          UPDATE
            "alert"
          SET
            "suggest_close_sent" = FALSE
          WHERE
            "id" = ${alertId}
          `
      }
    },
    {
      dedupOptions: { enabled: true },
    }
  )
}
