const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")
const { RateLimiterMemory, RateLimiterRes } = require("rate-limiter-flexible")

module.exports = () => {
  const logger = ctx.require("logger")

  return (options = {}) => {
    const rateLimiter = new RateLimiterMemory({
      ...options,
    })

    return async (req, res, next) => {
      const { ip } = req
      const { userId } = reqCtx.get("session")
      const key = `${ip}.${userId}`
      try {
        await rateLimiter.consume(key)
        next()
      } catch (error) {
        if (!(error instanceof RateLimiterRes)) {
          throw error
        }
        logger.error(
          { ip, userId, key },
          "rate-limiter-flexible : Too Many Requests"
        )
        res.status(429).send("Too Many Requests")
      }
    }
  }
}
