function validateEmail(email) {
  // Regular expression to validate the email format
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // Test the email against the regular expression
  return regex.test(email)
}

module.exports = function () {
  return {
    type: "string",
    validate: validateEmail,
  }
}
