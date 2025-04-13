const async = require("async")
const { ctx } = require("@modjo/core")
const { taskCtx } = require("@modjo/microservice-worker/ctx")

const { normalizeNumber } = require("utils/phone")
// const pushNotification = require("~/services/push-notification")
const addNotification = require("~/services/add-notification")

function createRelativeInvitationNotification({
  relativeInvitationId,
  phoneNumber,
}) {
  return {
    data: {
      action: "relative-invitation",
      relativeInvitationId,
      phoneNumber,
    },
    notification: {
      title: "Accepter contact d'urgence",
      body: `${phoneNumber} vous propose d'être votre contact d'urgence`,
      channel: "relative-invitation",
      icon: "notif-relative.png",
      priority: "high",
      actionId: "open-relatives",
    },
  }
}

module.exports = async function () {
  async function setNotificationSent({ relativeInvitationId, value }) {
    const sql = ctx.require("postgres")
    await sql`
      UPDATE
        "relative_invitation"
      SET
        "notification_sent" = ${value}
      WHERE
        "id" = ${relativeInvitationId}
      `
  }

  return Object.assign(
    async function relativeInvitationAskNotify(params) {
      const logger = taskCtx.require("logger")
      const sql = ctx.require("postgres")

      const { relativeInvitationId } = params

      const rows = await sql`
        SELECT
          "device"."id" as "deviceId",
          "device"."fcm_token" as "fcmToken",
          "phone_number"."number" as "phoneNumber",
          "phone_number"."country" as "phoneCountry"
        FROM
          "relative_invitation"
          JOIN "device" ON "relative_invitation"."to_user_id" = "device"."user_id"
          JOIN "user_phone_number_relative" ON "user_phone_number_relative"."user_id" = "relative_invitation"."user_id"
          JOIN "phone_number" ON "user_phone_number_relative"."phone_number_id" = "phone_number"."id"
        WHERE
          "relative_invitation"."id" = ${relativeInvitationId}
          AND "device"."fcm_token" IS NOT NULL
        `

      const sent = await async.some(rows, async (row) => {
        const { deviceId, fcmToken, phoneNumber, phoneCountry } = row

        const fullPhoneNumber = normalizeNumber(phoneNumber, phoneCountry)

        try {
          const notificationConfig = createRelativeInvitationNotification({
            relativeInvitationId,
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
            type: "relative-invitation",
          })
          if (!success) {
            throw new Error("unable to send relative-invitation notification")
          }
          return true
        } catch (error) {
          logger.error(
            { error, deviceId, relativeInvitationId },
            "unable to send relative-invitation notification"
          )
          return false
        }
      })

      await setNotificationSent({ relativeInvitationId, value: sent })
    },
    {
      dedupOptions: { enabled: false },
    }
  )
}
