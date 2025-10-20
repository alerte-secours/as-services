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
            const redisConfig = {
              host: process.env.REDIS_HOT_GEODATA_HOST,
              port: process.env.REDIS_HOT_GEODATA_PORT || "6379",
              username: process.env.REDIS_HOT_GEODATA_USERNAME || "default",
              password: process.env.REDIS_HOT_GEODATA_PASSWORD,
              db: process.env.REDIS_HOT_GEODATA_DB || "0",
            }

            // Add Sentinel configuration if provided
            if (
              process.env.REDIS_HOT_GEODATA_SENTINELS &&
              process.env.REDIS_HOT_GEODATA_SENTINEL_MASTER
            ) {
              const sentinelEndpoints =
                process.env.REDIS_HOT_GEODATA_SENTINELS.split(",")
              redisConfig.sentinel = {
                sentinels: sentinelEndpoints.map((endpoint) => {
                  const [host, port] = endpoint.trim().split(":")
                  return { host, port: parseInt(port, 10) || 26379 }
                }),
                name: process.env.REDIS_HOT_GEODATA_SENTINEL_MASTER,
              }
            }

            ctx.set("config", {
              ...ctx.get("config"),
              redis: redisConfig,
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
