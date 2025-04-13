# Alerte Secours - Modjo Implementation Guide

## Project Overview

Alerte Secours is a microservices-based application that leverages the Modjo framework for:
- API service management
- Database integration (PostgreSQL)
- Message queue handling (AMQP)
- Redis-based caching and queue deduplication
- OpenAPI and GraphQL integration
- Monitoring and error tracking (Sentry)

## Integration Details

### API Service Structure

The API service follows a well-organized structure that implements OpenAPI specifications and REST endpoints:

```
services/api/src/
├── api/
│   └── v1/
│       ├── formats/           # Custom format definitions
│       ├── operations/        # API endpoint implementations
│       │   ├── alert/        # Alert-related operations
│       │   ├── auth/         # Authentication operations
│       │   ├── external/     # External service integrations
│       │   ├── geoloc/       # Geolocation operations
│       │   ├── info/         # Information endpoints
│       │   └── user/         # User management
│       ├── security/         # Security implementations
│       ├── services/         # Shared services
│       ├── spec-openapi/     # OpenAPI specifications
│       └── validators/       # Input validation
└── tasks/                    # Background task definitions
```

#### Key Implementation Patterns

1. **Operation Structure**
Each API operation follows a consistent pattern:
```javascript
module.exports = function() {
  // Dependency injection through context
  const sql = ctx.require("postgres")
  const redis = ctx.require("redisHotGeodata")
  
  // Operation implementation
  async function doOperation(req) {
    // Implementation
  }
  
  return [doOperation]
}
```

2. **Authentication Flow**
```javascript
// Example from auth/login/token.patch.js
async function doAuthLoginToken(req) {
  const { authTokenJwt } = req.body
  // JWT-based authentication with Hasura claims
  const hasuraClaim = {
    "x-hasura-default-role": defaultRole,
    "x-hasura-allowed-roles": roles,
    "x-hasura-user-id": userId.toString()
  }
  // Token generation with expiration
  const jwtData = {
    [claimsNamespace]: hasuraClaim,
    exp: Math.round(new Date(Date.now() + jwtExpirationInHours * 3600000) / 1000)
  }
  return { userBearerJwt: await signJwt(jwtData) }
}
```

3. **API Schema Generation**

The project implements automatic OpenAPI and GraphQL schema generation based on the API service structure:

#### File Structure Convention
```
services/api/src/api/v1/
├── operations/                 # API endpoints
│   ├── alert/
│   │   ├── send-alert.patch.js       # Implementation
│   │   └── send-alert.patch.spec.yaml # OpenAPI spec
│   └── auth/
│       ├── login/
│       │   ├── token.patch.js
│       │   └── token.patch.spec.yaml
├── formats/                   # Custom format definitions
├── security/                  # Security schemes
├── services/                  # Shared services
└── validators/               # Input validation
```

#### OpenAPI Generation
- The Modjo OA plugin automatically compiles the API specification from the directory structure
- Each endpoint implementation (.js) has an adjacent specification file (.yaml)
- The plugin merges all specs into a single OpenAPI document
- Swagger UI is automatically generated and served at `/swagger`

#### GraphQL Schema Generation

The project automatically generates GraphQL schemas through two mechanisms:

1. **Hasura Database Schema**
Following strict naming conventions for database operations:

1. **Hasura Table Operations**
```graphql
# Automatically generated from database tables
selectMany${Table}     # Select operations
selectOne${Table}      # Select by primary key
insertOne${Table}      # Insert single record
updateMany${Table}     # Bulk updates
deleteOne${Table}      # Delete by primary key
```

2. **API Remote Schema**
```graphql
# Generated from REST endpoints
${DataName}.post.js    -> addOne${DataName}
${DataName}.get.js     -> getOne${DataName}
${DataName}.put.js     -> setOne${DataName}
${DataName}.delete.js  -> delOne${DataName}
```

3. **Real-time Subscriptions**
```graphql
# WebSocket channels
${DataName}.chan/index.sub.js -> subMany${ChannelName}
${DataName}.chan/{id}.sub.js  -> subOne${ChannelName}
```

4. **OpenAPI to GraphQL Conversion**
The Modjo OA-GraphQL plugin automatically converts OpenAPI specifications to GraphQL schemas:

```javascript
// OpenAPI to GraphQL conversion configuration
const { schema } = await createGraphQLSchema(apiSpec, {
  createSubscriptionsFromCallbacks: true,
  baseUrl: `http://${host}:${port}/api/v1/oas`,
  operationIdFieldNames: true,
  fillEmptyResponses: true,
  simpleEnumValues: true,
  headers: (_method, _operationPath, _title, _resolverParams) => ({
    ...omit(req.headers, omitHeaders),
    "x-origin": "GraphQL",
    connection: "close",
  })
})
```

Key features of the conversion:
- Automatic type generation from OpenAPI schemas
- REST endpoints mapped to GraphQL queries/mutations
- WebSocket callbacks converted to subscriptions
- Preserved security context and headers
- GraphQL Playground integration

5. **Relations and Types**
```graphql
# Auto-generated relationship fields
oneTableAsLinkName     # One-to-one named relations
manyTableAsForeignKey  # One-to-many by foreign key

