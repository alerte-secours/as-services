const async = require("async")
const { ctx } = require("@modjo/core")

const { ALERT_DISTANCE_END } = require("~/geocode/config")

const MAX_PARALLEL_ALERT_PROCESS = 10

module.exports = async ({ coordinates, radiusReach, radiusAll, deviceId }) => {
  const alertList = {}
  const deferIntersectAlertDevice = []

  const sql = ctx.require("postgres")
  const redis = ctx.require("redisHotGeodata")
  const [longitude, latitude] = coordinates

  const [alertListForRadiusAll, alertListForRadiusReachMax] = await Promise.all(
    [
      redis.georadius("alert", longitude, latitude, radiusAll, "m", "WITHDIST"),
      redis.georadius(
        "alert",
        longitude,
        latitude,
        ALERT_DISTANCE_END,
        "m",
        "WITHDIST"
      ),
    ]
  )

  // console.log({ alertListForRadiusReachMax, longitude, latitude, radiusAll })

  // Create a Set of alertIds from radiusReachMax for quick lookup
  const reachMaxIds = new Set(alertListForRadiusReachMax.map(([id]) => id))

  // Filter alertListForRadiusAll to remove alerts that are in alertListForRadiusReachMax
  const uniqueRadiusAllAlerts = alertListForRadiusAll.filter(
    ([id]) => !reachMaxIds.has(id)
  )

  // Process both lists in parallel
  await async.parallel([
    // Process radiusAll alerts (simple notifyAround check)
    async () => {
      await async.parallelLimit(
        uniqueRadiusAllAlerts.map(([alertId, distance]) => async () => {
          const [alertRow] = await sql`
            SELECT
              "notify_around" AS "notifyAround"
            FROM
              "alert"
            WHERE
              "id" = ${alertId}
            `

          if (alertRow?.notifyAround) {
            alertList[alertId] = { distance }
          }
        }),
        MAX_PARALLEL_ALERT_PROCESS
      )
    },
    // Process radiusReachMax alerts (notifyAround and radius check)
    async () => {
      await async.parallelLimit(
        alertListForRadiusReachMax.map(([alertId, distance]) => async () => {
          const [alertRow] = await sql`
            SELECT
              "radius",
              "notify_around" AS "notifyAround"
            FROM
              "alert"
            WHERE
              "id" = ${alertId}
            `

          if (!alertRow?.notifyAround) {
            return
          }

          if (!alertRow?.radius) {
            // prevent race condition when radius is not already defined
            deferIntersectAlertDevice.push({
              alertId,
              deviceId,
              distance,
            })
            return
          }

          const distanceMax = Math.min(radiusReach, alertRow.radius)

          if (distance <= distanceMax) {
            alertList[alertId] = { distance }
          }
        }),
        MAX_PARALLEL_ALERT_PROCESS
      )
    },
  ])

  return [alertList, deferIntersectAlertDevice]
}
