const { ctx } = require("@modjo/core")

// const { taskCtx } = require("@modjo/microservice-worker/ctx")

module.exports = async function () {
  // const config = ctx.require("config")

  return Object.assign(
    async function alertArchive(params) {
      const sql = ctx.require("postgres")
      const redis = ctx.require("redisHotGeodata")
      // const logger = taskCtx.require("logger")

      const { alertId } = params

      await sql`
        SELECT
          archive_alert (${alertId})
        `

      await redis.zrem("alert", alertId)
    },
    {
      dedupOptions: { enabled: true },
    }
  )
}
