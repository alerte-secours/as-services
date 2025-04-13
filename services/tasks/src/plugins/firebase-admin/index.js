const nctx = require("nctx")

const admin = require("firebase-admin")

const ctx = nctx.create(Symbol(__dirname.split("/").pop()))

module.exports.create = () => {
  const config = ctx.require("config")
  const { googleServiceAccountKey } = config.project

  admin.initializeApp({
    credential: admin.credential.cert(googleServiceAccountKey),
  })

  return admin
}

module.exports.dependencies = ["config"]

module.exports.ctx = ctx
