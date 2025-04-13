const defaultsDeep = require("lodash.defaultsdeep")
const nctx = require("nctx")
const nodemailer = require("nodemailer")

const ctx = nctx.create(Symbol(__dirname.split("/").pop()))

module.exports.create = () => {
  const config = ctx.require("config")
  const { smtp: options } = config

  const defaultOptions = {
    ignoreTLS: !options.pass,
    requireTLS: !!options.pass,
  }

  defaultsDeep(options, defaultOptions)

  const smtpConfig = {
    host: options.host,
    port: options.port,
    ignoreTLS: options.ignoreTLS,
    requireTLS: options.requireTLS,
    secure: options.requireTLS,
  }

  if (options.user) {
    smtpConfig.auth = {
      pass: options.pass,
      user: options.user,
    }
  }

  return nodemailer.createTransport(smtpConfig)
}

module.exports.dependencies = ["config"]

module.exports.ctx = ctx