# Auto-generated types from OpenAPI schemas
type Alert {
  id: ID!
  level: AlertLevel!
  location: Point!
  # Fields from OpenAPI schema
}

input AlertSendAlertInput {
  callEmergency: Boolean
  notifyAround: Boolean
  # Fields from OpenAPI request body
}
```

#### Implementation Example

1. **REST Endpoint Implementation**
```javascript
// alert/send-alert.patch.js
module.exports = function() {
  const sql = ctx.require("postgres")
  
  async function doAlertSendAlert(req) {
    // Implementation
  }
  return [doAlertSendAlert]
}
```

2. **OpenAPI Specification**
```yaml
# alert/send-alert.patch.spec.yaml
x-security:
  - auth: ["user"]
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        properties:
          callEmergency:
            type: boolean
          notifyAround:
            type: boolean
          notifyRelatives:
            type: boolean
          uuid:
            type: string
            format: uuid
          level:
            enum: [red, yellow, green]
          subject:
            type: string
          location:
            type: object
            properties:
              type:
                enum: [Point]
              coordinates:
                type: array
                format: location
                items:
                  type: number
        required:
          - level
          - uuid
responses:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            alertId:
              type: integer
            accessCode:
              type: string
            code:
              type: string
```

The OpenAPI specification is automatically generated from these YAML files and exposed through:

```javascript
// spec-openapi/index.js
const apiSpec = {
  openapi: "3.0.3",
  info: {
    title: "HelpMe Project API",
    version: "1.0.0"
  },
  components: {
    schemas: {},
  },
  paths: {},
  "x-security-sets": {
    auth: ["bearerAuth", "cookieAuth"]
  }
}
```

### Core Service Structure

The project implements Modjo's microservices architecture across several services:

```
services/
├── api/          # Main API service
├── app/          # Frontend application
├── backoffice/   # Admin interface
├── files/        # File handling service
├── hasura/       # GraphQL engine
├── tasks/        # Background task processing
├── watchers/     # Event monitoring
└── web/          # Web interface
```

### Modjo Configuration

The main API service configuration demonstrates core Modjo integration:

```javascript
modjo({
  plugins: {
    config: {
      context: (ctx) => {
        ctx.set("customConfig", customConfig)
      }
    },
    oa: {
      pluginName: "oa",
      dependencies: {
        sentry: {},
        postgres: {},
        amqp: {},
        redisQueueDedup: {
          pluginName: "ioredis",
          // Redis configuration
        },
        redisHotGeodata: {
          pluginName: "ioredis",
          // Geodata cache configuration
        }
      }
    }
  },
  dependencies: {
    oapi: {
      pluginName: "microservice-oapi",
      dependencies: {
        oaGraphql: {
          pluginName: "oa-graphql"
        },
        hasura: {
          pluginName: "hasura"
        }
      }
    }
  }
})
```

### Frontend Integration

The React Native frontend application (`/lab/alerte-secours/as-app/src`) implements a comprehensive GraphQL integration:

```
src/
├── gql/              # GraphQL core definitions
│   ├── mutations/    # Mutation operations
│   └── queries/      # Query operations
├── scenes/           # Feature-specific components with GraphQL operations
├── hooks/            # Custom Apollo hooks
└── containers/       # Reusable GraphQL-aware components
```

#### Key GraphQL Patterns

1. **Real-time Subscriptions**
```javascript
// Alert subscription example
export const ALERTING_SUBSCRIPTION = gql`
  subscription alertingSubscription($cursor: bigint!) {
    alerting(where: { id: { _gt: $cursor } }) {
      id
      alert_id
      user_id
      device_id
    }
  }
`;
```

2. **Authentication Mutations**
```javascript
// Login mutation
export const LOGIN_USER_TOKEN_MUTATION = gql`
  mutation loginUserToken($authTokenJwt: String!) {
    userBearerJwt: doAuthLoginToken(authTokenJwt: $authTokenJwt) {
      userBearerJwt
    }
  }
`;
```

3. **Alert Operations**
```javascript
// Send alert mutation
export const SEND_ALERT_MUTATION = gql`
  mutation sendAlert($alertSendAlertInput: AlertSendAlertInput!) {
    alertId: doAlertSendAlert(alertSendAlertInput: $alertSendAlertInput) {
      alertId
      code
      accessCode
    }
  }
`;
```

4. **Custom Apollo Hooks**
```javascript
// Error handling hook
function useMutationWithError(...args) {
  const [action, ...res] = useMutation(...args);
  return [withError(action), ...res];
}
```

5. **Real-time Message System**
```javascript
// Message subscription
export const SELECT_STREAM_MESSAGES_SUBSCRIPTION = gql`
  subscription selectStreamMessageSubscription($cursor: Int) {
    message(where: { id: { _gt: $cursor } }) {
      id
      content
      created_at
      user_id
    }
  }
`;
```

#### Integration Features

1. **Real-time Updates**
- WebSocket-based subscriptions for alerts
- Live message streaming
- Location updates

2. **Authentication Flow**
- JWT-based authentication
- Token refresh handling
- Role-based access control

3. **Geolocation Features**
- Real-time location tracking
- Geocoding integration
- What3Words integration

4. **Offline Support**
- Apollo cache management
- Optimistic updates
- Error handling and retry logic

## Code Examples

### 1. Alert Operation Implementation
```javascript
// Alert sending implementation
async function doAlertSendAlert(req) {
  const { deviceId, userId } = reqCtx.get("session")
  
  // Database transaction
  await sql.begin(async () => {
    // Insert alert record
    const [{ id }] = await sql`
      INSERT INTO "alert" (...)
      VALUES (...)
      RETURNING id
    `
    // Create alerting record
    await sql`
      INSERT INTO "alerting" (...)
      VALUES (...)
    `
  })
  
  // Parallel task execution
  await async.parallel([
    // Redis geolocation indexing
    async () => redis.geoadd("alert", longitude, latitude, alertId),
    // Background tasks
    async () => notifyAround && addTask(tasks.GEOCODE_ALERT, {...}),
    async () => notifyRelatives && addTask(tasks.RELATIVE_ALERT, {...})
  ])
}
```

### 2. Redis Integration

The project uses Redis for two distinct purposes:

1. Queue Deduplication:
```javascript
redisQueueDedup: {
  pluginName: "ioredis",
  context: (ctx) => {
    ctx.set("config", {
      redis: {
        host: process.env.REDIS_QUEUE_DEDUP_HOST,
        port: process.env.REDIS_QUEUE_DEDUP_PORT || "6379",
        username: process.env.REDIS_QUEUE_DEDUP_USERNAME || "default",
        password: process.env.REDIS_QUEUE_DEDUP_PASSWORD,
        db: process.env.REDIS_QUEUE_DEDUP_DB || "0"
      }
    })
  }
}
```

2. Hot Geodata Caching:
```javascript
redisHotGeodata: {
  pluginName: "ioredis",
  context: (ctx) => {
    ctx.set("config", {
      redis: {
        host: process.env.REDIS_HOT_GEODATA_HOST,
        port: process.env.REDIS_HOT_GEODATA_PORT || "6379",
        username: process.env.REDIS_HOT_GEODATA_USERNAME || "default",
        password: process.env.REDIS_HOT_GEODATA_PASSWORD,
        db: process.env.REDIS_HOT_GEODATA_DB || "0"
      }
    })
  }
}
```

### 2. API Integration

The project uses Modjo's OpenAPI (oa) plugin with GraphQL support:

```javascript
oapi: {
  pluginName: "microservice-oapi",
  dependencies: {
    oaGraphql: {
      pluginName: "oa-graphql"
    },
    hasura: {
      pluginName: "hasura"
    }
  }
}
```

## Specific Customizations

### 1. Error Tracking Configuration

Custom Sentry configuration for error tracking:

```javascript
global.modjoSentryConfig = {
  package: require("../package.json"),
  options: {}
}
require("common/sentry/instrument")
```

### 2. CQRS Implementation

The project implements CQRS with eventual consistency:
- Tasks and requests are made idempotent
- Event-driven architecture using AMQP
- Separate services for commands and queries
- Eventual consistency handled through message queues

## Common Issues & Troubleshooting

### 1. Redis Connection Issues

Problem: Redis connection failures
Solution:
- Verify environment variables are properly set
- Check Redis server availability
- Confirm network connectivity between services
- Validate authentication credentials

### 2. GraphQL Integration

Problem: GraphQL schema synchronization issues
Solution:
- Ensure Hasura metadata is up to date
- Verify PostgreSQL connection
- Check GraphQL endpoint configuration
- Review schema changes in version control

### 3. Message Queue Deduplication

Problem: Duplicate message processing
Solution:
- Verify Redis deduplication configuration
- Check message IDs are unique
- Ensure proper queue configuration
- Monitor Redis memory usage

### 4. Microservices Communication

Problem: Inter-service communication failures
Solution:
- Check service discovery configuration
- Verify network connectivity
- Ensure proper authentication between services
- Monitor service health endpoints
