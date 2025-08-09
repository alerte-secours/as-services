const { ctx } = require("@modjo/core")
// const { taskCtx } = require("@modjo/microservice-worker/ctx")
// const pushNotification = require("~/services/push-notification")
const addNotification = require("~/services/add-notification")
const { getAlertNotificationExpirationInSeconds } = require("~/constants/time")

function createEmergencyInfoNotification({
  alertId,
  // code,
  level,
  what3words,
  address,
  nearestPlace,
}) {
  const locationParts = []
  if (what3words) {
    locationParts.push(`Localisation en 3 mots: ${what3words}`)
  }
  if (address) {
    locationParts.push(`Adresse: ${address}`)
  }
  if (nearestPlace) {
    locationParts.push(`À proximité de: ${nearestPlace}`)
  }

  const notificationText = locationParts.join(".\n")
  const expires = getAlertNotificationExpirationInSeconds()

  return {
    data: {
      action: "alert-infos",
      alertId,
      expires,
      what3words,
      address,
      nearestPlace,
    },
    notification: {
      title: "Infos de localisation pour les secours",
      body: notificationText,
      channel: "alert-infos",
      icon: `notif-${level}`,
      priority: "high",
      ttl: expires,
      actionId: "open-alert",
    },
  }
}

module.exports = async function () {
  async function setNotificationSent(alertId, state) {
    const sql = ctx.require("postgres")
    if (state === false) {
      await sql`
        UPDATE
          "alert"
        SET
          "emergency_calling_notification_sent" = FALSE
        WHERE
          "id" = ${alertId}
        `
    } else {
      await sql`
        UPDATE
          "alert"
        SET
          "emergency_calling_notification_sent" = TRUE
        WHERE
          "id" = ${alertId}
        `
    }
  }

  return Object.assign(
    async function alertCallEmergencyInfoNotify(params) {
      // const logger = taskCtx.require("logger")
      // logger.debug(`alertNotify: ${JSON.stringify(params)}`)

      const sql = ctx.require("postgres")

      const { alertId } = params

      const [alert] = await sql`
        SELECT
          "device_id" as "deviceId",
          "code" as "code",
          "level" as "level",
          "what3words" as "what3words",
          "address" as "address",
          "nearest_place" as "nearestPlace"
        FROM
          "alert"
        WHERE
          "id" = ${alertId}
        `
      if (!alert) {
        return
      }

      const { deviceId } = alert

      const [device] = await sql`
        SELECT
          "fcm_token" as "fcmToken"
        FROM
          "device"
        WHERE
          "id" = ${deviceId}
        `

      if (!device?.fcmToken) {
        await setNotificationSent(alertId, false)
        return
      }

      const { fcmToken } = device

      try {
        const notificationConfig = createEmergencyInfoNotification({
          alertId,
          code: alert.code,
          level: alert.level,
          what3words: alert.what3words,
          address: alert.address,
          nearestPlace: alert.nearestPlace,
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
          type: "alert-emergency-info",
        })
        await setNotificationSent(alertId, success)
      } catch (e) {
        console.error(e)
        await setNotificationSent(alertId, false)
      }
    },
    {
      dedupOptions: { enabled: true },
    }
  )
}
