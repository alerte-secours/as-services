ARG HASURA_VERSION=v2.40.0.cli-migrations-v3
FROM hasura/graphql-engine:$HASURA_VERSION


ENV HASURA_VERSION=$HASURA_VERSION
ENV HASURA_GRAPHQL_ENABLE_TELEMETRY=false
ENV HASURA_GRAPHQL_CONSOLE_ASSETS_DIR=/srv/console-assets

RUN ln -s /bin/hasura-cli /bin/hasura

RUN apt-get update && apt-get install -y \
    netcat \
    socat \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1000 hasura-console \
    && useradd --uid 1000 --gid hasura-console --shell /bin/bash --create-home hasura-console

COPY services/hasura/console/start.sh /bin/
COPY services/hasura/bin/wait-for /bin/

RUN mkdir -p /hasura && chown hasura-console:hasura-console /hasura
WORKDIR /hasura
USER hasura-console
ENTRYPOINT []
CMD [ "/bin/start.sh" ]

LABEL project="alertesecours"