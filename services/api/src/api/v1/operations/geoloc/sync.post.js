const async = require("async")
const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")

const tasks = require("~/tasks")

module.exports = function () {
  const { addTask } = ctx.require("amqp")
  const redis = ctx.require("redisHotGeodata")

  async function addOneGeolocSync(req) {
    const logger = ctx.require("logger")
    const { location } = req.body
    const {
      coords: {
        accuracy,
        altitude,
        altitude_accuracy: altitudeAccuracy,
        heading,
        speed,
        latitude,
        longitude,
      },
    } = location
    // console.log("addOneGeolocSync", req.body)

    const session = reqCtx.get("session")

    const { deviceId } = session

    const { userId } = session

    logger.debug({ action: "geoloc-sync", userId, deviceId })

    const coordinates = [longitude, latitude]

    await async.parallel([
      async () => {
        const transaction = redis.multi()
        transaction.geoadd("device", longitude, latitude, deviceId)
        transaction.publish("deviceSet", deviceId)
        await transaction.exec()

        await addTask(tasks.GEOCODE_MOVE, { deviceId, userId, coordinates })
      },
      async () =>
        addTask(tasks.GEOCODE_DEVICE_UPDATE, {
          deviceId,
          accuracy,
          altitude,
          altitudeAccuracy,
          heading,
          speed,
          coordinates,
        }),
    ])

    return { ok: true }
  }

  return [addOneGeolocSync]
}
