const { nanoid } = require("nanoid")
const slowDown = require("express-slow-down")
const { ctx } = require("@modjo/core")

module.exports = async function ({ services: { signJwt } }) {
  const sql = ctx.require("postgres")

  const speedLimiter = slowDown({
    windowMs: 5 * 1000, // 5 seconds
    delayAfter: 3, // allow 3 requests per 5 seconds, then...
    delayMs: 100, // begin adding 500ms of delay per request above 3:
    // request # 4 is delayed by  500ms
    // request # 5 is delayed by 1000ms
    // request # 6 is delayed by 1500ms
    // etc.
  })

  async function addOneAuthInitToken() {
    const plainAuthToken = nanoid()
    await sql`INSERT INTO "auth_token" ("auth_token") VALUES(${plainAuthToken})`

    const authTokenJwt = await signJwt({ authToken: plainAuthToken })

    return { authTokenJwt }
  }

  return [speedLimiter, addOneAuthInitToken]
}
