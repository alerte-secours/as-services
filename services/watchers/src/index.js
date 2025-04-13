global.modjoSentryConfig = {
  package: require("../package.json"),
  options: {},
}
require("common/sentry/instrument")

const modjo = require("@modjo/core")
// const { ctx } = modjo

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
      pluginName: "microservice-watcher",
      dependencies: {
        postgres: {},
        sentry: {},
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
        keydbColdGeodata: {
          pluginName: "ioredis",
          context: (ctx) => {
            ctx.set("config", {
              ...ctx.get("config"),
              redis: {
                host: process.env.KEYDB_COLD_GEODATA_HOST,
                port: process.env.KEYDB_COLD_GEODATA_PORT || "6379",
                username: process.env.KEYDB_COLD_GEODATA_USERNAME || "default",
                password: process.env.KEYDB_COLD_GEODATA_PASSWORD,
                db: process.env.KEYDB_COLD_GEODATA_DB || "0",
              },
            })
          },
        },
      },
    },
  },
})
