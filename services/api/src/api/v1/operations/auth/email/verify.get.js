const { ctx } = require("@modjo/core")

module.exports = async function () {
  const sql = ctx.require("postgres")

  async function verify(req, res) {
    const { code } = req.query
    const [email] =
      await sql`SELECT "id", "verified" FROM "email" WHERE "verification_code" = ${code}`
    if (!email) {
      return res
        .status(404)
        .send(
          "<html><body>Le code de vérification est invalide. Veuillez réessayer.</body></html>"
        )
    }
    if (email.verified) {
      return res
        .status(208)
        .send(
          "<html><body>Cet email a déjà été vérifié. Vous n'avez rien à faire. Vous pouvez fermer cette page et retourner à l'application Alerte-Secours. Cette page se fermera automatiquement dans quelque secondes. <script>setTimeout(function() { window.close(); }, 30000);</script></body></html>"
        )
    }
    await sql`UPDATE "email" SET "verified" = true WHERE id = ${email.id}`
    return res
      .status(200)
      .send(
        "<html><body>Email vérifié avec succès. Vous pouvez fermer cette page et retourner à l'application Alerte-Secours. Cette page se fermera automatiquement dans quelque secondes. <script>setTimeout(function() { window.close(); }, 30000);</script></body></html>"
      )
  }

  return [verify]
}
