const async = require("async")

const { gql } = require("@apollo/client/core")
const { ctx } = require("@modjo/core")
// const watcherCtx = require("modjo-plugins/core/ctx/watcher")
// const tasks = require("~/tasks")

const ALERT_FOLLOW_LOCATION_SUBSCRIPTION = gql`
  subscription onAlertFollowLocation($limit: Int) {
    selectManyAlert(
      where: { _and: { state: { _eq: "open" }, followLocation: { _eq: true } } }
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
  // const { addTask } = ctx.require("amqp")

  // const QUEUE_BATCH_SIZE = null
  const QUEUE_BATCH_SIZE = 1000

  return async function alertTableFollowLocation() {
    logger.info("watcher alertTableFollowLocation: daemon started")

    const observable = apolloClient.subscribe({
      query: ALERT_FOLLOW_LOCATION_SUBSCRIPTION,
      variables: {
        limit: QUEUE_BATCH_SIZE,
      },
    })

    observable.subscribe({
      next: async ({ data }) => {
        const { selectManyAlert } = data
        await async.eachOf(selectManyAlert, async ({ id: _id }) => {
          // TODO
        })
      },
      error: (error) => {
        logger.error(
          { error, watcher: "alertTableFollowLocation" },
          `subscription error`
        )
        throw error
      },
    })
  }
}
