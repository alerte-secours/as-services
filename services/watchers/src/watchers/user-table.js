const async = require("async")

const { gql } = require("@apollo/client/core")
const { ctx } = require("@modjo/core")
// const watcherCtx = require("modjo-plugins/core/ctx/watcher")
const tasks = require("~/tasks")

const USER_SUBSCRIPTION = gql`
  subscription onUserAdded($limit: Int) {
    selectManyUser(
      where: { username: { _is_null: true } }
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

  return async function userTable() {
    logger.info("watcher userTable: daemon started")

    const observable = apolloClient.subscribe({
      query: USER_SUBSCRIPTION,
      variables: {
        limit: QUEUE_BATCH_SIZE,
      },
    })

    observable.subscribe({
      next: async ({ data }) => {
        const { selectManyUser } = data

        logger.debug(
          {
            userIds: selectManyUser.map(({ id }) => id),
          },
          "userTable"
        )

        await async.eachOf(selectManyUser, async ({ id }) =>
          addTask(tasks.DEFAULT_SWAG_USERNAME, { userId: id })
        )
      },
      error: (error) => {
        logger.error({ error, watcher: "userTable" }, `subscription error`)
        throw error
      },
    })
  }
}
