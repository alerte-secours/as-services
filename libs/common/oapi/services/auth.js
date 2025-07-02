const { jwtVerify } = require("jose")
const jwtDecode = require("jwt-decode")
const getHasuraClaimsFromJWT = require("@modjo/hasura/utils/jwt/get-hasura-claims-from-jwt")
const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")

module.exports = function () {
  const castIntVars = ["deviceId", "userId"]
  function sessionVarsFromClaims(claims) {
    const session = { ...claims }
    for (const castIntVar of castIntVars) {
      session[castIntVar] = parseInt(session[castIntVar], 10)
    }
    return session
  }

  const config = ctx.require("config.project")
  const { claimsNamespace, JWKSet } = config

  function isScopeAllowed(session, scopes) {
    const { allowedRoles } = session
    return scopes
      .filter((scope) => !scope.startsWith("meta."))
      .some((scope) => {
        return allowedRoles.includes(scope)
      })
  }

  return async function auth(jwt, scopes) {
    const hasMetaExpUser = scopes.includes("meta.exp-user")
    let jwtVerified = false
    const logger = ctx.require("logger")

    logger.debug({ scopes, hasMetaExpUser }, "Starting authentication")

    try {
      if (!jwt) {
        logger.warn("No JWT provided for authentication")
        return false
      }

      logger.debug("JWT provided, attempting verification")

      jwtVerified = await jwtVerify(jwt, JWKSet)
      if (!jwtVerified) {
        logger.warn("JWT verification failed")
        return false
      }

      logger.debug("JWT verification successful")
    } catch (err) {
      // Allow expired JWT only if meta.exp-user scope is present
      if (hasMetaExpUser && err.code === "ERR_JWT_EXPIRED") {
        logger.debug(
          { error: err },
          "Allowing expired JWT for meta.exp-user scope"
        )
        // Continue processing with expired JWT
      } else {
        logger.error({ error: err }, "JWT verification failed")
        return false
      }
    }

    logger.debug("Extracting claims from JWT")
    const claims = getHasuraClaimsFromJWT(jwt, claimsNamespace)
    const session = sessionVarsFromClaims(claims)

    logger.debug(
      { userId: session.userId, deviceId: session.deviceId },
      "Session variables extracted from claims"
    )

    // Add exp claim to session if meta.exp-user scope is present
    if (hasMetaExpUser) {
      logger.debug("Adding exp claim for meta.exp-user scope")
      try {
        const payload = jwtDecode(jwt)
        if (payload && payload.exp) {
          session.exp = payload.exp
          logger.debug({ exp: session.exp }, "Exp claim added to session")
        } else {
          logger.debug("No exp claim found in JWT payload")
        }
      } catch (err) {
        logger.error({ error: err }, "Failed to decode JWT for exp claim")
      }
    }

    logger.debug(
      { allowedRoles: session.allowedRoles, requestedScopes: scopes },
      "Checking scope authorization"
    )

    if (!isScopeAllowed(session, scopes)) {
      logger.warn(
        { allowedRoles: session.allowedRoles, requestedScopes: scopes },
        "Scope authorization failed"
      )
      return false
    }

    logger.info("Authentication successful")
    logger.debug(
      {
        userId: session.userId,
        deviceId: session.deviceId,
        allowedRoles: session.allowedRoles,
      },
      "Setting session context"
    )

    reqCtx.set("session", session)
    return true
  }
}
