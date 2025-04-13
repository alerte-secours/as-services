module.exports = function ({ services: { auth } }) {
  const headerPrefix = "Bearer "
  const headerPrefixLength = headerPrefix.length

  return async function bearerAuth(req, scopes, _schema) {
    const jwtoken = req.headers.authorization.slice(headerPrefixLength)
    return auth(jwtoken, scopes)
  }
}
