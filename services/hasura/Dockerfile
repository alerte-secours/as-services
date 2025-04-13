# syntax = devthefuture/dockerfile-x

ARG HASURA_VERSION=v2.40.0.cli-migrations-v3
FROM hasura/graphql-engine:$HASURA_VERSION

ENV HASURA_GRAPHQL_CONSOLE_ASSETS_DIR=/srv/console-assets
ENV HASURA_GRAPHQL_ENABLE_TELEMETRY=false
ENV HASURA_GRAPHQL_INFER_FUNCTION_PERMISSIONS=false
ENV HASURA_GRAPHQL_MIGRATIONS_SERVER_TIMEOUT=180
ENV HASURA_GRAPHQL_SHOW_UPDATE_NOTIFICATION=false
ENV HASURA_GRAPHQL_SERVER_PORT=8080


COPY services/hasura/bin/ /bin/

ENTRYPOINT ["/bin/entrypoint.sh"]
CMD ["graphql-engine", "serve"]

COPY services/hasura/metadata /hasura-metadata
COPY services/hasura/migrations /hasura-migrations

USER 1001

LABEL project="alertesecours"