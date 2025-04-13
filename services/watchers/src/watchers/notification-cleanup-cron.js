const { ctx } = require("@modjo/core")
const cron = require("~/libs/cron")

const CLEANUP_CRON = "0 0 * * *" // Run at midnight every day
const CLEANUP_INTERVAL = "14 days"

module.exports = async function () {
  const logger = ctx.require("logger")
  const sql = ctx.require("postgres")

  return async function notificationCleanupCron() {
    logger.info("watcher notificationCleanupCron: daemon started")

    async function cleanupOldNotifications() {
      try {
        // Delete notifications older than 14 days
        const result = await sql`
          DELETE FROM notification
          WHERE created_at < NOW() - ${CLEANUP_INTERVAL}::interval
          `
        logger.info(
          { count: result.count },
          `Deleted ${result.count} old notifications`
        )
      } catch (error) {
        logger.error({ error }, "Error cleaning up old notifications")
      }
    }

    // Schedule the cleanup to run daily
    cron.schedule(CLEANUP_CRON, cleanupOldNotifications)
  }
}
