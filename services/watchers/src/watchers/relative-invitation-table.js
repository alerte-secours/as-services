const async = require("async")
const { gql } = require("@apollo/client/core")
const { ctx } = require("@modjo/core")
// const watcherCtx = require("modjo-plugins/core/ctx/watcher")
const tasks = require("~/tasks")

const RELATIVE_INVITATION_SUBSCRIPTION = gql`
  subscription onRelativeInvitationAdded($limit: Int) {
    selectManyRelativeInvitation(
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
  const QUEUE_BATCH_SIZE = 100

  return async function relativeInvitationTable() {
    logger.info("watcher relativeInvitationTable: daemon started")

    const observable = apolloClient.subscribe({
      query: RELATIVE_INVITATION_SUBSCRIPTION,
      variables: {
        limit: QUEUE_BATCH_SIZE,
      },
    })

    observable.subscribe({
      next: async ({ data }) => {
        const { selectManyRelativeInvitation } = data

        logger.debug(
          {
            relativeInvitationIds: selectManyRelativeInvitation.map(
              ({ id }) => id
            ),
          },
          "relativeInvitationNotify"
        )

        await async.eachOf(selectManyRelativeInvitation, async ({ id }) =>
          addTask(tasks.RELATIVE_INVITATION_NOTIFY, {
            relativeInvitationId: id,
          })
        )
      },
      error: (error) => {
        logger.error(
          { error, watcher: "relativeInvitationTable" },
          `subscription error`
        )
        throw error
      },
    })
  }
}
