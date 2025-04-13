const httpError = require("http-errors")
const { nanoid } = require("nanoid")
const { ctx } = require("@modjo/core")

module.exports = async function ({ services: { signJwt } }) {
  const sql = ctx.require("postgres")

  async function deleteLoginRequest(id) {
    await sql`
      DELETE FROM "user_login_request"
      WHERE id = ${id}
      `
  }

  async function doAuthLoginConfimLoginRequest(req) {
    const { loginRequestId, deviceUuid } = req.body

    const [userLoginRequest] = await sql`
      SELECT
        "user_id" as "userId",
        "type",
        "phone_number_id" as "phoneNumberId",
        "email_id" as "emailId",
        "updated_at" as "updatedAt"
      FROM
        "user_login_request"
      WHERE
        "id" = ${loginRequestId}
      `
    if (!userLoginRequest) {
      throw httpError(404)
    }
    const { type, updatedAt } = userLoginRequest

    const expire = new Date()
    expire.setTime(expire.getTime() - 2 * 3600000) // 2 hours

    if (updatedAt < expire) {
      deleteLoginRequest(loginRequestId) // cleanup in background
      throw httpError(498, "login request expired")
    }

    let userId
    switch (type) {
      case "phone_number": {
        const [phoneNumber] = await sql`
          SELECT
            "user_id" as "userId"
          FROM
            "phone_number"
          WHERE
            "id" = ${userLoginRequest.phoneNumberId}
          `
        userId = phoneNumber.userId
        break
      }
      case "email": {
        const [email] = await sql`
          SELECT
            "user_id" as "userId"
          FROM
            "email"
          WHERE
            "id" = ${userLoginRequest.emailId}
          `
        userId = email.userId
        break
      }
      default: {
        throw httpError(400)
      }
    }

    deleteLoginRequest(loginRequestId) // cleanup in background

    let deviceId = null
    if (deviceUuid) {
      const [matchDevice] = await sql`
        SELECT
          "id"
        FROM
          "device"
        WHERE
          "user_id" = ${userId}
          AND "uuid" = ${deviceUuid}
        `

      if (matchDevice) {
        deviceId = matchDevice.id
      }
    }

    const plainAuthToken = nanoid()
    await sql`
      INSERT INTO "auth_token" ("auth_token", "user_id", "device_id")
        VALUES (${plainAuthToken}, ${userId}, ${deviceId})
      ON CONFLICT ("device_id")
        DO UPDATE SET
          "auth_token" = ${plainAuthToken}, "user_id" = ${userId}
      `

    const authTokenJwt = await signJwt({ authToken: plainAuthToken })

    return { authTokenJwt }
  }

  return [doAuthLoginConfimLoginRequest]
}
