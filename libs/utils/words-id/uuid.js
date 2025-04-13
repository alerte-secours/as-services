const capitalize = require("lodash.capitalize")

const generateLetterWordset = require("generate-letter-wordset")

// FNV-1a Hash function to convert UUID to integer
function fnv1aHash(str) {
  const FNV_PRIME = 16777619
  const FNV_OFFSET_BASIS = 2166136261
  let hash = FNV_OFFSET_BASIS

  for (let i = 0; i < str.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash ^= str.charCodeAt(i)
    // eslint-disable-next-line no-bitwise
    hash = (hash * FNV_PRIME) >>> 0 // Convert to 32-bit unsigned integer
  }

  return hash
}

module.exports = function wordsUuid(uuid) {
  const seed = fnv1aHash(uuid)
  return generateLetterWordset(seed).map(capitalize).join(".")
}
