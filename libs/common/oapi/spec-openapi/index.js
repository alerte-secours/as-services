const createOptions = require("utils/schema/options")

const optionsSchema = createOptions({
  defaults: {
    protocol: "http",
    host: "0.0.0.0",
    port: 4000,
    path: "/",
  },
})

async function createApiSpecV1(options = {}) {
  optionsSchema(options)
  if (process.env.EXTERNAL_PROTOCOL) {
    options.protocol = process.env.EXTERNAL_PROTOCOL
  }
  if (process.env.EXTERNAL_HOST) {
    options.host = process.env.EXTERNAL_HOST
  }
  if (process.env.EXTERNAL_PORT) {
    options.port = process.env.EXTERNAL_PORT
  }

  const apiSpec = {
    openapi: "3.0.3",
    info: {
      title: "HelpMe Project API",
      version: "1.0.0",
      description: "HelpMe Project OpenAPI 3.",
      license: {
        name: "DEF",
        url: "https://devthefuture.org/DEF-LICENSE.md",
      },
      contact: {
        name: "Jo",
        email: "jo@devthefuture.org",
        // url: "https://",
      },
    },
    servers: [
      {
        // description: "Server",
        url: `${options.protocol}://${options.host}:${options.port}${options.path}`,
      },
    ],
    components: {
      schemas: {},
    },
    paths: {},
    "x-security-sets": {
      auth: ["bearerAuth", "cookieAuth"],
    },
  }
  return apiSpec
}

module.exports = createApiSpecV1
