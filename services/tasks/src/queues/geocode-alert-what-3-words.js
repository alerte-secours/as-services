const { ctx } = require("@modjo/core")
const { taskCtx } = require("@modjo/microservice-worker/ctx")

const what3words = require("common/external-api/what3words")

module.exports = async function () {
  return Object.assign(
    async function geocodeAlertWhat3words(params) {
      const logger = taskCtx.require("logger")
      logger.info({ params }, "queue handler geocodeAlertWhat3words")

      const sql = ctx.require("postgres")

      const { coordinates, alertId } = params

      const what3wordsResult = await what3words(coordinates)
      const { words, nearestPlace } = what3wordsResult

      await sql`
        UPDATE
          "alert"
        SET
          "what3words" = ${words},
          "nearest_place" = ${nearestPlace}
        WHERE
          "id" = ${alertId}
        `
    },
    {
      dedupOptions: { enabled: true },
    }
  )
}
