module.exports = function () {
  return function isLongitude(lat) {
    return Number.isFinite(lat) && Math.abs(lat) <= 180
  }
}
