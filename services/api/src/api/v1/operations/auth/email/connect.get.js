const { ctx } = require("@modjo/core")

module.exports = async function () {
  const sql = ctx.require("postgres")

  async function deleteAuthConnectEmail(id) {
    await sql`
      DELETE FROM "auth_connect_email"
      WHERE id = ${id}
      `
  }

  async function connect(req, res) {
    const { code } = req.query
    const [authConnectEmail] = await sql`
      SELECT
        "id",
        "email_id" as "emailId",
        "user_id" as "userId",
        "connection_email_sent_time" as "connectionEmailSentTime"
      FROM
        "auth_connect_email"
      WHERE
        "connection_code" = ${code}
      `
    if (!authConnectEmail) {
      return res
        .status(404)
        .send(
          "<html><body>Le code de connexion est invalide. Veuillez réessayer.</body></html>"
        )
    }

    const {
      id: authConnectEmailId,
      connectionEmailSentTime,
      emailId,
      userId,
    } = authConnectEmail

    const expire = new Date()
    expire.setTime(expire.getTime() - 2 * 3600000) // 2 hours
    if (connectionEmailSentTime < expire) {
      deleteAuthConnectEmail(authConnectEmailId) // cleanup in background
      return res
        .status(498)
        .send(
          "<html><body>Le code de connexion est expiré. Veuillez renouveler votre demande.</body></html>"
        )
    }

    const loginRequestType = "email"
    await sql`
      INSERT INTO "user_login_request" ("user_id", "type", "email_id")
        VALUES (${userId}, ${loginRequestType}, ${emailId})
      ON CONFLICT ("user_id")
        DO UPDATE SET
          "type" = ${loginRequestType}, "email_id" = ${emailId}
      `

    deleteAuthConnectEmail(authConnectEmailId) // cleanup in background

    return res
      .status(200)
      .send(
        "<html><body>Connexion confirmée avec succès. Vous pouvez fermer cette page et retourner à l'application Alerte-Secours. Cette page se fermera automatiquement dans quelque secondes. <script>setTimeout(function() { window.close(); }, 30000);</script></body></html>"
      )
  }

  return [connect]
}
