const cron = require("node-cron")
const { ctx } = require("@modjo/core")

// see https://github.com/node-cron/node-cron/issues/399
function schedule(expression, fn, options) {
  return cron.schedule(
    expression,
    async () => {
      try {
        await fn()
      } catch (err) {
        const logger = ctx.require("logger")
        logger.error(
          { error: err.message },
          `failed to run scheduled function "${fn.name}" at ${expression}`
        )
        const sentry = ctx.require("sentry")
        sentry.captureException(err, {
          level: "fatal",
          tags: {
            type: "cron",
            func: fn.name,
            expression,
          },
        })
      }
    },
    options
  )
}

module.exports = {
  ...cron,
  schedule,
}
