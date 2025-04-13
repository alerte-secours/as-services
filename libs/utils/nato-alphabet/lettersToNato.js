const capitalize = require("lodash.capitalize")
const nato = require(".")

module.exports = function lettersToNato(letters, glue = "") {
  return Array.from(letters)
    .map((letter) => capitalize(nato(letter.toLowerCase())))
    .join(glue)
}
