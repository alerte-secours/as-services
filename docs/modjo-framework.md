# Modjo Framework Documentation

## Overview

Modjo is a Rapid Application Development (RAD) framework for Node.js that emphasizes:
- Full Inversion of Control (IoC) through dependency injection
- CQRS (Command Query Responsibility Segregation) architecture
- Pure NodeJS implementation without transpilation
- Microservices-oriented design
- Plugin-based extensibility

## Key Features & Core Concepts

### 1. Dependency Injection System
- Uses composition root design pattern
- Avoids prop drilling through context management
- Implements async thread-based context using `nctx`
- Supports hierarchical dependency trees

### 2. Plugin Architecture
- Modular design with official, contrib, and local plugins
- Plugin discovery system with multiple lookup paths:
  - Local project plugins (`src/plugins`)
  - Official plugins (`@modjo/*`)
  - Community plugins (`modjo-plugins-*`)
- Plugin inheritance and composition

### 3. Microservices Support
- Built-in microservices architecture support:
  - App service
  - Watcher service
  - Worker service
- CQRS implementation for scalability
- Event-driven architecture capabilities

### 4. Context Management
- Async context tracking
- Thread-local storage implementation
- Hierarchical context inheritance
- Context isolation between services

## API Reference

### Core Module

#### `modjo(dependency)`
Main framework entry point.

Parameters:
- `dependency`: Object | Function | Array
  - Configuration object for the application
  - Can include plugins, dependencies, and lifecycle hooks

Example:
```javascript
const modjo = require("@modjo/core")

modjo({
  plugins: {
    config: {
      context: (ctx) => {
        ctx.set("customConfig", myConfig)
      }
    }
  },
  dependencies: {
    database: "postgres",
    cache: "ioredis"
  }
})
```

### Dependency Configuration

#### Structure
```javascript
{
  pluginName: string,      // Name of the plugin to use
  key: string,            // Unique identifier for the dependency
  create: Function,       // Factory function
  build: Function,        // Build-time setup
  ready: Function,        // Runtime initialization
  dependencies: Object,   // Nested dependencies
  context: Function,      // Context setup function
  params: Array|Object    // Parameters for create/build
}
```

### Plugin System

#### `getPlugin(name)`
Loads a plugin by name.

Parameters:
- `name`: string - Plugin identifier

Returns:
- Plugin module or throws if not found

## Usage & Best Practices

### 1. Dependency Configuration
```javascript
// Recommended structure
{
  plugins: {
    // Core plugins
    config: {
      context: (ctx) => {
        // Configure context
      }
    }
  },
  dependencies: {
    // Service dependencies
    database: "postgres",
    cache: {
      pluginName: "ioredis",
      context: (ctx) => {
        // Redis-specific configuration
      }
    }
  }
}
```

### 2. Context Usage
```javascript
const ctx = require("~/ctx")

// Setting context values
ctx.set("key", value)

// Getting context values
const value = ctx.get("key")

// Context inheritance
const childCtx = nctx.create(Symbol("child"))
childCtx.fallback(parentCtx)
```

### 3. Plugin Development
```javascript
// plugin/my-plugin/index.js
module.exports = {
  create: async () => {
    // Plugin initialization
    return instance
  },
  build: async () => {
    // Build-time setup
  },
  ready: async (instance) => {
    // Runtime initialization
  }
}
```

## Advanced Topics

### 1. CQRS Implementation
- Separate command and query responsibilities
- Event sourcing support
- Message queue integration
- Eventual consistency handling

### 2. Performance Optimization
- No transpilation overhead
- Efficient dependency resolution
- Lazy loading of plugins
- Context-based caching

### 3. Scaling Strategies
- Microservices decomposition
- Worker process management
- Queue-based task distribution
- State management across services

## Common Errors & Troubleshooting

### 1. Plugin Loading Issues
```
Error: required plugin not found: "plugin-name"
```
- Check plugin installation
- Verify plugin naming convention
- Check plugin path in project structure

### 2. Dependency Resolution
```
Error: Circular dependency detected
```
- Review dependency tree
- Break circular references
- Use context for shared state

### 3. Context Errors
```
Error: Context value not found: "key"
```
- Ensure context is properly initialized
- Check context hierarchy
- Verify context provider setup
