const { ctx } = require("@modjo/core")

module.exports = async ({ coordinates, radiusReach, radiusAll }) => {
  const sql = ctx.require("postgres")
  const [longitude, latitude] = coordinates

  const geopoint = sql`ST_SetSRID (ST_MakePoint (${longitude}, ${latitude}), 4326)`

  const reachCrossing = sql`LEAST (${radiusReach}, "alert"."radius")`
  const allCrossing = sql`GREATEST (${radiusAll}, ${reachCrossing})`

  const alertIdList = await sql`
    SELECT
      "alert"."id"
    FROM
      "alert"
    WHERE
      ST_DWithin (${geopoint}, "alert"."location", ${allCrossing}, TRUE)
    `.values()
  return alertIdList
}
