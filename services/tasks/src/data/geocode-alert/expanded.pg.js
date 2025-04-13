const { ctx } = require("@modjo/core")

const {
  ALERT_DISTANCE_START,
  ALERT_DISTANCE_END,
  ALERT_DISTANCE_STEP,
} = require("~/geocode/config")

module.exports = async ({ coordinates }) => {
  const sql = ctx.require("postgres")
  const dataByDeviceId = {}

  const [longitude, latitude] = coordinates

  let deviceRadius = ALERT_DISTANCE_START
  do {
    // const elapsed = timeLogger({
    //   logger,
    //   label: `query for device radius ${deviceRadius}`,
    // })
    const geopoint = sql`ST_SetSRID (ST_MakePoint (${longitude}, ${latitude}), 4326)`
    const devices = await sql`
      SELECT DISTINCT
        "device"."id" AS "id",
        "device"."user_id" AS "userId",
        ST_X (ST_TRANSFORM ("device"."location"::geometry, 4674)) AS "longitude",
        ST_Y (ST_TRANSFORM ("device"."location"::geometry, 4674)) AS "latitude"
      FROM
        "device"
      WHERE
        "device"."radius_all" <= ${deviceRadius}
        AND ST_DWithin ("device"."location", ${geopoint}, ${deviceRadius})
      `

    // elapsed.end()
    for (const device of devices) {
      dataByDeviceId[device.id] = {
        longitude: device.longitude,
        latitude: device.latitude,
        userId: device.userId,
      }
    }
    deviceRadius += ALERT_DISTANCE_STEP
  } while (deviceRadius < ALERT_DISTANCE_END)
  return { dataByDeviceId }
}
