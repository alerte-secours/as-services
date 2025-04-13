const { ctx } = require("@modjo/core")
const { decodeJwt } = require("jose")
const verifyHMAC512JWT = require("utils/crypto/verify-hmac-512-jwt")
const { reqCtx } = require("@modjo/express/ctx")

module.exports = function () {
  const headerPrefix = "Bearer "
  const headerPrefixLength = headerPrefix.length
  const config = ctx.require("config")
  const { external } = config.project
  const { ringoverCallEventWebhookKey } = external

  return async function bearerSignatureHmac512(req, _scopes, _schema) {
    const token = req.headers.authorization.slice(headerPrefixLength)
    const verified = verifyHMAC512JWT(token, ringoverCallEventWebhookKey)
    if (!verified) {
      return false
    }
    const decoded = decodeJwt(token)
    reqCtx.set("external.ringover.event", decoded)
    return true
  }
}
