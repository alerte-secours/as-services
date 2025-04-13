module.exports = function isInteger(value) {
  return (
    !Number.isNaN(value) &&
    (function (x) {
      // eslint-disable-next-line no-bitwise
      return (x | 0) === x
    })(parseFloat(value))
  )
}
