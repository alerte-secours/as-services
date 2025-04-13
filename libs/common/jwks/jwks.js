const fs = require("fs-extra")
const fnv = require("fnv-plus")

module.exports = async function createJwks(env) {
  const { JWK_FILE, OLDJWK_FILE } = env

  const loadJwkFile = async (file) => {
    const rawJwk = await fs.readFile(file, { encoding: "utf-8" })
    const jwk = JSON.parse(rawJwk)
    if (!jwk.kid) {
      jwk.kid = fnv.hash(rawJwk, 128).hex()
    }
    return jwk
  }
  const keys = []

  keys.push(await loadJwkFile(JWK_FILE))

  if (OLDJWK_FILE) {
    keys.push(await loadJwkFile(OLDJWK_FILE))
  }

  return keys
}
