const { ctx } = require("@modjo/core")

// const { taskCtx } = require("@modjo/microservice-worker/ctx")

module.exports = async function () {
  return Object.assign(
    async function alertKeepOpen(params) {
      const sql = ctx.require("postgres")
      // const logger = taskCtx.require("logger")

      const { alertId } = params

      // in case it were closed, re-open it, but not if it were archived

      await sql`
        UPDATE
          "alert"
        SET
          "keep_open_at" = NOW(),
          "state" = 'open',
          "closed_at" = NULL
        WHERE
          "id" = ${alertId}
          AND "state" != 'archived'
        `
    },
    {
      dedupOptions: { enabled: true },
    }
  )
}
