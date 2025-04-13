const { ctx } = require("@modjo/core")
const { PhoneNumberUtil } = require("google-libphonenumber")

function parseFullNumber(n) {
  const phoneUtil = PhoneNumberUtil.getInstance()
  const num = phoneUtil.parse(n)
  if (!num.hasNationalNumber()) {
    throw new Error("invalid number")
  }
  const nationalNumber = num.getNationalNumberOrDefault().toString()
  const code = num.getCountryCodeOrDefault()
  const countryCode = phoneUtil.getRegionCodeForCountryCode(code)
  return {
    countryCode,
    code: code.toString(),
    nationalNumber,
  }
}

function parseFullPhoneNumber(fullPhoneNumber) {
  let phoneNumberObject
  try {
    phoneNumberObject = parseFullNumber(fullPhoneNumber)
  } catch (err) {
    const logger = ctx.require("logger")
    logger.debug({ error: err }, "unable to parse phone number")
    logger.error({ error: err }, "Error parsing phone number")
    throw err
  }
  const { countryCode, nationalNumber } = phoneNumberObject
  return { countryCode, nationalNumber }
}

function isFullPhoneNumber(fullPhoneNumber) {
  try {
    parseFullNumber(fullPhoneNumber)
    return true
  } catch (err) {
    return false
  }
}

module.exports = {
  parseFullNumber,
  parseFullPhoneNumber,
  isFullPhoneNumber,
}
