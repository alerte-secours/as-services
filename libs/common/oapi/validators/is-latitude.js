module.exports = function () {
  return function isLatitude(lat) {
    return Number.isFinite(lat) && Math.abs(lat) <= 90
  }
}
