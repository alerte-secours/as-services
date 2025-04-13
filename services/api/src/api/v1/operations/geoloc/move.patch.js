// const httpError = require("http-errors")

const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")

const tasks = require("~/tasks")

/* deprecated since sync.post */

module.exports = function () {
  // const config = ctx.require("config")
  const sql = ctx.require("postgres")
  const { addTask } = ctx.require("amqp")

  // const {  } = config

  async function doGeolocMove(req) {
    const {
      device: {
        accuracy,
        altitude,
        altitudeAccuracy,
        heading,
        location,
        speed,
      },
    } = req.body

    const locationJSON = JSON.stringify(location)

    const session = reqCtx.get("session")

    const { deviceId } = session

    const { userId } = session

    const { coordinates } = location

    const [{ updatedAt }] = await sql`
      UPDATE
        "device"
      SET
        "accuracy" = ${accuracy},
        "altitude" = ${altitude},
        "altitude_accuracy" = ${altitudeAccuracy},
        "heading" = ${heading},
        "location" = ST_GeomFromGeoJSON (${locationJSON}),
        "speed" = ${speed}
      WHERE
        "id" = ${deviceId}
      RETURNING
        "updated_at"
      `.values()

    await addTask(tasks.GEOCODE_MOVE, { deviceId, userId, coordinates })

    return { updatedAt: new Date(updatedAt) }
  }

  return [doGeolocMove]
}
