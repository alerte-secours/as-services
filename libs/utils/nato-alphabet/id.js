const letterId = require("./letterId")
const lettersToNato = require("./lettersToNato")

module.exports = function naotId(id, minimumNumberOfLetters = 3, glue = "") {
  return lettersToNato(letterId(id, minimumNumberOfLetters), glue)
}
