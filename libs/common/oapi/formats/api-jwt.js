module.exports = function () {
  function validate(str) {
    const parts = str.split(".")

    if (parts.length !== 3) {
      return false
    }

    return parts.every((part) => {
      try {
        const decoded = Buffer.from(part, "base64url").toString("utf-8")
        return decoded.length > 0
      } catch {
        return false
      }
    })
  }

  return {
    type: "string",
    validate,
  }
}
