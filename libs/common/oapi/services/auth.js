const { jwtVerify } = require("jose")
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
    const hasMetaAuthToken = scopes.includes("meta.auth-token")
    let jwtVerified = false

    try {
      if (!jwt) {
        return false
      }

      jwtVerified = await jwtVerify(jwt, JWKSet)
      if (!jwtVerified) {
        return false
      }
    } catch (err) {
      const logger = ctx.require("logger")

      // Allow expired JWT only if meta.auth-token scope is present
      if (hasMetaAuthToken && err.code === "ERR_JWT_EXPIRED") {
        logger.debug(
          { error: err },
          "Allowing expired JWT for meta.auth-token scope"
        )
        // Continue processing with expired JWT
      } else {
        logger.error({ error: err }, "jwVerify failed")
        return false
      }
    }

    // For meta.auth-token scope, check for X-Auth-Token header
    if (hasMetaAuthToken) {
      const req = reqCtx.get("req")
      console.log("req?.headers", req?.headers)
      const authTokenHeader = req?.headers?.["x-auth-token"]

      if (authTokenHeader) {
        // Create a session that indicates auth token processing is needed
        const session = { isAuthTokenRequest: true, authToken: authTokenHeader }
        reqCtx.set("session", session)
        return true
      }
    }

    // Regular user JWT processing
    const claims = getHasuraClaimsFromJWT(jwt, claimsNamespace)
    const session = sessionVarsFromClaims(claims)

    if (!isScopeAllowed(session, scopes)) {
      return false
    }
    reqCtx.set("session", session)
    return true
  }
}
