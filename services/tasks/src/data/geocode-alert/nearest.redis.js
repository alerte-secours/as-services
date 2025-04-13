const async = require("async")
const { ctx } = require("@modjo/core")

const {
  ALERT_DISTANCE_START,
  ALERT_DISTANCE_END,
  ALERT_DISTANCE_STEP,
  ALERT_REACH_PERSONS_MIN,
  DEVICE_RADIUS_REACH_DEFAULT,
} = require("~/geocode/config")

const MAX_PARALLEL_DEVICE_PROCESS = 10

module.exports = async ({ coordinates }) => {
  const sql = ctx.require("postgres")
  const redis = ctx.require("redisHotGeodata")
  const dataByDeviceId = {}

  const [longitude, latitude] = coordinates

  let alertRadius = ALERT_DISTANCE_START
  let linkCounter
  const userIdList = new Set()
  do {
    // const elapsed = timeLogger({
    //   logger,
    //   label: `query for alert radius ${alertRadius}`,
    // })

    const devicesIdList = await redis.georadius(
      "device",
      longitude,
      latitude,
      alertRadius,
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
            AND COALESCE("device"."radius_reach", ${DEVICE_RADIUS_REACH_DEFAULT}) >= ${alertRadius}
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
        userIdList.add(device.userId)
      }
    )

    // elapsed.end()
    linkCounter = userIdList.size
    alertRadius += ALERT_DISTANCE_STEP
  } while (
    linkCounter < ALERT_REACH_PERSONS_MIN &&
    alertRadius < ALERT_DISTANCE_END
  )
  return { alertRadius, dataByDeviceId }
}
