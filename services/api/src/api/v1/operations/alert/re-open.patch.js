const httpError = require("http-errors")
const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")

module.exports = function () {
  const sql = ctx.require("postgres")

  async function doAlertReOpen(req) {
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
        throw httpError(406, "alert can't be re-opened when archived")
        // break
      }
      case "open": {
        throw httpError(204, "already open")
        // break
      }
      default:
      case "close": {
        break
      }
    }

    await sql`
      UPDATE
        "alert"
      SET
        "state" = 'open',
        "closed_at" = NULL
      WHERE
        "id" = ${alertId}
      `

    return { ok: true }
  }

  return [doAlertReOpen]
}
