const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")
const tasks = require("~/tasks")

module.exports = async function ({
  services: { middlewareRateLimiterIpUser },
}) {
  const sql = ctx.require("postgres")
  // const logger = ctx.require("logger")
  const { addTask } = ctx.require("amqp")

  async function sendConnectionEmail(req, res) {
    const { userId } = reqCtx.get("session")
    const { email } = req.body
    const [row] =
      await sql`SELECT "id" FROM "email" WHERE "email" = ${email} AND "verified"`
    const emailId = row?.id
    if (!emailId) {
      return res.status(404).send({ ok: false })
    }
    addTask(tasks.EMAIL_CONNECT, { emailId, userId })
    return { ok: true }
  }

  return [
    middlewareRateLimiterIpUser({
      points: 1, // allowed requests
      duration: 60, // per duration in seconds
    }),
    sendConnectionEmail,
  ]
}
