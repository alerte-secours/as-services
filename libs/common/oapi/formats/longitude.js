module.exports = function ({ validators: { isLongitude } }) {
  return {
    type: "number",
    validate: isLongitude,
  }
}
