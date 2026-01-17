// const { ctx } = require("@modjo/core")
const { taskCtx } = require("@modjo/microservice-worker/ctx")

const updateUserWithUniqueUsername = require("~/services/update-user-with-unique-username")

module.exports = async function () {
  // const config = ctx.require("config")

  return Object.assign(
    async function defaultSwagUsername(params) {
      const logger = taskCtx.require("logger")
      logger.debug(`defaultSwagUsername: ${JSON.stringify(params)}`)

      const { userId } = params
      await updateUserWithUniqueUsername({ userId })
    },
    {
      dedupOptions: { enabled: false },
    }
  )
}
