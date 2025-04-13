const { ctx } = require("@modjo/core")
// const watcherCtx = require("modjo-plugins/core/ctx/watcher")

const cron = require("~/libs/cron")

const {
  RELATIVE_UNREGISTERED_RECONCILIATION_CRON,
} = require("~/constants/time")

module.exports = async function () {
  const logger = ctx.require("logger")
  const sql = ctx.require("postgres")

  return async function relativeUnregisteredReconciliationCron() {
    logger.info(
      "watcher relativeUnregisteredReconciliationCron: daemon started"
    )

    async function relativeUnregisteredReconciliationLoop() {
      await sql`SELECT relative_unregistered_reconciliation_loop()`
    }

    // debug
    // relativeUnregisteredReconciliationLoop()

    cron.schedule(
      RELATIVE_UNREGISTERED_RECONCILIATION_CRON,
      relativeUnregisteredReconciliationLoop
    )
  }
}
