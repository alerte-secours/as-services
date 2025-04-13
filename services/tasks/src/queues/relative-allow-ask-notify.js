const async = require("async")
const { ctx } = require("@modjo/core")
const { taskCtx } = require("@modjo/microservice-worker/ctx")

const { normalizeNumber } = require("utils/phone")
// const pushNotification = require("~/services/push-notification")
const addNotification = require("~/services/add-notification")

function createRelativeAllowAskNotification({ relativeId, phoneNumber }) {
  return {
    data: {
      action: "relative-allow-ask",
      phoneNumber,
      relativeId,
    },
    notification: {
      title: "Autoriser contact d'urgence",
      body: `${phoneNumber} souhaite que vous soyez son contact d'urgence`,
      channel: "relative-allow-ask",
      icon: "notif-relative.png",
      priority: "high",
      actionId: "open-relatives",
    },
  }
}

module.exports = async function () {
  async function setAskNotificationSent({ relativeAllowId, value }) {
    const sql = ctx.require("postgres")
    await sql`
      UPDATE
        "relative_allow"
      SET
        "ask_notification_sent" = ${value}
      WHERE
        "id" = ${relativeAllowId}
      `
  }

  return Object.assign(
    async function relativeAllowAskNotify(params) {
      const logger = taskCtx.require("logger")
      const sql = ctx.require("postgres")

      const { relativeAllowId } = params

      const rows = await sql`
        SELECT
          "device"."id" as "deviceId",
          "device"."fcm_token" as "fcmToken",
          "relative"."id" as "relativeId",
          "phone_number"."number" as "phoneNumber",
          "phone_number"."country" as "phoneCountry"
        FROM
          "relative_allow"
          JOIN "relative" ON "relative_allow"."relative_id" = "relative"."id"
          JOIN "device" ON "relative"."to_user_id" = "device"."user_id"
          JOIN "user_phone_number_relative" ON "user_phone_number_relative"."user_id" = "relative"."user_id"
          JOIN "phone_number" ON "user_phone_number_relative"."phone_number_id" = "phone_number"."id"
        WHERE
          "relative_allow"."id" = ${relativeAllowId}
          AND "device"."fcm_token" IS NOT NULL
        `

      const sent = await async.some(rows, async (row) => {
        const { deviceId, relativeId, fcmToken, phoneNumber, phoneCountry } =
          row

        const fullPhoneNumber = normalizeNumber(phoneNumber, phoneCountry)

        try {
          const notificationConfig = createRelativeAllowAskNotification({
            relativeId,
            phoneNumber: fullPhoneNumber,
          })

          // Extract user ID for the device
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
            type: "relative-allow-ask",
          })
          if (!success) {
            throw new Error("unable to send relative-allow-ask notification")
          }
          return true
        } catch (error) {
          logger.error(
            { error, deviceId, relativeId },
            "unable to send relative-allow-ask notification"
          )
          return false
        }
      })

      await setAskNotificationSent({ relativeAllowId, value: sent })
    },
    {
      dedupOptions: { enabled: false },
    }
  )
}
