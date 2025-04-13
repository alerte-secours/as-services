const { reqCtx } = require("@modjo/express/ctx")

module.exports = function () {
  return async function getOneUserId(_req) {
    const session = reqCtx.get("session")
    const { userId } = session

    return { id: userId }
  }
}
