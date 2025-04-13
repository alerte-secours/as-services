module.exports = function ({ validators }) {
  return function isLocation(location) {
    const [longitude, latitude] = location
    const { isLongitude, isLatitude } = validators
    return isLongitude(longitude) && isLatitude(latitude)
  }
}
