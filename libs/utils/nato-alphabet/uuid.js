const letterUuid = require("./letterUuid")
const lettersToNato = require("./lettersToNato")

module.exports = function naotId(id, minimumNumberOfLetters = 3, glue = "") {
  return lettersToNato(letterUuid(id, minimumNumberOfLetters), glue)
}
