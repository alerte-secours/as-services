global.modjoSentryConfig = {
  package: require("../package.json"),
  options: {},
}
require("common/sentry/instrument")

const modjo = require("@modjo/core")
// const { ctx } = modjo
const redisQueueDedupFactory = require("redis-queue-dedup")

const customConfig = require(`~/config`)

modjo({
  plugins: {
    config: {
      pluginName: "config",
      context: (ctx) => {
        ctx.set("customConfig", customConfig)
      },
    },
  },
  dependencies: {
    microservice: {
      pluginName: "microservice-worker",
      context: (ctx) => {
        const config = ctx.require("config")
        ctx.set("config", {
          ...config,
          microserviceWorker: {
            ...(config.microserviceWorker || {}),
            factoryPlugins: {
              redisQueueDedup: {
                enabled: true,
                factory: redisQueueDedupFactory,
                options: {},
              },
            },
          },
        })
      },
      dependencies: {
        sentry: {},
        smtp: {
          pluginName: "smtp",
        },
        firebaseAdmin: {
          pluginName: "firebase-admin",
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
        kvrocksColdGeodata: {
          pluginName: "ioredis",
          context: (ctx) => {
            ctx.set("config", {
              ...ctx.get("config"),
              redis: {
                host: process.env.KVROCKS_COLD_GEODATA_HOST,
                port: process.env.KVROCKS_COLD_GEODATA_PORT || "6666",
                username:
                  process.env.KVROCKS_COLD_GEODATA_USERNAME || "default",
                password: process.env.KVROCKS_COLD_GEODATA_PASSWORD,
                db: process.env.KVROCKS_COLD_GEODATA_DB || "0",
              },
            })
          },
        },
      },
    },
  },
})
