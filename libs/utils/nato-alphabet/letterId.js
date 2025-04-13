module.exports = function letterId(
  number,
  minimumNumberOfLetters = 0,
  maximumNumberOfLetter = Infinity,
  reverse = true
) {
  const letters = []
  let nOfNumbers = 0

  let divid = number - (number % 26)
  while (divid !== 0) {
    divid = Math.floor(divid / 26)
    nOfNumbers += 1
  }

  if (nOfNumbers < minimumNumberOfLetters) {
    nOfNumbers = minimumNumberOfLetters
  }
  if (nOfNumbers > maximumNumberOfLetter) {
    number -= 26 ** nOfNumbers
    nOfNumbers = maximumNumberOfLetter
  }
  const matrix = []
  matrix.length = nOfNumbers
  matrix.fill(0)
  for (let i = number; i > 0; i--) {
    matrix[0]++
    let nextMatrixAdd = 0
    for (let mi = 0; mi < matrix.length; mi++) {
      matrix[mi] += nextMatrixAdd
      nextMatrixAdd = 0
      if (matrix[mi] === 26) {
        matrix[mi] = 0
        nextMatrixAdd = 1
      }
    }
  }
  matrix.reverse()
  for (let i = 0; i < nOfNumbers; i++) {
    const charCode = 65 + matrix[i]
    letters.push(String.fromCharCode(charCode))
  }
  if (reverse) {
    letters.reverse()
  }
  return letters.join("")
}

// console.log(0,letterId(0));
// console.log(1,letterId(1));
// console.log(2,letterId(2));
// console.log(26,letterId(26));
// console.log(52,letterId(52));
// console.log(676,letterId(676));
// console.log("26*26*26 -1 = 17575", letterId(17575)); // 26*26*26 -1
// console.log(95865, letterId(95865));
// console.log(95865, letterId(95865,3,3));
// console.log(25, letterId(25,1,1));
// console.log(26, letterId(26,1,1));
// console.log(17575, letterId(17575,3,3));
// console.log(17576, letterId(17576,3,3));
