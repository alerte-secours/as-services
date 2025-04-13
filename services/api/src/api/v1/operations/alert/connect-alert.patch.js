const httpError = require("http-errors")
const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")

module.exports = function () {
  const sql = ctx.require("postgres")

  async function doAlertConnectAlert(req) {
    const { code, accessCode } = req.body

    const { deviceId, userId } = reqCtx.get("session")

    // the fake `do update` is there to make the `returning id` work in all cases
    let alertId
    const [alert] = await sql`
      SELECT
        "id",
        "access_code" as "accessCode"
      FROM
        "alert"
      WHERE
        "code" = ${code}
      `
    if (!alert?.id) {
      throw httpError(404, "alert not found")
    }
    if (accessCode !== alert.accessCode) {
      throw httpError(403, "invalid access code")
    }

    // the fake `do update` is there to make the `returning id` work in all cases
    const reason = "connect"
    const [{ id: alertingId }] = await sql`
      INSERT INTO "alerting" ("alert_id", "user_id", "device_id", "reason")
        VALUES (${alert.id}, ${userId}, ${deviceId}, ${reason})
      ON CONFLICT ("user_id", "alert_id")
        DO UPDATE SET
          "alert_id" = EXCLUDED. "alert_id"
        RETURNING
          id
      `

    return { alertId, alertingId }
  }

  return [doAlertConnectAlert]
}
