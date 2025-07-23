module.exports = async function ({ services: { authTokenHandler } }) {
  async function doAuthLoginToken(req) {
    const {
      authTokenJwt,
      phoneModel = null,
      phoneOS = null,
      deviceUuid = null,
    } = req.body

    // Validate the auth token JWT and extract the auth token
    const authToken = authTokenHandler.decodeAuthToken(authTokenJwt)

    // Get or create user session (userId, deviceId, roles)
    const { userId, deviceId, roles } =
      await authTokenHandler.getOrCreateUserSession(
        authToken,
        phoneModel,
        phoneOS,
        deviceUuid
      )

    // Generate user JWT
    const userBearerJwt = await authTokenHandler.generateUserJwt(
      userId,
      deviceId,
      roles
    )

    return { userBearerJwt }
  }

  return [doAuthLoginToken]
}
