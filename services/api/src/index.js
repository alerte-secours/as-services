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
      context: (ctx) => {
        ctx.set("customConfig", customConfig)
      },
    },
    oa: {
      pluginName: "oa",
      dependencies: {
        sentry: {},
        postgres: {},
        amqp: {},
        redisQueueDedup: {
          pluginName: "ioredis",
          context: (ctx) => {
            ctx.set("config", {
              ...ctx.get("config"),
              redis: {
                host: process.env.REDIS_QUEUE_DEDUP_HOST,
                port: process.env.REDIS_QUEUE_DEDUP_PORT || "6379",
                username: process.env.REDIS_QUEUE_DEDUP_USERNAME || "default",
                password: process.env.REDIS_QUEUE_DEDUP_PASSWORD,
                db: process.env.REDIS_QUEUE_DEDUP_DB || "0",
              },
            })
          },
        },
        redisHotGeodata: {
          pluginName: "ioredis",
          context: (ctx) => {
            ctx.set("config", {
              ...ctx.get("config"),
              redis: {
                host: process.env.REDIS_HOT_GEODATA_HOST,
                port: process.env.REDIS_HOT_GEODATA_PORT || "6379",
                username: process.env.REDIS_HOT_GEODATA_USERNAME || "default",
                password: process.env.REDIS_HOT_GEODATA_PASSWORD,
                db: process.env.REDIS_HOT_GEODATA_DB || "0",
              },
            })
          },
        },
      },
      buildParams: {
        apiPath: "api",
        sharedApiPath: "../../../libs/common/oapi",
      },
    },
  },
  dependencies: {
    // amqp: {},
    oapi: {
      pluginName: "microservice-oapi",
      dependencies: {
        oaGraphql: {
          pluginName: "oa-graphql",
        },
        hasura: {
          pluginName: "hasura",
        },
      },
    },
  },
})
