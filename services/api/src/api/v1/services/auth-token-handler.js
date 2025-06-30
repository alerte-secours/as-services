const httpError = require("http-errors")
const jwtDecode = require("jwt-decode")
const { nanoid } = require("nanoid")

const { ctx } = require("@modjo/core")

module.exports = ({ services: { sortRolesByLevel, signJwt } }) => {
  const config = ctx.require("config.project")
  const sql = ctx.require("postgres")

  const { claimsNamespace, jwtExpirationInHours } = config

  async function validateAuthToken(authTokenJwt) {
    try {
      const { authToken } = jwtDecode(authTokenJwt)
      return authToken
    } catch (e) {
      throw httpError(400, "Invalid auth token JWT")
    }
  }

  async function getOrCreateUserSession(
    authToken,
    phoneModel = null,
    deviceUuid = null
  ) {
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
      throw httpError(410, "Auth token not found")
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
      if (!deviceId && deviceUuid) {
        // First check if a device with this UUID already exists for this user
        const existingDevice = await sql`
          SELECT
            id
          FROM
            "device"
          WHERE
            "user_id" = ${userId}
            AND "uuid" = ${deviceUuid}
          LIMIT 1
          `

        if (existingDevice.length > 0) {
          deviceId = existingDevice[0].id
        }
      }

      if (!deviceId) {
        // Only create new device if UUID doesn't exist
        ;[{ id: deviceId }] = await sql`
           INSERT INTO "device" ("user_id", "phone_model", "uuid")
             VALUES (${userId}, ${phoneModel}, ${deviceUuid})
           RETURNING
             id
           `
      }

      // Update the auth_token to reference this device
      await sql`
        UPDATE
          "auth_token"
        SET
          "device_id" = ${deviceId}
        WHERE
          "auth_token" = ${authToken}
        `

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

    return { userId, deviceId, roles }
  }

  async function generateUserJwt(userId, deviceId, roles) {
    const [defaultRole] = sortRolesByLevel(roles)

    const hasuraClaim = {}
    hasuraClaim["x-hasura-default-role"] = defaultRole
    hasuraClaim["x-hasura-allowed-roles"] = roles
    hasuraClaim["x-hasura-user-id"] = userId.toString()
    hasuraClaim["x-hasura-device-id"] = deviceId.toString()

    const exp = Math.round(
      new Date(Date.now() + jwtExpirationInHours * 3600000) / 1000
    )

    const jwtData = {
      [claimsNamespace]: hasuraClaim,
      exp,
    }

    return signJwt(jwtData)
  }

  return {
    validateAuthToken,
    getOrCreateUserSession,
    generateUserJwt,
  }
}
