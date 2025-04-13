module.exports = function ({ validators: { isLocation } }) {
  return {
    type: "string",
    validate: isLocation,
  }
}
