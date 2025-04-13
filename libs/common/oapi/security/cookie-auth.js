const { ctx } = require("@modjo/core")

module.exports = function ({ services: { auth } }) {
  const config = ctx.require("config.project")
  const { bearerCookieName } = config

  return async function cookieAuth(req, scopes, _schema) {
    const jwtoken = req.cookies[bearerCookieName]
    return auth(jwtoken, scopes)
  }
}
