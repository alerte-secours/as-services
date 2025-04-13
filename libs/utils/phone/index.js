const { PhoneNumberUtil } = require("google-libphonenumber")
const countryCodesList = require("country-codes-list")

const phoneUtil = PhoneNumberUtil.getInstance()

const tryMethodPhone = (method, phoneNumber, args = [], defaultValue = "") => {
  try {
    const num = phoneUtil.parse(phoneNumber)
    return num[method](...args)
  } catch (_err) {
    console.debug("phone number parse err", _err, { method, args })
    return defaultValue
  }
}

const getRegionCodeForNumber = (phoneNumber, defaultValue) => {
  return tryMethodPhone("getRegionCodeForNumber", phoneNumber, [], defaultValue)
}
const getCountryCode = (phoneNumber, defaultValue) => {
  return tryMethodPhone("getCountryCode", phoneNumber, [], defaultValue)
}
const getNationalNumber = (phoneNumber, defaultValue) => {
  return tryMethodPhone("getNationalNumber", phoneNumber, [], defaultValue)
}

const isValidNumber = (phoneNumber, countryCode) => {
  try {
    const parsedNumber = phoneUtil.parse(phoneNumber, countryCode)
    return phoneUtil.isValidNumber(parsedNumber)
  } catch (_err) {
    // console.log({ phoneNumber, countryCode }, _err);
    return false
  }
}

const parseInternationalNumber = (n) => {
  let num
  try {
    num = phoneUtil.parse(n)
  } catch (err) {
    return
  }
  if (!num.hasNationalNumber()) {
    return
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

const removeLeadingZero = (number) => {
  return number?.replace(/^0+/, "")
}

const normalizeNumber = (
  number,
  country,
  { defaultCountryCallingCode = false } = {}
) => {
  let code
  if (country) {
    code = countryCodesList.findOne("countryCode", country)?.countryCallingCode
    number = removeLeadingZero(number)
    number = `${code}${number}`
  } else {
    let num
    try {
      num = phoneUtil.parse(number)
    } catch (err) {
      // do nothing
    }
    number = removeLeadingZero(number)
    if (!num?.hasNationalNumber() && defaultCountryCallingCode) {
      number = `${defaultCountryCallingCode}${number}`
    }
  }

  return number.replace(/\D/g, "")
}

module.exports = {
  tryMethodPhone,
  getRegionCodeForNumber,
  getCountryCode,
  getNationalNumber,
  isValidNumber,
  parseInternationalNumber,
  removeLeadingZero,
  normalizeNumber,
}
