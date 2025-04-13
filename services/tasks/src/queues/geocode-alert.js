// const { getDistance } = require("geolib")

// const timeLogger = require("utils/debug/time-logger")

const { ctx } = require("@modjo/core")
const { taskCtx } = require("@modjo/microservice-worker/ctx")

const { ignoreForeignKeyViolation } = require("common/libs/pg/ignoreErrors")
// const getNearest = require("~/data/geocode-alert/nearest.pg")
const getNearest = require("~/data/geocode-alert/nearest.redis")
// const getExpanded = require("~/data/geocode-alert/expanded.pg")
const getExpanded = require("~/data/geocode-alert/expanded.redis")

module.exports = async function () {
  return Object.assign(
    async function geocodeAlert(params) {
      const logger = taskCtx.require("logger")
      logger.info({ params }, "queue handler geocodeAlert")

      const sql = ctx.require("postgres")

      const { coordinates } = params
      // const [longitude, latitude] = coordinates

      // reach minimum 10 persons then stop, increasing radius by 500m ending at 25km
      const nearestPromise = getNearest({ coordinates })

      // reach all expanded radius users
      const expandedPromise = getExpanded({ coordinates })

      const [nearestRes, expandedRes] = await Promise.all([
        nearestPromise,
        expandedPromise,
      ])

      const { alertRadius, dataByDeviceId: nearestDataByDeviceId } = nearestRes
      const { dataByDeviceId: expandedDataByDeviceId } = expandedRes

      const dataByDeviceId = {
        ...nearestDataByDeviceId,
        ...expandedDataByDeviceId,
      }

      // build pg insert query
      const { alertId } = params
      const insertObjects = Object.entries(dataByDeviceId).map(
        ([deviceId, device]) => {
          // pg implem
          // const initialDistance = getDistance(
          //   { latitude: device.latitude, longitude: device.longitude },
          //   { latitude, longitude }
          // )
          // redis implem
          const initialDistance = device.distance

          const locationJSON = JSON.stringify({
            type: "Point",
            coordinates: [device.longitude, device.latitude],
          })
          const initialLocation = sql`ST_GeomFromGeoJSON(${locationJSON})`

          return {
            alertId,
            userId: device.userId,
            deviceId,
            initialLocation,
            initialDistance,
            reason: "around",
            geomatchMethod: "alert",
          }
        }
      )

      await sql`
        UPDATE
          "alert"
        SET
          "radius" = ${alertRadius}
        WHERE
          "id" = ${alertId}
        `

      if (insertObjects.length > 0) {
        await ignoreForeignKeyViolation(sql`
          INSERT INTO "alerting" ${sql(insertObjects)}
          ON CONFLICT ("user_id", "alert_id")
            DO NOTHING
          `)
      }
    },
    {
      dedupOptions: { enabled: true },
    }
  )
}
