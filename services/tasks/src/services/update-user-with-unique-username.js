const generateSwagUsername = require("generate-swag-username")
const generateShortHash = require("utils/hash/short")
const { ctx } = require("@modjo/core")

module.exports = async function updateUserWithUniqueUsername(
  config,
  context = {}
) {
  const sql = ctx.require("postgres")
  const logger = ctx.require("logger")

  const {
    userId,
    seed = userId,
    maxAttempts = 105,
    swagUsernameOptions = {},
  } = config
  const { attempt = 0 } = context

  const baseUsername =
    context.baseUsername ||
    (await generateSwagUsername({ ...swagUsernameOptions, seed }))

  let username = baseUsername
  if (attempt > 0) {
    const hash = generateShortHash(username + attempt)
    username += `-${hash}`
  }

  try {
    const rows = await sql`
      UPDATE
        "user"
      SET
        username = ${username}
      WHERE
        id = ${userId}
        AND (username IS NULL
          OR username = '')
      RETURNING
        id
      `

    if (rows.length > 0) {
      return { success: true, username }
    }
    return { success: false, reason: "no_empty_slots_or_race_condition" }
  } catch (err) {
    if (err.code === "23505") {
      // Handle unique constraint violation specifically
      if (attempt < maxAttempts) {
        return updateUserWithUniqueUsername(config, {
          baseUsername,
          attempt: attempt + 1,
        })
      }
      logger.error(
        { userId, username, attempt, maxAttempts },
        "unique_constraint_violation_retry_limit_exceeded"
      )
      return {
        success: false,
        reason: "unique_constraint_violation_retry_limit_exceeded",
      }
    }
    throw err
  }
}
