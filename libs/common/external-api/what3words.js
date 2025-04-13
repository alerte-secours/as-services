const { ConvertTo3waClient } = require("@what3words/api")
const { ctx } = require("@modjo/core")

// see https://developer.what3words.com/public-api

const what3wordsConfig = {
  host: "https://api.what3words.com",
  apiVersion: "v3",
}

module.exports = async function what3words(coords, options = {}) {
  const config = ctx.get("config.project")
  const { what3wordsApiKey } = config

  const w3wClient = ConvertTo3waClient.init(what3wordsApiKey, what3wordsConfig)

  const [lng, lat] = coords

  let data
  try {
    data = await w3wClient.run({
      coordinates: { lat, lng },
      language: "fr",
      format: "json",
      ...options,
    })
    // data = res.data
  } catch (e) {
    console.error(e)
  }
  return data
}
