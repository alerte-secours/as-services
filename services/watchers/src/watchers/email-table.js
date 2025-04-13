const async = require("async")

const { gql } = require("@apollo/client/core")
const { ctx } = require("@modjo/core")
// const watcherCtx = require("modjo-plugins/core/ctx/watcher")
const tasks = require("~/tasks")

const EMAIL_SUBSCRIPTION = gql`
  subscription onEmailAdded($limit: Int) {
    selectManyEmail(
      where: { verified: { _eq: false }, verificationEmailSent: { _eq: false } }
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

  return async function emailTable() {
    logger.info("watcher emailTable: daemon started")

    const observable = apolloClient.subscribe({
      query: EMAIL_SUBSCRIPTION,
      variables: {
        limit: QUEUE_BATCH_SIZE,
      },
    })

    observable.subscribe({
      next: async ({ data }) => {
        const { selectManyEmail } = data
        await async.eachOf(selectManyEmail, async ({ id }) =>
          addTask(tasks.EMAIL_VERIFY, { emailId: id })
        )
      },
      error: (error) => {
        logger.error({ error, watcher: "emailTable" }, `subscription error`)
        throw error
      },
    })
  }
}
