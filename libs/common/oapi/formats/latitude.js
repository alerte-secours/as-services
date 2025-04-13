module.exports = function ({ validators: { isLatitude } }) {
  return {
    type: "number",
    validate: isLatitude,
  }
}
