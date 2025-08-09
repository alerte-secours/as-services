const { ctx } = require("@modjo/core")
const { taskCtx } = require("@modjo/microservice-worker/ctx")

// const pushNotification = require("~/services/push-notification")
const addNotification = require("~/services/add-notification")
const { getAlertNotificationExpirationInSeconds } = require("~/constants/time")
const { LEVEL_COLORS } = require("~/constants/notifications")

function createSuggestKeepOpenNotification({ alertId, code, level }) {
  const color = LEVEL_COLORS[level] || LEVEL_COLORS.green
  const expires = getAlertNotificationExpirationInSeconds()

  return {
    data: {
      action: "suggest-keep-open",
      alertId,
      expires,
      code,
      level,
    },
    notification: {
      title: `Alerte bientôt expirée - #${code}`,
      body: "Votre alerte va bientôt expirer, gardez la ouverte si la situation n'est pas résolue",
      channel: "suggest-keep-open",
      icon: `notif-${level}`,
      priority: "high",
      ttl: expires,
      color,
      actionId: "open-alert",
    },
  }
}

module.exports = async function () {
  async function setSuggestKeepOpenSent(alertId, value) {
    const sql = ctx.require("postgres")
    await sql`
      UPDATE
        "alert"
      SET
        "suggest_keep_open_sent" = ${value}
      WHERE
        "id" = ${alertId}
      `
  }

  return Object.assign(
    async function alertSuggestKeepOpenNotify(params) {
      const logger = taskCtx.require("logger")
      const sql = ctx.require("postgres")

      // logger.debug(`alertSuggestKeepOpenNotify: ${JSON.stringify(params)}`)

      const { alertId } = params

      const [alert] = await sql`
        SELECT
          "alert"."device_id" as "deviceId",
          "alert"."code" as "code",
          "alert"."level" as "level"
        FROM
          "alert"
        WHERE
          "alert"."id" = ${alertId}
        `

      if (!alert) {
        return
      }

      const { deviceId } = alert

      const [{ fcmToken } = {}] = await sql`
        SELECT
          "device"."fcm_token" as "fcmToken"
        FROM
          "device"
        WHERE
          "device"."id" = ${deviceId}
        `

      if (!fcmToken) {
        setSuggestKeepOpenSent(alertId, false)
        return
      }

      try {
        const notificationConfig = createSuggestKeepOpenNotification({
          alertId,
          code: alert.code,
          level: alert.level,
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
          type: "suggest-keep-open",
        })

        if (!success) {
          throw new Error("Unable to send notification")
        }

        setSuggestKeepOpenSent(alertId, true)
      } catch (error) {
        logger.error(
          { error, alertId, deviceId },
          "unable to send suggest-keep-open notification"
        )
        setSuggestKeepOpenSent(alertId, false)
      }
    },
    {
      dedupOptions: { enabled: true },
    }
  )
}
