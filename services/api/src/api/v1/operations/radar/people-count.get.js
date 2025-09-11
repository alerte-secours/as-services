const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")

const RADAR_DISTANCE_KM = 25000 // 25km in meters

module.exports = function () {
  const redis = ctx.require("redisHotGeodata")

  async function doRadarPeopleCount(_req) {
    const { deviceId } = reqCtx.get("session")

    if (!deviceId) {
      throw new Error("No device found in session")
    }

    // Get current device location from Redis
    const devicePosition = await redis.geopos("device", deviceId)

    if (
      !devicePosition ||
      !devicePosition[0] ||
      devicePosition[0].length !== 2
    ) {
      throw new Error("Device location not available in Redis")
    }

    const [longitude, latitude] = devicePosition[0]

    // Use Redis GEORADIUS to get all devices within 25km
    const devicesData = await redis.georadius(
      "device",
      longitude,
      latitude,
      RADAR_DISTANCE_KM,
      "m",
      "WITHDIST"
    )
    const count = devicesData.filter(
      ([id]) => parseInt(id, 10) !== deviceId
    ).length

    return { count }
  }

  return [doRadarPeopleCount]
}
