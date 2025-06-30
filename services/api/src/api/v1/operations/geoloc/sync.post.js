const async = require("async")
const httpError = require("http-errors")
const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")

const tasks = require("~/tasks")

module.exports = function ({ services: { authTokenHandler } }) {
  const { addTask } = ctx.require("amqp")
  const redis = ctx.require("redisHotGeodata")

  async function addOneGeolocSync(req) {
    const logger = ctx.require("logger")
    const { location } = req.body
    const {
      coords: {
        accuracy,
        altitude,
        altitude_accuracy: altitudeAccuracy,
        heading,
        speed,
        latitude,
        longitude,
      },
    } = location

    const session = reqCtx.get("session")
    let userId
    let deviceId
    let userBearerJwt = null

    // Check if this is an auth token request (set by auth.js)
    if (session && session.isAuthTokenRequest) {
      // This is an auth token request, process it
      try {
        logger.debug("Processing auth token for geoloc sync")

        const { authToken } = session
        const {
          userId: newUserId,
          deviceId: newDeviceId,
          roles,
        } = await authTokenHandler.getOrCreateUserSession(
          authToken,
          req.body.phoneModel,
          req.body.deviceUuid
        )

        userId = newUserId
        deviceId = newDeviceId

        // Generate new user JWT for token refresh
        userBearerJwt = await authTokenHandler.generateUserJwt(
          userId,
          deviceId,
          roles
        )

        logger.debug({
          action: "geoloc-sync-auth-token",
          userId,
          deviceId,
          tokenRefreshed: true,
        })
      } catch (error) {
        logger.error({ error: error.message }, "Failed to process auth token")
        throw httpError(401, "Invalid auth token")
      }
    } else if (session && session.userId && session.deviceId) {
      // Regular user JWT session
      userId = session.userId
      deviceId = session.deviceId
      logger.debug({ action: "geoloc-sync-user-jwt", userId, deviceId })
    } else {
      // Invalid session
      logger.error({ session }, "Invalid session")
      throw httpError(401, "Invalid session")
    }

    if (!userId || !deviceId) {
      throw httpError(401, "Missing user or device information")
    }

    const coordinates = [longitude, latitude]

    await async.parallel([
      async () => {
        await redis.geoadd("device", longitude, latitude, deviceId)
        await addTask(tasks.GEOCODE_MOVE, { deviceId, userId, coordinates })
      },
      async () =>
        addTask(tasks.GEOCODE_DEVICE_UPDATE, {
          deviceId,
          accuracy,
          altitude,
          altitudeAccuracy,
          heading,
          speed,
          coordinates,
        }),
    ])

    const response = { ok: true }

    // Include userBearerJwt in response if token refresh occurred
    if (userBearerJwt) {
      response.userBearerJwt = userBearerJwt
    }

    return response
  }

  return [addOneGeolocSync]
}
