const { SignJWT } = require("jose")
const { ctx } = require("@modjo/core")

module.exports = () => {
  const config = ctx.require("config.project")
  const { jwkPrivateKey, jwkAlg, jwkId } = config

  return async function signJwt(payload) {
    try {
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: jwkAlg, kid: jwkId })
        .sign(jwkPrivateKey)
      return jwt
    } catch (error) {
      console.error("Error signing JWT:", error)
    }
  }
}
