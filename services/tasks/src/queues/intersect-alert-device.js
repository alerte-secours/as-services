// const { getDistance } = require("geolib")

// const timeLogger = require("utils/debug/time-logger")
const yaRetry = require("ya-retry")

const { ctx } = require("@modjo/core")
const { taskCtx } = require("@modjo/microservice-worker/ctx")

const { ignoreForeignKeyViolation } = require("common/libs/pg/ignoreErrors")

const { DEVICE_RADIUS_REACH_DEFAULT } = require("~/geocode/config")

module.exports = async function () {
  /*
  goal: avoid race condition between alert geocode event and device move geocode event,
  triggered when device move and alert in maximum area does not have a radius already defined
  */
  async function intersectAlertDevice(params) {
    const sql = ctx.require("postgres")

    const { deviceId, alertId, userId, distance, coordinates } = params

    const [alert] = await sql`
      SELECT
        "alert"."radius"
      FROM
        "alert"
      WHERE
        "id" = ${alertId}
      `

    if (alert) {
      // alert removed
      return
    }
    if (!alert.radius) {
      throw new Error("alert radius not defined")
    }

    const [device] = await sql`
      SELECT
        "device"."radius_reach"
      FROM
        "device"
      WHERE
        "device"."id" = ${deviceId}
      `
    if (!device) {
      // device removed
      return
    }
    let { radiusReach } = device
    if (!radiusReach) {
      radiusReach = DEVICE_RADIUS_REACH_DEFAULT
    }

    const distanceMax = Math.min(radiusReach, alert.radius)

    if (distance <= distanceMax) {
      const locationJSON = JSON.stringify({
        type: "Point",
        coordinates,
      })
      const initialLocation = sql`ST_GeomFromGeoJSON(${locationJSON})`
      const reason = "around"
      const geomatchMethod = "move-deferred"
      await ignoreForeignKeyViolation(sql`
        INSERT INTO "alerting" ("user_id", "alert_id", "device_id", "initial_location", "initial_distance", "reason", "geomatch_method")
          VALUES (${userId}, ${alertId}, ${deviceId}, ${initialLocation}, ${distance}, ${reason}, ${geomatchMethod})
        ON CONFLICT ("user_id", "alert_id")
          DO NOTHING
        `)
    }
  }
  return Object.assign(
    async function intersectAlertDeviceWithRetry(params) {
      const logger = taskCtx.require("logger")
      logger.info("queue hanlder intersectAlertDevice", params)

      await yaRetry(
        async (_bail) => {
          return intersectAlertDevice(params)
        },
        {
          retries: 10,
          minTimeout: 2000,
        }
      )
    },
    {
      dedupOptions: { enabled: true },
    }
  )
}
