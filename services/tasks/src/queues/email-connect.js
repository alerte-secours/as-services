const { ctx } = require("@modjo/core")
const { taskCtx } = require("@modjo/microservice-worker/ctx")
const { nanoid } = require("nanoid")

const template = require("~/services/template")

module.exports = async function () {
  const config = ctx.require("config")
  const sql = ctx.require("postgres")
  const smtp = ctx.require("smtp")

  const { apiUrl } = config.project

  async function sendConnectionEmail(email, { connectionCode, username }) {
    const subject = `Alerte-Secours - Confirmez la demande de connexion`
    const text = await template("email/connect.text.eta", {
      apiUrl,
      connectionCode,
    })
    const html = await template("email/connect.html.eta", {
      title: "Connexion Email",
      apiUrl,
      connectionCode,
      username: username || "anonyme",
    })
    await smtp.sendMail({
      from: config.smtp.from,
      html,
      subject,
      text,
      to: email,
    })
  }

  return Object.assign(
    async function emailConnect(params) {
      const logger = taskCtx.require("logger")

      const { emailId, userId: oldUserId } = params

      const [lastConnectionEmail] = await sql`
        SELECT
          "connection_email_sent_time" AS "connectionEmailSentTime"
        FROM
          "auth_connect_email"
        WHERE
          "email_id" = ${emailId}
          AND "user_id" = ${oldUserId}
        `
      // check if last connection email was sent at least 2 minutes ago
      if (
        lastConnectionEmail?.lastConnectionEmail &&
        Date.now() - lastConnectionEmail.connectionEmailSentTime <= 120000
      ) {
        logger.debug(
          "last connection email was sent less than 2 minutes ago, skipping"
        )
        return
      }

      const [{ email, userId }] = await sql`
        SELECT
          "user_id" AS "userId",
          "email"
        FROM
          "email"
        WHERE
          "id" = ${emailId}
        `

      const connectionCode = nanoid()
      await sql`
        INSERT INTO "auth_connect_email" ("email_id", "user_id", "connection_code", "connection_email_sent_time")
          VALUES (${emailId}, ${oldUserId}, ${connectionCode}, NOW())
        ON CONFLICT ("user_id")
          DO UPDATE SET
            "email_id" = ${emailId}, "connection_code" = ${connectionCode}, "connection_email_sent_time" = NOW()
        `

      const [{ username }] = await sql`
        SELECT
          "username"
        FROM
          "user"
        WHERE
          "id" = ${userId}
        `

      await sendConnectionEmail(email, { connectionCode, username })
    },
    {
      dedupOptions: { enabled: false },
    }
  )
}
