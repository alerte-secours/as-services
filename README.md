# Alerte-Secours - Le Réflexe qui Sauve

Alerte-Secours is a microservices-based emergency alert and response system designed to provide rapid assistance in emergency situations.

## Official Website

Visit our official website at [alerte-secours.fr](https://alerte-secours.fr)

## Development Quick Start

### Requirements

- Docker
- Direnv
- Node.js (>=20)
- Yarn (v4.6.0+)

### Installation

1. Clone the repository:
```sh
git clone https://codeberg.org/alerte-secours/alerte-secours
cd alerte-secours
```

2. Install dependencies:
```sh
yarn
```

3. Set up environment variables:
```sh
cp .env.default .env
```

### Start Services

Start all services with:
```sh
yarn dev:up
```

View logs:
```sh
yarn dev:logs
```

### Public Staging Environment

For development and testing, you can use our public staging environment:

- API: https://api-staging.alerte-secours.fr
- GraphQL: https://graphql-staging.alerte-secours.fr
- Web Interface: https://web-staging.alerte-secours.fr

### Endpoints (Local Development)

#### Services
- API: http://localhost:4200
- Files: http://localhost:4292
- Hasura: http://localhost:4201
- Tasks Service
- Watchers Service
- Web: http://localhost:4203

#### Consoles
- [Hasura Console](http://localhost:4295)
- [Minio Console](http://localhost:4291)
- [API Swagger](http://localhost:4200/api/v1/swagger/)
- [API GraphQL](http://localhost:4200/api/v1/graphql)
- [Files API](http://localhost:4292/api/v1/swagger/)

#### API URLs
- `/api/v1`
  - `/spec` - API Specification
  - `/oas` - OpenAPI Service
  - `/swagger` - Swagger Documentation
  - `/graphql` - GraphQL Endpoint
- `/status` - Service Status
- `/` - Root Endpoint

## Technical Stack

### Backend
- **Node.js** (>=20) - Core runtime
- **PostgreSQL** - Primary database
- **Redis** - Caching and queue deduplication
- **RabbitMQ** - Message queue
- **Hasura** - GraphQL engine
- **OpenAPI** - API specification and documentation
- **Modjo Framework** - Microservices architecture

### Frontend
- **React** - Web interface
- **React Native** - Mobile application
- **Apollo Client** - GraphQL integration
- **MapView** - Geolocation visualization

### Infrastructure
- **Docker** - Containerization
- **Microservices Architecture** - Separate services for API, files, tasks, etc.
- **CQRS Pattern** - Command Query Responsibility Segregation
- **Event-Driven Architecture** - Using message queues

### Key Features
- Real-time alerts and notifications
- Geolocation tracking and mapping
- Emergency services integration
- User authentication and authorization
- File storage and management
- Background task processing

## Project Structure

```
services/
├── api/          # Main API service
├── app/          # Frontend application
├── files/        # File handling service
├── hasura/       # GraphQL engine
├── tasks/        # Background task processing
├── watchers/     # Event monitoring
└── web/          # Web interface

libs/
├── common/       # Shared utilities
├── postgres-types/ # Database type definitions
├── redis-queue-dedup/ # Redis queue deduplication
└── utils/        # General utilities
```

## Licensing

Alerte-Secours is licensed under the **DevTheFuture Ethical Use License (DEF License)**.

Key points:
- **Nonprofit Use**: Free for nonprofit purposes
- **Profit Use**: Requires a paid license
- **Personal Data**: Must not be monetized or exploited
- **Ownership**: All intellectual property rights remain with the licensor
- **Competitor Restriction**: Competitors must obtain explicit permission

For full license details, see [LICENSE.md](LICENSE.md).

## Contributing

We welcome contributions to Alerte-Secours. Please read our contribution guidelines before submitting pull requests.

## Support

For support, please open an issue on our [Codeberg issue tracker](https://codeberg.org/alerte-secours/alerte-secours/-/issues) or [GitHub issue tracker](https://github.com/alerte-secours/alerte-secours/issues).
