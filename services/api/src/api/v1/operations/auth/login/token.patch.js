const httpError = require("http-errors")
const jwtDecode = require("jwt-decode")
const { nanoid } = require("nanoid")

const { ctx } = require("@modjo/core")

module.exports = async function ({ services: { sortRolesByLevel, signJwt } }) {
  const config = ctx.require("config.project")
  const sql = ctx.require("postgres")

  const { claimsNamespace, jwtExpirationInHours } = config

  async function doAuthLoginToken(req) {
    const { authTokenJwt, phoneModel = null, deviceUuid = null } = req.body
    const { authToken } = jwtDecode(authTokenJwt)

    let userId
    let deviceId
    let roles

    try {
      const [row] = await sql`
        SELECT
          "user_id" as "userId",
          "device_id" as "deviceId"
        FROM
          "auth_token"
        WHERE
          "auth_token" = ${authToken}
        `
      userId = row.userId
      deviceId = row.deviceId
    } catch (e) {
      throw httpError(410)
    }
    if (!userId) {
      await sql.begin(async (sql) => {
        await sql`set constraints all deferred`
        ;[{ id: userId }] = await sql`
           INSERT INTO "user" DEFAULT
             VALUES
             RETURNING
               id
           `
        ;[{ id: deviceId }] = await sql`
           INSERT INTO "device" ("user_id", "phone_model", "uuid")
             VALUES (${userId}, ${phoneModel}, ${deviceUuid})
           RETURNING
             id
           `
        await sql`
          UPDATE
            "auth_token"
          SET
            "user_id" = ${userId},
            "device_id" = ${deviceId}
          WHERE
            "auth_token" = ${authToken}
          `

        const role = "user"
        await sql`
          INSERT INTO "user_role" ("user_id", "role")
            VALUES (${userId}, ${role})
          `
        roles = [role]

        const authSignKey = nanoid()
        await sql`
          INSERT INTO "auth_sign_key" ("user_id", "key")
            VALUES (${userId}, ${authSignKey})
          `
      })
    } else {
      if (!deviceId) {
        ;[{ id: deviceId }] = await sql`
           INSERT INTO "device" ("user_id", "phone_model", "uuid")
             VALUES (${userId}, ${phoneModel}, ${deviceUuid})
           RETURNING
             id
           `
      }

      roles = (
        await sql`
          SELECT
            "role"
          FROM
            "user_role"
          WHERE
            "user_id" = ${userId}
          `.values()
      ).map(([role]) => role)
    }

    if (roles.length === 0) {
      roles.push("user")
    }

    const [defaultRole] = sortRolesByLevel(roles)

    const hasuraClaim = {}
    hasuraClaim["x-hasura-default-role"] = defaultRole
    hasuraClaim["x-hasura-allowed-roles"] = roles
    hasuraClaim["x-hasura-user-id"] = userId.toString()
    hasuraClaim["x-hasura-device-id"] = deviceId.toString()

    const exp = Math.round(
      new Date(Date.now() + jwtExpirationInHours * 3600000) / 1000
    )
    // DEV
    // const exp = Math.round(new Date(Date.now() + 5000) / 1000)

    const jwtData = {
      [claimsNamespace]: hasuraClaim,
      exp,
    }

    const userBearerJwt = await signJwt(jwtData)
    return { userBearerJwt }
  }

  return [doAuthLoginToken]
}
