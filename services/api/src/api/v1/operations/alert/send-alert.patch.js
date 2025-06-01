const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")
const { nanoid } = require("nanoid")
// const natoUuid = require("utils/nato-alphabet/uuid")
const wordsUuid = require("utils/words-id/uuid")

const alertGeosync = require("common/services/alert-geosync")

module.exports = function () {
  const sql = ctx.require("postgres")

  // ;(async () => {
  //   for (const row of await sql`SELECT id,uuid FROM alert`) {
  //     // const code = natoUuid(row.uuid)
  //     const code = wordsUuid(row.uuid)
  //     await sql`UPDATE alert SET code = ${code} WHERE id = ${row.id}`
  //   }
  //   for (const row of await sql`SELECT id,access_code FROM alert`) {
  //     // const code = natoUuid(row.uuid)
  //     if (row.access_code) return
  //     await sql`UPDATE alert SET access_code = ${nanoid()} WHERE id = ${row.id}`
  //   }
  // })()

  async function doAlertSendAlert(req) {
    const {
      callEmergency,
      notifyAround,
      notifyRelatives,
      followLocation,
      level,
      subject,
      accuracy,
      altitude,
      altitudeAccuracy,
      heading,
      location,
      speed,
      uuid,
    } = req.body

    const locationJSON = JSON.stringify(location)

    const { deviceId, userId } = reqCtx.get("session")

    const { coordinates } = location

    const code = wordsUuid(uuid)
    const accessCode = nanoid()

    // the fake `do update` is there to make the `returning id` work in all cases
    let alertId
    await sql.begin(async () => {
      const [{ id }] = await sql`
        INSERT INTO "alert" ("uuid", "device_id", "user_id", "call_emergency", "notify_around", "notify_relatives", "follow_location", "level", "subject", "location", "initial_location", "accuracy", "altitude", "altitude_accuracy", "heading", "speed", "code", "access_code")
          VALUES (${uuid}, ${deviceId}, ${userId}, ${callEmergency}, ${notifyAround}, ${notifyRelatives}, ${followLocation}, ${level}, ${subject}, ST_GeomFromGeoJSON (${locationJSON}), ST_GeomFromGeoJSON (${locationJSON}), ${accuracy}, ${altitude}, ${altitudeAccuracy}, ${heading}, ${speed}, ${code}, ${accessCode})
        ON CONFLICT ("uuid")
          DO UPDATE SET
            "uuid" = EXCLUDED. "uuid"
          RETURNING
            id
        `
      alertId = id

      const reason = "self"
      await sql`
        INSERT INTO "alerting" ("alert_id", "user_id", "device_id", "initial_location", "reason")
          VALUES (${alertId}, ${userId}, ${deviceId}, ${sql`ST_GeomFromGeoJSON(${locationJSON})`}, ${reason})
        ON CONFLICT ("user_id", "alert_id")
          DO NOTHING
        `
    })

    await alertGeosync({
      alertId,
      coordinates,
      userId,
      deviceId,
      notifyAround,
      notifyRelatives,
      isLast: false,
    })

    return { alertId, accessCode, code }
  }

  return [doAlertSendAlert]
}
