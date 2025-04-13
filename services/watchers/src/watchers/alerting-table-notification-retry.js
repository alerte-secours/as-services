const async = require("async")
const { gql } = require("@apollo/client/core")
const { ctx } = require("@modjo/core")
const tasks = require("~/tasks")

const ALERTING_RETRY_SUBSCRIPTION = gql`
  subscription onAlertingNotificationRetry(
    $limit: Int
    $minutesAgo: timestamptz!
  ) {
    selectManyAlerting(
      where: {
        notificationSent: { _eq: false }
        createdAt: { _gte: $minutesAgo }
      }
      limit: $limit
      order_by: { createdAt: asc }
    ) {
      id
      createdAt
    }
  }
`

const RETRY_INTERVALS = [1, 2, 5, 10, 20] // minutes

function shouldRetryNotification(createdAt) {
  const now = new Date()
  const timeDiffMinutes = (now - new Date(createdAt)) / (1000 * 60)

  // Check if we're within 5 seconds of any retry interval
  // This ensures we only retry at specific intervals
  return RETRY_INTERVALS.some((interval) => {
    const diff = Math.abs(timeDiffMinutes - interval)
    return diff <= 0.083 // 5 seconds in minutes (5/60)
  })
}

module.exports = async function () {
  const logger = ctx.require("logger")
  const apolloClient = ctx.require("apolloClient")
  const { addTask } = ctx.require("amqp")

  const QUEUE_BATCH_SIZE = 1000

  return async function alertingTableNotificationRetry() {
    logger.info("watcher alertingTableNotificationRetry: daemon started")

    // Calculate timestamp for 20 minutes ago
    const getMinutesAgo = () => {
      const date = new Date()
      date.setMinutes(
        date.getMinutes() - RETRY_INTERVALS[RETRY_INTERVALS.length - 1]
      )
      return date.toISOString()
    }

    const observable = apolloClient.subscribe({
      query: ALERTING_RETRY_SUBSCRIPTION,
      variables: {
        limit: QUEUE_BATCH_SIZE,
        minutesAgo: getMinutesAgo(),
      },
    })

    observable.subscribe({
      next: async ({ data }) => {
        const { selectManyAlerting } = data
        await async.eachOf(selectManyAlerting, async ({ id, createdAt }) => {
          if (shouldRetryNotification(createdAt)) {
            await addTask(tasks.ALERT_NOTIFY, { alertingId: id })
          }
        })
      },
      error: (error) => {
        logger.error(
          { error, watcher: "alertingTableNotificationRetry" },
          `subscription error`
        )
        throw error
      },
    })
  }
}
