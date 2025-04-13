const { ctx } = require("@modjo/core")

const {
  ALERT_DISTANCE_START,
  ALERT_DISTANCE_END,
  ALERT_DISTANCE_STEP,
  ALERT_REACH_PERSONS_MIN,
  DEVICE_RADIUS_REACH_DEFAULT,
} = require("~/geocode/config")

module.exports = async ({ coordinates }) => {
  const sql = ctx.require("postgres")
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

    const nearestDevices = await sql`
      SELECT DISTINCT
        "device"."id" AS "id",
        "device"."user_id" AS "userId",
        ST_X (ST_TRANSFORM ("device"."location"::geometry, 4674)) AS "longitude",
        ST_Y (ST_TRANSFORM ("device"."location"::geometry, 4674)) AS "latitude"
      FROM
        "device"
      WHERE
        COALESCE("device"."radius_reach", ${DEVICE_RADIUS_REACH_DEFAULT}) >= ${alertRadius}
        AND ST_DWithin (ST_SetSRID (ST_MakePoint (${longitude}, ${latitude}), 4326), "device"."location", ${alertRadius}, TRUE)
      `

    for (const device of nearestDevices) {
      dataByDeviceId[device.id] = {
        longitude: device.longitude,
        latitude: device.latitude,
        userId: device.userId,
      }
      userIdList.add(device.userId)
    }

    // elapsed.end()
    linkCounter = userIdList.size
    alertRadius += ALERT_DISTANCE_STEP
  } while (
    linkCounter < ALERT_REACH_PERSONS_MIN &&
    alertRadius < ALERT_DISTANCE_END
  )
  return { alertRadius, dataByDeviceId }
}
