const { ctx } = require("@modjo/core")
const { taskCtx } = require("@modjo/microservice-worker/ctx")

const what3words = require("common/external-api/what3words")

module.exports = async function () {
  return Object.assign(
    async function geocodeAlertWhat3words(params) {
      const logger = taskCtx.require("logger")
      logger.info({ params }, "queue handler geocodeAlertWhat3words")

      const sql = ctx.require("postgres")

      const { coordinates, alertId, isLast = false } = params

      // Check if coordinates is valid
      if (
        !coordinates ||
        !Array.isArray(coordinates) ||
        coordinates.length !== 2
      ) {
        logger.error(
          { params },
          "Invalid coordinates for geocodeAlertWhat3words"
        )
        return
      }

      const what3wordsResult = await what3words(coordinates)
      if (!what3wordsResult) {
        logger.error({ params }, "Failed to get what3words result")
        return
      }

      const { words, nearestPlace } = what3wordsResult

      const fields = isLast
        ? { last_what3words: words, last_nearest_place: nearestPlace }
        : { what3words: words, nearest_place: nearestPlace }

      await sql`
        UPDATE
          "alert"
        SET
          ${sql(fields)}
        WHERE
          "id" = ${alertId}
        `
    },
    {
      dedupOptions: { enabled: true },
    }
  )
}
