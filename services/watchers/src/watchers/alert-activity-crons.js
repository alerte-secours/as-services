const async = require("async")

const { ctx } = require("@modjo/core")
// const watcherCtx = require("modjo-plugins/core/ctx/watcher")

const cron = require("~/libs/cron")

const tasks = require("~/tasks")

const {
  ALERT_SUGGEST_CLOSE_INTERVAL,
  ALERT_SUGGEST_KEEP_OPEN_INTERVAL,
  ALERT_AUTO_CLOSE_INTERVAL,
  ALERT_AUTO_ARCHIVE_INTERVAL,
  SCAN_SUGGEST_CLOSE_CRON,
  SCAN_SUGGEST_KEEP_OPEN_CRON,
  SCAN_AUTO_CLOSE_CRON,
  SCAN_AUTO_ARCHIVE_CRON,
} = require("~/constants/time")

const MAX_PARALLEL_TASK_PROCESS = 10

module.exports = async function () {
  const logger = ctx.require("logger")
  const sql = ctx.require("postgres")
  const { addTask } = ctx.require("amqp")

  return async function alertingActivityCron() {
    logger.info("watcher alertingActivityCron: daemon started")

    async function scanActivitySuggestClose() {
      const alerts = await sql`
        SELECT
          "id"
        FROM
          "alert"
        WHERE
          "state" = 'open'
          AND "suggest_close_sent" = false
          AND GREATEST ("updated_at", "keep_open_at") <= NOW() - ${ALERT_SUGGEST_CLOSE_INTERVAL}::interval
        `

      logger.debug(
        { alertsIds: alerts.map(({ id }) => id) },
        "alertNotifySuggestClose"
      )

      await async.eachOfLimit(
        alerts,
        MAX_PARALLEL_TASK_PROCESS,
        async ({ id: alertId }) => {
          await addTask(tasks.ALERT_SUGGEST_CLOSE_NOTIFY, { alertId })
        }
      )
    }

    async function scanActivitySuggestKeepOpen() {
      const alerts = await sql`
        SELECT
          "id"
        FROM
          "alert"
        WHERE
          "state" = 'open'
          AND "suggest_keep_open_sent" IS NULL
          AND GREATEST ("updated_at", "keep_open_at") <= NOW() - ${ALERT_SUGGEST_KEEP_OPEN_INTERVAL}::interval
        `

      logger.debug(
        { alertsIds: alerts.map(({ id }) => id) },
        "alertNotifySuggestKeepOpen"
      )

      await async.eachOfLimit(
        alerts,
        MAX_PARALLEL_TASK_PROCESS,
        async ({ id: alertId }) => {
          await addTask(tasks.ALERT_SUGGEST_KEEP_OPEN_NOTIFY, { alertId })
        }
      )
    }

    async function scanActivityAutoClose() {
      const alerts = await sql`
        SELECT
          "id"
        FROM
          "alert"
        WHERE
          "state" = 'open'
          AND GREATEST ("updated_at", "keep_open_at") <= NOW() - ${ALERT_AUTO_CLOSE_INTERVAL}::interval
          AND "suggest_keep_open_sent" IS NOT NULL
        `

      logger.debug({ alertsIds: alerts.map(({ id }) => id) }, "alertAutoClose")

      await async.eachOfLimit(
        alerts,
        MAX_PARALLEL_TASK_PROCESS,
        async ({ id: alertId }) => {
          await addTask(tasks.ALERT_CLOSE, { alertId, closedBy: "auto" })
        }
      )
    }

    async function scanActivityAutoArchive() {
      const alerts = await sql`
        SELECT
          "id"
        FROM
          "alert"
        WHERE
          "closed_at" <= NOW() - ${ALERT_AUTO_ARCHIVE_INTERVAL}::interval
          AND "state" = 'closed'
        `

      logger.debug(
        { alertsIds: alerts.map(({ id }) => id) },
        "alertAutoArchive"
      )

      await async.eachOfLimit(
        alerts,
        MAX_PARALLEL_TASK_PROCESS,
        async ({ id: alertId }) => {
          await addTask(tasks.ALERT_ARCHIVE, { alertId })
        }
      )
    }

    // debug
    // scanActivitySuggestClose()
    // scanActivitySuggestKeepOpen()
    // scanActivityAutoClose()
    // scanActivityAutoArchive()
    // addTask(tasks.ALERT_SUGGEST_CLOSE_NOTIFY, { alertId: 172 })
    // addTask(tasks.ALERT_SUGGEST_KEEP_OPEN_NOTIFY, { alertId: 172 })

    cron.schedule(SCAN_SUGGEST_CLOSE_CRON, scanActivitySuggestClose)
    cron.schedule(SCAN_SUGGEST_KEEP_OPEN_CRON, scanActivitySuggestKeepOpen)
    cron.schedule(SCAN_AUTO_CLOSE_CRON, scanActivityAutoClose)
    cron.schedule(SCAN_AUTO_ARCHIVE_CRON, scanActivityAutoArchive, {
      recoverMissedExecutions: true,
    })
  }
}
