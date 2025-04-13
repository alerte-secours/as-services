const toInteger = require("lodash.tointeger")

const postgresTypes = require("@as/postgres-types")

const apolloCache = require("./apolloCache")

module.exports = async function createConfig({ env = process.env } = {}) {
  const host = env.HOST || "0.0.0.0"
  const port = env.PORT || "4000"

  const postgresExternal = process.env.POSTGRES_EXTERNAL

  const config = {
    logger: {
      level: env.LOGLEVEL || "info",
    },
    host,
    port,
    pgURL: env.DATABASE_URL,
    pgMaximumPoolSize: toInteger(env.PG_MAXIMUM_POOL_SIZE) || 10,
    hasura: {
      dsn: env.HASURA_GRAPHQL_URL,
      adminSecret: env.HASURA_GRAPHQL_ADMIN_SECRET,
    },
    apolloClient: {
      dsn: env.HASURA_GRAPHQL_URL,
      headers: {
        "X-Hasura-Admin-Secret": env.HASURA_GRAPHQL_ADMIN_SECRET,
        "X-Hasura-Use-Backend-Only-Permissions": "true",
      },
      cache: apolloCache,
    },
    amqp: {
      url: env.AMQP_URL,
    },
    postgres: {
      dsn: env.DATABASE_URL,
      max: toInteger(env.PG_MAXIMUM_POOL_SIZE) || 10,
      types: await postgresTypes(),
      ssl: !!postgresExternal,
    },
  }

  return config
}
