const async = require("async")

const { gql } = require("@apollo/client/core")
const { ctx } = require("@modjo/core")
// const watcherCtx = require("modjo-plugins/core/ctx/watcher")
const tasks = require("~/tasks")

const ALERT_CALL_EMERGENCY_INFOS_READY_SUBSCRIPTION = gql`
  subscription onAlertCallEmergencyInfoReady($limit: Int) {
    selectManyAlert(
      where: {
        _and: {
          callEmergency: { _eq: true }
          emergencyCallingNotificationSent: { _is_null: true }
          what3Words: { _is_null: false }
          address: { _is_null: false }
        }
      }
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

  return async function alertTableCallEmergency() {
    logger.info("watcher alertTableCallEmergency: daemon started")

    const observable = apolloClient.subscribe({
      query: ALERT_CALL_EMERGENCY_INFOS_READY_SUBSCRIPTION,
      variables: {
        limit: QUEUE_BATCH_SIZE,
      },
    })

    observable.subscribe({
      next: async ({ data }) => {
        const { selectManyAlert } = data
        await async.eachOf(selectManyAlert, async ({ id }) =>
          addTask(tasks.ALERT_CALL_EMERGENCY_INFO_NOTIFY, { alertId: id })
        )
      },
      error: (error) => {
        logger.error(
          { error, watcher: "alertTableCallEmergency" },
          `subscription error`
        )
        throw error
      },
    })

    // ...
  }
}
