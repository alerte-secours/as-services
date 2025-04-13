// const { reqCtx } = require("@modjo/express/ctx")

const nominatimReverse = require("common/external-api/nominatim-reverse")

module.exports = function ({ services: { middlewareRateLimiterIpUser } }) {
  async function getOneInfoNominatim(req) {
    const { lat, lon } = req.query
    const coordinates = [lon, lat]

    const nominatimResult = await nominatimReverse(coordinates)
    if (!nominatimResult) {
      return
    }
    const { display_name: displayName } = nominatimResult
    const address = displayName || ""
    return { address }
  }
  return [
    middlewareRateLimiterIpUser({
      points: 90, // allowed requests
      duration: 60, // per duration in seconds
    }),
    getOneInfoNominatim,
  ]
}
