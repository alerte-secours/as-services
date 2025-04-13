const { ctx } = require("@modjo/core")
const { taskCtx } = require("@modjo/microservice-worker/ctx")

const nominatimReverse = require("common/external-api/nominatim-reverse")

module.exports = async function () {
  return Object.assign(
    async function geocodeAlertGuessAddress(params) {
      const logger = taskCtx.require("logger")
      logger.info("queue hanlder geocodeAlertGuessAddress", params)

      const sql = ctx.require("postgres")

      const { coordinates, alertId } = params

      const nominatimResult = await nominatimReverse(coordinates)
      if (!nominatimResult) {
        return
      }
      const { display_name: address } = nominatimResult

      if (!address) {
        return
      }

      await sql`
        UPDATE
          "alert"
        SET
          "address" = ${address}
        WHERE
          "id" = ${alertId}
        `
    },
    {
      dedupOptions: { enabled: true },
    }
  )
}
