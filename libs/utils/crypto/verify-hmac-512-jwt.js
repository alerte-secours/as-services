const crypto = require("crypto")

module.exports = function verifyHMAC512JWT(token, secret) {
  const parts = token.split(".")
  if (parts.length !== 3) {
    return false
  }

  const headerPayload = `${parts[0]}.${parts[1]}`
  const signature = parts[2]

  const newSignature = crypto
    .createHmac("sha512", secret)
    .update(headerPayload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  return newSignature === signature
}
