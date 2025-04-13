const levenshtein = require("fast-levenshtein")
const toPhonetic = require("talisman/phonetics/french/phonetic")

module.exports = class BKNodePhonetic {
  static toPhonetic(word) {
    return toPhonetic(word)
  }

  constructor(word, phonetic) {
    this.word = word
    if (!phonetic) {
      phonetic = BKNodePhonetic.toPhonetic(word)
    }
    this.phonetic = phonetic
    this.children = new Map()
  }

  insert(otherWord, phonetic) {
    if (!phonetic) {
      phonetic = BKNodePhonetic.toPhonetic(otherWord)
    }
    const dist = levenshtein.get(this.phonetic, phonetic)
    if (this.children.has(dist)) {
      this.children.get(dist).insert(otherWord, phonetic)
    } else {
      this.children.set(dist, new BKNodePhonetic(otherWord, phonetic))
    }
  }

  search(target, phoneticTarget, maxDist) {
    if (!phoneticTarget) {
      phoneticTarget = BKNodePhonetic.toPhonetic(target)
    }

    const currentDist = levenshtein.get(this.phonetic, phoneticTarget)

    // Early stopping if a close match is found
    if (currentDist <= maxDist) {
      return { word: this.word, distance: currentDist }
    }

    let minDistanceWord = null
    for (
      let i = Math.max(0, currentDist - maxDist);
      i <= currentDist + maxDist;
      i++
    ) {
      if (this.children.has(i)) {
        const result = this.children
          .get(i)
          .search(target, phoneticTarget, maxDist)
        if (
          result &&
          (!minDistanceWord || result.distance < minDistanceWord.distance)
        ) {
          minDistanceWord = result
          if (result.distance <= 1) {
            break
          }
        }
      }
    }

    return minDistanceWord
  }
}
