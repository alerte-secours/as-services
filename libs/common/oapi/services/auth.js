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

      // Allow expired JWT only if meta.exp-user scope is present
      if (hasMetaExpUser && err.code === "ERR_JWT_EXPIRED") {
        logger.debug(
          { error: err },
          "Allowing expired JWT for meta.exp-user scope"
        )
        // Continue processing with expired JWT
      } else {
        logger.error({ error: err }, "jwVerify failed")
        return false
      }
    }

    const claims = getHasuraClaimsFromJWT(jwt, claimsNamespace)
    const session = sessionVarsFromClaims(claims)

    // Add exp claim to session if meta.exp-user scope is present
    if (hasMetaExpUser) {
      try {
        const payload = jwtDecode(jwt)
        if (payload && payload.exp) {
          session.exp = payload.exp
        }
      } catch (err) {
        const logger = ctx.require("logger")
        logger.error({ error: err }, "Failed to decode JWT for exp claim")
      }
    }

    if (!isScopeAllowed(session, scopes)) {
      return false
    }
    reqCtx.set("session", session)
    return true
  }
}
