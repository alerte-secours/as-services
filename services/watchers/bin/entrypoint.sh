#!/bin/sh

HASURA_TCP="$(echo ${HASURA_GRAPHQL_URL/} | cut -d/ -f3)"

exec wait-for -t ${WAITFOR_TIMEOUT:-30} \
  ${AMQP_HOST:-rabbitmq}:${AMQP_PORT:-5672} \
  ${HASURA_TCP:-"hasura:8080"} \
  -- "$@"