const async = require("async")
const { ctx } = require("@modjo/core")
const { taskCtx } = require("@modjo/microservice-worker/ctx")

const humanizeDistance = require("utils/geo/humanizeDistance")
const addNotification = require("~/services/add-notification")
const {
  getAlertNotificationExpirationInSeconds,
  ALERT_NOTIFICATION_EXPIRATION_INTERVAL,
} = require("~/constants/time")
const {
  LEVEL_COLORS,
  LEVEL_DESCRIPTIONS,
} = require("~/constants/notifications")

const MAX_PARALLEL_PUSHES = 10

function createAlertNotification({
  code,
  reason,
  level,
  alertId,
  alertingId,
  initialDistance,
}) {
  const baseText =
    reason === "relative"
      ? "Un de vos proches a besoin d'aide"
      : "Besoin d'aide"
  const levelText = LEVEL_DESCRIPTIONS[level] || LEVEL_DESCRIPTIONS.green
  const distanceText = initialDistance
    ? ` à ${humanizeDistance(initialDistance)}`
    : ""
  const notificationText = `${baseText} - ${levelText}${distanceText}`
  const color = LEVEL_COLORS[level] || LEVEL_COLORS.green
  const expires = getAlertNotificationExpirationInSeconds()

  return {
    data: {
      action: "alert",
      alertingId,
      alertId,
      level,
      expires,
      code,
      initialDistance,
      reason,
    },
    notification: {
      title: `Nouvelle Alerte - #${code}`,
      body: notificationText,
      channel: "alert",
      icon: `notif-${level}`,
      priority: "high",
      ttl: ALERT_NOTIFICATION_EXPIRATION_INTERVAL,
      color,
      actionId: "open-alert",
    },
  }
}

const numericLevel = {
  green: 1,
  yellow: 2,
  red: 3,
}

module.exports = async function () {
  async function setNotificationSent(alertingId, state) {
    const sql = ctx.require("postgres")
    const logger = taskCtx.require("logger")

    logger.debug({ alertingId, state }, "Setting notification sent state")

    if (state === false) {
      logger.debug(
        { alertingId },
        "Updating alerting record to mark notification_sent as FALSE"
      )
      await sql`
        UPDATE
          "alerting"
        SET
          "notification_sent" = FALSE
        WHERE
          "id" = ${alertingId}
        `
    } else {
      logger.debug(
        { alertingId },
        "Updating alerting record to mark notification_sent as TRUE with current timestamp"
      )
      await sql`
        UPDATE
          "alerting"
        SET
          "notification_sent" = TRUE,
          "notification_sent_at" = NOW()
        WHERE
          "id" = ${alertingId}
        `
    }
    logger.debug({ alertingId }, "Successfully updated notification sent state")
  }

  return Object.assign(
    async function alertNotify(params) {
      const logger = taskCtx.require("logger")
      logger.info({ params }, "Starting alertNotify process")

      const sql = ctx.require("postgres")
      const { alertingId } = params

      logger.debug({ alertingId }, "Querying alerting record")
      const [alertingRow] = await sql`
        SELECT
          "alerting"."device_id" as "deviceId",
          "alerting"."alert_id" as "alertId",
          "alerting"."user_id" as "userId",
          "alerting"."reason" as "reason",
          "alerting"."initial_distance" as "initialDistance"
        FROM
          "alerting"
        WHERE
          "alerting"."id" = ${alertingId}
          AND "alerting"."notification_sent" IS NULL
        `

      if (!alertingRow) {
        logger.info({ alertingId }, "No alerting record found, exiting process")
        return
      }

      const { reason, alertId, userId: alertingUserId } = alertingRow
      logger.debug({ reason, alertId, alertingUserId }, "Found alerting record")

      const devices = []
      if (reason === "relative") {
        logger.debug({ alertingUserId }, "Querying device record for user")
        const devicesList = await sql`
          SELECT
            "id",
            "fcm_token" as "fcmToken",
            "notification_alert_level" as "notificationAlertLevel"
          FROM
            "device"
          WHERE
            "user_id" = ${alertingUserId}
            AND "fcm_token" IS NOT NULL
          `
        devices.push(...devicesList.map((device) => ({ ...device })))
      } else {
        const { deviceId } = alertingRow
        logger.debug({ deviceId }, "Querying device record")
        const [device] = await sql`
          SELECT
            "fcm_token" as "fcmToken",
            "notification_alert_level" as "notificationAlertLevel"
          FROM
            "device"
          WHERE
            "id" = ${deviceId}
            AND "fcm_token" IS NOT NULL
          `
        if (device) {
          devices.push({ id: deviceId, ...device })
        }
      }

      logger.debug({ alertId }, "Querying alert record")
      const [{ userId: alertUserId, level, code }] = await sql`
        SELECT
          "alert"."level" as "level",
          "alert"."user_id" as "userId",
          "alert"."code" as "code"
        FROM
          "alert"
        WHERE
          "alert"."id" = ${alertId}
        `

      let sentOnce = false

      await async.allLimit(devices, MAX_PARALLEL_PUSHES, async (device) => {
        const { id: deviceId, fcmToken } = device
        const notificationAlertLevel = device.notificationAlertLevel || "green"
        logger.debug(
          { deviceId, notificationAlertLevel },
          "Found device record"
        )

        if (alertUserId === alertingUserId) {
          logger.info(
            { alertUserId, alertingUserId },
            "Alert creator matches alerting user, skipping notification"
          )
          await setNotificationSent(alertingId, false)
          // user doesn't receive it's own alerts notifications
          // disable/comment return for dev/debug
          return
        }

        const acceptLevel =
          numericLevel[level] >= numericLevel[notificationAlertLevel]

        logger.debug(
          { level, notificationAlertLevel, acceptLevel },
          "Checking alert level threshold"
        )

        if (!acceptLevel) {
          logger.info(
            { level, notificationAlertLevel },
            "Alert level below device threshold, skipping notification"
          )
          await setNotificationSent(alertingId, false)
          return
        }

        try {
          logger.debug({ deviceId }, "Attempting to send push notification")
          const notificationConfig = createAlertNotification({
            code,
            reason,
            level,
            alertId,
            alertingId,
            initialDistance: alertingRow.initialDistance,
          })

          const { messageId, success } = await addNotification({
            fcmToken,
            deviceId,
            ...notificationConfig,
            userId: alertingUserId,
            type: "alert",
          })

          if (!success) {
            logger.error(
              { deviceId, alertingId },
              "Failed to send push notification"
            )
            return
          }
          logger.info(
            { messageId, alertingId },
            "Successfully sent push notification"
          )
          sentOnce = true
        } catch (e) {
          logger.error(
            { error: e, deviceId, alertingId },
            "Failed to send push notification"
          )
          console.error(e)
        }
      })

      logger.info(
        { alertingId, sentOnce },
        "Setting final notification sent state"
      )
      await setNotificationSent(alertingId, sentOnce)
    },
    {
      dedupOptions: { enabled: true },
    }
  )
}
