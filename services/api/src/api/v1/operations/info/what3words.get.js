// const { reqCtx } = require("@modjo/express/ctx")
const what3words = require("common/external-api/what3words")

module.exports = function ({ services: { middlewareRateLimiterIpUser } }) {
  async function getOneInfoWhat3words(req) {
    // const session = reqCtx.get("session")
    // const { userId } = session
    const { lat, lon } = req.query
    const coordinates = [lon, lat]

    const what3wordsResult = await what3words(coordinates)
    const { words, nearestPlace } = what3wordsResult

    return { words, nearestPlace }
  }
  return [
    middlewareRateLimiterIpUser({
      points: 90, // allowed requests
      duration: 60, // per duration in seconds
    }),
    getOneInfoWhat3words,
  ]
}
