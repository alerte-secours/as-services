const { ctx } = require("@modjo/core")
const { snakeCase } = require("lodash")
const pushNotification = require("./push-notification")

async function addNotification(params) {
  const logger = ctx.require("logger")
  const sql = ctx.require("postgres")

  logger.debug({ params }, "Starting addNotification process with params")

  const {
    fcmToken,
    deviceId,
    notification,
    data = {},
    userId,
    type,
    notificationMessage = null,
  } = params

  const enumType = snakeCase(type)

  logger.info({ deviceId, type }, "Starting addNotification process")

  // Store notification in the database
  try {
    logger.debug({ userId, type }, "Storing notification in database")
    const message = notificationMessage

    await sql`
      INSERT INTO "notification" ("user_id", "type", "message", "data")
        VALUES (${userId}, ${enumType}, ${message}, ${JSON.stringify(data)})
      `
    logger.info(
      { userId, type },
      "Successfully stored notification in database"
    )
  } catch (error) {
    logger.error(
      { userId, type, error },
      "Failed to store notification in database"
    )
    // Continue with push notification even if DB insert fails
  }

  // Send push notification
  try {
    logger.debug({ deviceId }, "Sending push notification")
    const result = await pushNotification({
      fcmToken,
      deviceId,
      notification,
      data,
    })
    logger.info({ result, deviceId }, "Push notification result")
    return result
  } catch (error) {
    logger.error({ deviceId, error }, "Failed to send push notification")
    throw error
  }
}

module.exports = addNotification
