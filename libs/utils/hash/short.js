const crypto = require("crypto")

module.exports = (input) => {
  return crypto.createHash("sha256").update(input).digest("hex").substring(0, 8)
}
