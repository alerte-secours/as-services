const { validate } = require("uuid")

module.exports = function () {
  return {
    type: "string",
    validate,
  }
}
