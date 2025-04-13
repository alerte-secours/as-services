const { ctx } = require("@modjo/core")
const { omit } = require("lodash")

module.exports = function () {
  const config = ctx.require("config.project")
  const { jwks, jwkExpirationInDays } = config

  const keys = jwks.map((jwk) => omit(jwk, ["d"]))

  const maxAge = jwkExpirationInDays * 24 * 3600

  return async function getOneJwks(_req, res) {
    res.set("Cache-Control", `public, max-age=${maxAge}`)
    return {
      keys,
    }
  }
}
