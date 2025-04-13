const { snakeCase, capitalize } = require("lodash")

const BKNodePhonetic = require("./autocorrect/BKNodePhonetic")

const frWordlist = require("./wordlists/fr.json")

const frWordsNode = new BKNodePhonetic(frWordlist[0])
frWordlist.slice(1).forEach((word) => frWordsNode.insert(word))

const wordsNode = frWordsNode
const wordlist = frWordlist

function wordsAutocorrect(words) {
  if (typeof words === "string") {
    words = snakeCase(words).split("_")
  }
  words = words.map((word) => {
    if (wordlist.includes(word)) {
      return word
    }
    const searchResult = wordsNode.search(word, null, 2)
    if (searchResult) {
      return searchResult.word
    }
    return null
  })
  if (words.some((w) => !w)) {
    return false
  }
  return words.map(capitalize).join("")
}
module.exports = wordsAutocorrect

// console.log(
//   ["AbaiserAbrupteChato", "AcuseAssierAssiduler", "AbisalAboutyrAbollier"].map(
//     wordsAutocorrect
//   )
// )
