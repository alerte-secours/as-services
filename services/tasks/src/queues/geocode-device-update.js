const { ctx } = require("@modjo/core")

module.exports = async function () {
  const redis = ctx.require("keydbColdGeodata")

  return Object.assign(
    async function geocodeDeviceUpdate(params) {
      const {
        deviceId,
        accuracy,
        altitude,
        altitudeAccuracy,
        heading,
        speed,
        coordinates,
      } = params

      const updatedAt = Math.floor(Date.now() / 1000)

      await redis.set(
        `device:geodata:${deviceId}`,
        JSON.stringify({
          coordinates,
          accuracy,
          altitude,
          altitudeAccuracy,
          heading,
          speed,
          updatedAt,
        })
      )
    },
    {
      dedupOptions: { enabled: false },
    }
  )
}
