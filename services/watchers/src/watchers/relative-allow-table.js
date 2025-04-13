const async = require("async")
const { gql } = require("@apollo/client/core")
const { ctx } = require("@modjo/core")
// const watcherCtx = require("modjo-plugins/core/ctx/watcher")
const tasks = require("~/tasks")

const RELATIVE_ALLOW_SUBSCRIPTION = gql`
  subscription onRelativeAllowAdded($limit: Int) {
    selectManyRelativeAllow(
      where: {
        _and: {
          allowed: { _is_null: true }
          askNotificationSent: { _is_null: true }
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
  const QUEUE_BATCH_SIZE = 100

  return async function relativeAllowTable() {
    logger.info("watcher relativeAllowTable: daemon started")

    const observable = apolloClient.subscribe({
      query: RELATIVE_ALLOW_SUBSCRIPTION,
      variables: {
        limit: QUEUE_BATCH_SIZE,
      },
    })

    observable.subscribe({
      next: async ({ data }) => {
        const { selectManyRelativeAllow } = data

        logger.debug(
          { relativeAllowIds: selectManyRelativeAllow.map(({ id }) => id) },
          "relativeAllowAskNotify"
        )

        await async.eachOf(selectManyRelativeAllow, async ({ id }) =>
          addTask(tasks.RELATIVE_ALLOW_ASK_NOTIFY, { relativeAllowId: id })
        )
      },
      error: (error) => {
        logger.error(
          { error, watcher: "relativeAllowTable" },
          `subscription error`
        )
        throw error
      },
    })
  }
}
