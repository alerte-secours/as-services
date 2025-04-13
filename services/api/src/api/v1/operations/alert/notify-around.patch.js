const httpError = require("http-errors")
const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")

const tasks = require("~/tasks")

module.exports = function () {
  const sql = ctx.require("postgres")
  const { addTask } = ctx.require("amqp")

  async function doAlertNotifyAround(req) {
    const { alertId } = req.body

    const { userId } = reqCtx.get("session")

    const [alert] = await sql`
      SELECT
        "id",
        "user_id" as "userId",
        "device_id" as "deviceId",
        ST_X (ST_TRANSFORM ("alert"."location"::geometry, 4674)) AS "longitude",
        ST_Y (ST_TRANSFORM ("alert"."location"::geometry, 4674)) AS "latitude"
      FROM
        "alert"
      WHERE
        "id" = ${alertId}
      `
    if (!alert.id) {
      throw httpError(404, "alert not found")
    }
    if (alert.userId !== userId) {
      throw httpError(403, "alert not owned by you")
    }

    const { deviceId, longitude, latitude } = alert
    const coordinates = [longitude, latitude]

    await addTask(tasks.GEOCODE_ALERT, {
      alertId,
      userId,
      deviceId,
      coordinates,
    })

    await sql`
      UPDATE
        "alert"
      SET
        "notify_around" = TRUE
      WHERE
        "id" = ${alertId}
      `

    return { ok: true }
  }
  return [doAlertNotifyAround]
}
