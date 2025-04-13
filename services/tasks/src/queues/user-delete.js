const { ctx } = require("@modjo/core")
// const { taskCtx } = require("@modjo/microservice-worker/ctx")

module.exports = async function () {
  return Object.assign(
    async function userDelete(params) {
      const { userId } = params

      // const logger = taskCtx.require("logger")
      const sql = ctx.require("postgres")

      await sql.begin(async () => {
        await sql`
          UPDATE
            "user"
          SET
            "deleted" = true
          WHERE
            "id" = ${userId}
          `
        await sql`DELETE FROM "alerted" WHERE "user_id" = ${userId}`
        await sql`DELETE FROM "alerting" WHERE "user_id" = ${userId}`
        await sql`DELETE FROM "auth_connect_email" WHERE "user_id" = ${userId}`
        await sql`DELETE FROM "device" WHERE "user_id" = ${userId}`
        await sql`DELETE FROM "email" WHERE "user_id" = ${userId}`
        await sql`DELETE FROM "phone_number" WHERE "user_id" = ${userId}`
        await sql`DELETE FROM "relative_invitation" WHERE "user_id" = ${userId}`
        await sql`DELETE FROM "relative" WHERE "user_id" = ${userId}`
        await sql`DELETE FROM "user_avatar" WHERE "user_id" = ${userId}`
        await sql`DELETE FROM "user_group_member" WHERE "user_id" = ${userId}`
        await sql`DELETE FROM "user_login_request" WHERE "user_id" = ${userId}`
      })
    },
    {
      dedupOptions: { enabled: true },
    }
  )
}
