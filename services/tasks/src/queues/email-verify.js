const { ctx } = require("@modjo/core")
const { taskCtx } = require("@modjo/microservice-worker/ctx")

const template = require("~/services/template")

module.exports = async function () {
  const config = ctx.require("config")
  const sql = ctx.require("postgres")
  const smtp = ctx.require("smtp")

  const { apiUrl } = config.project

  async function sendVerificationEmail(email, verificationCode) {
    const subject = `Alerte-Secours - Vérifiez votre adresse email`
    const text = await template("email/verify.text.eta", {
      apiUrl,
      verificationCode,
    })
    const html = await template("email/verify.html.eta", {
      title: "Verification Email",
      apiUrl,
      verificationCode,
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
    async function emailVerify(params) {
      const logger = taskCtx.require("logger")

      const { emailId } = params

      const [row] = await sql`
        SELECT
          "verification_code" AS "verificationCode",
          "verification_email_sent_time" AS "verificationEmailSentTime",
          "email"
        FROM
          "email"
        WHERE
          "id" = ${emailId}
        `
      if (!row) {
        return
      }
      const { email, verificationCode, verificationEmailSentTime } = row

      // check if last verification email was sent at least 2 minutes ago
      if (
        verificationEmailSentTime &&
        Date.now() - verificationEmailSentTime <= 120000
      ) {
        logger.debug(
          "last verification email was sent less than 2 minutes ago, skipping"
        )
        return
      }

      if (email) {
        await sendVerificationEmail(email, verificationCode)
      }

      await sql`
        UPDATE
          "email"
        SET
          "verification_email_sent" = true,
          "verification_email_sent_time" = NOW()
        WHERE
          "id" = ${emailId}
        `
    },
    {
      dedupOptions: { enabled: false },
    }
  )
}
