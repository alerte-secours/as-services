const async = require("async")
const { ctx } = require("@modjo/core")
const tasks = require("~/tasks")

module.exports = async function alertGeosync(params) {
  const { addTask } = ctx.require("amqp")
  const redis = ctx.require("redisHotGeodata")

  const {
    alertId,
    coordinates,
    userId,
    deviceId,
    notifyAround = false,
    notifyRelatives = false,
    isLast = false,
  } = params

  return async.parallel([
    async () => {
      if (coordinates && coordinates.length === 2) {
        const [longitude, latitude] = coordinates
        return redis.geoadd("alert", longitude, latitude, alertId)
      }
    },

    async () =>
      notifyAround &&
      userId &&
      deviceId &&
      addTask(tasks.GEOCODE_ALERT, {
        alertId,
        userId,
        deviceId,
        coordinates,
      }),

    async () =>
      notifyRelatives &&
      userId &&
      addTask(tasks.RELATIVE_ALERT, {
        alertId,
        userId,
      }),

    async () =>
      coordinates &&
      coordinates.length === 2 &&
      addTask(tasks.GEOCODE_ALERT_GUESS_ADDRESS, {
        alertId,
        coordinates,
        isLast,
      }),

    async () =>
      coordinates &&
      coordinates.length === 2 &&
      addTask(tasks.GEOCODE_ALERT_WHAT3WORDS, {
        alertId,
        coordinates,
        isLast,
      }),
  ])
}
