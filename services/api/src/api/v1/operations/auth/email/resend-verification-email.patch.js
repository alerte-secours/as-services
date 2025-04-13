const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")
const tasks = require("~/tasks")

module.exports = async function ({
  services: { middlewareRateLimiterIpUser },
}) {
  const sql = ctx.require("postgres")
  // const logger = ctx.require("logger")
  const { addTask } = ctx.require("amqp")

  async function resendVerificationEmail(req) {
    const { email } = req.body
    const { userId } = reqCtx.get("session")
    const [row] =
      await sql`SELECT "id" FROM "email" WHERE "user_id" = ${userId} AND "email" = ${email}`
    const emailId = row?.id
    if (!emailId) {
      return { ok: false }
    }
    addTask(tasks.EMAIL_VERIFY, { emailId })
    return { ok: true }
  }

  return [
    middlewareRateLimiterIpUser({
      points: 1, // allowed requests
      duration: 60, // per duration in seconds
    }),
    resendVerificationEmail,
  ]
}
