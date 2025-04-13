/* eslint-disable no-bitwise */

// Simple hash function to convert UUID to an integer
function hashUuid(uuid) {
  let hash = 0
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash &= hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// Converts a hash number to a base-26 (alphabet) 3-letter code
function hashTo3LetterCode(hash) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let code = ""
  for (let i = 0; i < 3; i++) {
    code += alphabet.charAt(hash % 26)
    hash = Math.floor(hash / 26)
  }
  return code
}

function uuidTo3LetterCode(uuid) {
  const hash = hashUuid(uuid)
  return hashTo3LetterCode(hash)
}
module.exports = uuidTo3LetterCode

// const uuid = "123e4567-e89b-12d3-a456-426614174000"
// const code = uuidTo3LetterCode(uuid)
// console.log(code)
