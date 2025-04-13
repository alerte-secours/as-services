const httpError = require("http-errors")
const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")

const tasks = require("~/tasks")

module.exports = function () {
  const sql = ctx.require("postgres")
  const { addTask } = ctx.require("amqp")

  async function doAlertKeepOpen(req) {
    const { alertId } = req.body

    const { userId } = reqCtx.get("session")

    const [alert] = await sql`
      SELECT
        "id",
        "user_id" as "userId",
        "state"
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

    switch (alert.state) {
      case "archived": {
        throw httpError(406, "alert can't be keep open when archived")
        // break
      }
      default:
    }

    await addTask(tasks.ALERT_KEEP_OPEN, { alertId })

    return { ok: true }
  }

  return [doAlertKeepOpen]
}
