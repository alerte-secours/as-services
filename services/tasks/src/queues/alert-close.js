const { ctx } = require("@modjo/core")

// const { taskCtx } = require("@modjo/microservice-worker/ctx")

module.exports = async function () {
  return Object.assign(
    async function alertClose(params) {
      const sql = ctx.require("postgres")
      const redis = ctx.require("redisHotGeodata")
      // const logger = taskCtx.require("logger")

      const { alertId, closedBy = null } = params

      const state = "closed"
      await sql`
        UPDATE
          "alert"
        SET
          "state" = ${state},
          "closed_at" = NOW(),
          "closed_by" = ${closedBy}
        WHERE
          "id" = ${alertId}
        `

      await redis.zrem("alert", alertId)
    },
    {
      dedupOptions: { enabled: false },
    }
  )
}
