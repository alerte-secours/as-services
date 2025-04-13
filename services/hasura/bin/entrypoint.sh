#!/bin/sh
exec wait-for -t ${WAITFOR_TIMEOUT:-30} ${API_HOST:-api}:${API_PORT:-4200} -- docker-entrypoint.sh $@