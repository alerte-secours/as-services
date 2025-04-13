const async = require("async")
// const timeLogger = require("utils/debug/time-logger")
const { ctx } = require("@modjo/core")
// const { taskCtx } = require("@modjo/microservice-worker/ctx")

const { ignoreForeignKeyViolation } = require("common/libs/pg/ignoreErrors")
const {
  DEVICE_RADIUS_ALL_DEFAULT,
  DEVICE_RADIUS_REACH_DEFAULT,
} = require("~/geocode/config")

const { INTERSECT_ALERT_DEVICE } = require("~/tasks")

const alertsAround = require("~/data/geocode-move/alerts-around.redis")

const MAX_PARALLEL_INTERSECT_ALERT_DEVICE = 10

module.exports = async function () {
  return Object.assign(
    async function geocodeMove(params) {
      // const logger = taskCtx.require("logger")

      const sql = ctx.require("postgres")
      const { addTask } = ctx.require("amqp")

      const { deviceId, userId, coordinates } = params

      const [device] = await sql`
        SELECT
          "device"."radius_all",
          "device"."radius_reach"
        FROM
          "device"
        WHERE
          "device"."id" = ${deviceId}
        `

      if (!device) {
        // device deleted
        return
      }

      let { radiusReach, radiusAll } = device

      if (!radiusAll) {
        radiusAll = DEVICE_RADIUS_ALL_DEFAULT
      }
      if (!radiusReach) {
        radiusReach = DEVICE_RADIUS_REACH_DEFAULT
      }

      // const elapsed = timeLogger({
      //   logger,
      //   label: `query for alerts lookups GREATEST (${radiusAll}, LEAST (${radiusReach}, "alert"."radius"))`,
      // })

      const [alertList, deferIntersectAlertDevice] = await alertsAround({
        coordinates,
        radiusReach,
        radiusAll,
        deviceId,
      })

      await async.parallel([
        async () => {
          const insertRows = Object.entries(alertList).map(
            ([alertId, { distance }]) => {
              const locationJSON = JSON.stringify({
                type: "Point",
                coordinates,
              })
              const initialLocation = sql`ST_GeomFromGeoJSON(${locationJSON})`
              return {
                userId,
                alertId,
                deviceId,
                initialDistance: distance,
                initialLocation,
                reason: "around",
                geomatchMethod: "move",
              }
            }
          )

          if (insertRows.length === 0) {
            return
          }
          await ignoreForeignKeyViolation(sql`
            INSERT INTO "alerting" ${sql(insertRows)}
            ON CONFLICT ("user_id", "alert_id")
              DO NOTHING
            `)
        },
        async () =>
          async.eachOfLimit(
            deferIntersectAlertDevice,
            MAX_PARALLEL_INTERSECT_ALERT_DEVICE,
            async (data) =>
              addTask(INTERSECT_ALERT_DEVICE, { ...data, userId, coordinates })
          ),
      ])

      // elapsed.end()
    },
    {
      dedupOptions: { enabled: true },
    }
  )
}
