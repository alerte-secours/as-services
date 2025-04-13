const async = require("async")
const { ctx } = require("@modjo/core")

// const { taskCtx } = require("@modjo/microservice-worker/ctx")
const tasks = require("~/tasks")

module.exports = async function () {
  return Object.assign(
    async function alertReopen(params) {
      const sql = ctx.require("postgres")
      const redis = ctx.require("redisHotGeodata")
      const { addTask } = ctx.require("amqp")
      // const logger = taskCtx.require("logger")

      const { alertId } = params

      const [alert] = await sql`
        SELECT
          "notify_around" as "notifyAround",
          "user_id" as "userId",
          "device_id" as "deviceId",
          ST_X (ST_TRANSFORM ("alert"."location"::geometry, 4674)) AS "longitude",
          ST_Y (ST_TRANSFORM ("alert"."location"::geometry, 4674)) AS "latitude"
        FROM
          "alert"
        WHERE
          "alert"."id" = ${alertId}
        `

      if (!alert) {
        return
      }

      const { notifyAround, longitude, latitude, userId, deviceId } = alert
      const coordinates = [longitude, latitude]

      await async.parallel([
        async () => {
          await sql`
            UPDATE
              "alert"
            SET
              "state" = 'open',
              "closed_at" = NULL,
              "closed_by" = NULL
            WHERE
              "id" = ${alertId}
            `
        },
        async () => {
          return redis.geoadd("alert", longitude, latitude, alertId)
        },
        async () =>
          notifyAround &&
          addTask(tasks.GEOCODE_ALERT, {
            alertId,
            userId,
            deviceId,
            coordinates,
          }),
      ])
    },
    {
      dedupOptions: { enabled: false },
    }
  )
}
