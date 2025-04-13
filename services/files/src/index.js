global.modjoSentryConfig = {
  package: require("../package.json"),
  options: {},
}
require("common/sentry/instrument")

const modjo = require("@modjo/core")

const customConfig = require(`~/config`)

modjo({
  plugins: {
    // app: "express",
    config: {
      pluginName: "config",
      context: (ctx) => {
        ctx.set("customConfig", customConfig)
      },
    },
    oa: {
      pluginName: "oa",
      dependencies: {
        postgres: {},
        amqp: {},
        minio: {},
        sentry: {},
      },
      buildParams: {
        apiPath: "api",
        sharedApiPath: "../../../libs/common/oapi",
      },
    },
  },
  dependencies: {
    oapi: {
      pluginName: "microservice-oapi",
      dependencies: {},
    },
  },
})
