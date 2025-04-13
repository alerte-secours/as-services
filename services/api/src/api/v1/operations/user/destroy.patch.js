const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")
const httpError = require("http-errors")

const tasks = require("~/tasks")

module.exports = async function () {
  const sql = ctx.require("postgres")
  const { addTask } = ctx.require("amqp")
  async function doUserDestroy(_req) {
    const session = reqCtx.get("session")
    const { userId } = session
    const [user] = await sql`
      SELECT
        "id"
      FROM
        "user"
      WHERE
        "id" = ${userId}
        AND NOT "deleted"
      `
    if (!user) {
      throw httpError(404)
    }

    await addTask(tasks.USER_DELETE, { userId })

    return { ok: true }
  }

  return [doUserDestroy]
}
