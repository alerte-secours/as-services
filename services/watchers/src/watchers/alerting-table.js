const async = require("async")

const { gql } = require("@apollo/client/core")
const { ctx } = require("@modjo/core")
// const watcherCtx = require("modjo-plugins/core/ctx/watcher")
const tasks = require("~/tasks")

const ALERTING_SUBSCRIPTION = gql`
  subscription onAlertingAdded($limit: Int) {
    selectManyAlerting(
      where: { notificationSent: { _is_null: true } }
      limit: $limit
      order_by: { id: asc }
    ) {
      id
    }
  }
`
module.exports = async function () {
  const logger = ctx.require("logger")
  const apolloClient = ctx.require("apolloClient")
  const { addTask } = ctx.require("amqp")

  // const QUEUE_BATCH_SIZE = null
  const QUEUE_BATCH_SIZE = 1000

  return async function alertingTable() {
    logger.info("watcher alertingTable: daemon started")

    const observable = apolloClient.subscribe({
      query: ALERTING_SUBSCRIPTION,
      variables: {
        limit: QUEUE_BATCH_SIZE,
      },
    })

    observable.subscribe({
      next: async ({ data }) => {
        const { selectManyAlerting } = data
        await async.eachOf(selectManyAlerting, async ({ id }) =>
          addTask(tasks.ALERT_NOTIFY, { alertingId: id })
        )
      },
      error: (error) => {
        logger.error({ error, watcher: "alertingTable" }, `subscription error`)
        throw error
      },
    })

    // ...
  }
}
