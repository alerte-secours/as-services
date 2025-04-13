const levenshtein = require("fast-levenshtein")

module.exports = class BKNodeLetters {
  constructor(word) {
    this.word = word
    this.children = new Map()
  }

  insert(otherWord) {
    const dist = levenshtein.get(this.word, otherWord)
    if (this.children.has(dist)) {
      this.children.get(dist).insert(otherWord)
    } else {
      this.children.set(dist, new BKNodeLetters(otherWord))
    }
  }

  search(target, maxDist) {
    const currentDist = levenshtein.get(this.word, target)

    // If the distance is within the acceptable maximum, return this word immediately
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
        const result = this.children.get(i).search(target, maxDist)
        if (
          result &&
          (!minDistanceWord || result.distance < minDistanceWord.distance)
        ) {
          minDistanceWord = result
          if (result.distance <= 1) {
            // Early stop if very close match found
            break
          }
        }
      }
    }

    return minDistanceWord
  }
}
