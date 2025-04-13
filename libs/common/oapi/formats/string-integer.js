module.exports = function ({ validators: { isInteger } }) {
  return {
    type: "number",
    validate: isInteger,
  }
}
