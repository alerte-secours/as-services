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
    return scopes.some((scope) => allowedRoles.includes(scope))
  }

  return async function auth(jwt, scopes) {
    try {
      if (!jwt || !(await jwtVerify(jwt, JWKSet))) {
        return false
      }
    } catch (err) {
      const logger = ctx.require("logger")
      logger.error({ error: err }, "jwVerify failed")
      return false
    }

    const claims = getHasuraClaimsFromJWT(jwt, claimsNamespace)
    const session = sessionVarsFromClaims(claims)

    if (!isScopeAllowed(session, scopes)) {
      return false
    }
    reqCtx.set("session", session)
    return true
  }
}
