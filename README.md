# Alerte-Secours - Le Réflexe qui Sauve

## Dev

### Requirements

- docker
- tmux + tmuxp
- direnv

### Getting started

install
```sh
yarn
```

load tmux custom conf (optional)
```sh
tmux source-file .tmux.conf
```


### Start services

```sh
tmuxp load .
```

kill tmux session
```sh
tmux kill-session -t helpme-project || true
```

### Endpoints

#### services
- api 4200
- file 4292
- hasura 4201
- tasks
- watchers

#### consoles
- [hasura 4295](http://localhost:4295)
- [minio 4201](http://localhost:4201)
- [api 4200](http://0.0.0.0:4200/api/v1/swagger/)
- [api graphql 4200](http://0.0.0.0:4200/api/v1/graphql)
- [files 4200](http://0.0.0.0:4292/api/v1/swagger/)

#### oa url
- /api/v1
  - /spec
  - /oas
  - /swagger
  - /graphql
- /status
- /
