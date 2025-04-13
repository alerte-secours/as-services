global.modjoSentryConfig = {
  ...(global.modjoSentryConfig || {}),
  options: {
    ...(global.modjoSentryConfig.options || {}),
    //
  },
}
require("@modjo/sentry")
