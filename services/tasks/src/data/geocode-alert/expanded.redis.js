const async = require("async")
const { ctx } = require("@modjo/core")

const {
  ALERT_DISTANCE_START,
  ALERT_DISTANCE_END,
  ALERT_DISTANCE_STEP,
} = require("~/geocode/config")

const MAX_PARALLEL_DEVICE_PROCESS = 10

module.exports = async ({ coordinates }) => {
  const redis = ctx.require("redisHotGeodata")
  const sql = ctx.require("postgres")
  const dataByDeviceId = {}

  const [longitude, latitude] = coordinates

  let deviceRadius = ALERT_DISTANCE_START
  do {
    // const elapsed = timeLogger({
    //   logger,
    //   label: `query for device radius ${deviceRadius}`,
    // })
    const devicesIdList = await redis.georadius(
      "device",
      longitude,
      latitude,
      deviceRadius,
      "m",
      "WITHDIST",
      "WITHCOORD"
    )

    await async.eachOfLimit(
      devicesIdList,
      MAX_PARALLEL_DEVICE_PROCESS,
      async ([deviceId, distance, [lon, lat]]) => {
        const [device] = await sql`
          SELECT
            "device"."user_id" AS "userId"
          FROM
            "device"
          WHERE
            "device"."id" = ${deviceId}
            AND "device"."radius_all" <= ${deviceRadius}
          `
        if (!device) {
          return
        }
        dataByDeviceId[deviceId] = {
          longitude: lon,
          latitude: lat,
          userId: device.userId,
          distance,
        }
      }
    )

    // elapsed.end()
    deviceRadius += ALERT_DISTANCE_STEP
  } while (deviceRadius < ALERT_DISTANCE_END)
  return { dataByDeviceId }
}
