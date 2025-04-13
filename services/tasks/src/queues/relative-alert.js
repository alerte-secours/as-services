// const timeLogger = require("utils/debug/time-logger")

const { ctx } = require("@modjo/core")
const { taskCtx } = require("@modjo/microservice-worker/ctx")

const { ignoreForeignKeyViolation } = require("common/libs/pg/ignoreErrors")

module.exports = async function () {
  return Object.assign(
    async function relativeAlert(params) {
      const logger = taskCtx.require("logger")
      logger.info("queue hanlder relativeAlert", params)

      const sql = ctx.require("postgres")

      const { alertId, userId } = params

      const relativeList = await sql`
        SELECT
          "id",
          "to_user_id" as "toUserId"
        FROM
          "relative"
        WHERE
          "user_id" = ${userId}
        `

      const insertRows = (
        await Promise.all(
          relativeList.map(async (relativeRow) => {
            const [relativeAllow] = await sql`
              SELECT
                "allowed"
              FROM
                "relative_allow"
              WHERE
                "relative_id" = ${relativeRow.id}
              `
            if (!relativeAllow.allowed) {
              return
            }

            return {
              alertId,
              userId: relativeRow.toUserId,
              reason: "relative",
            }
          })
        )
      ).filter((t) => !!t)

      if (insertRows.length === 0) {
        return
      }

      await ignoreForeignKeyViolation(sql`
        INSERT INTO "alerting" ${sql(insertRows)}
        ON CONFLICT ("user_id", "alert_id")
          DO UPDATE SET
            "reason" = EXCLUDED. "reason"
        `)
    },
    {
      dedupOptions: { enabled: true },
    }
  )
}
