#!/usr/bin/env sh

echo "set \$ready_response 'Not Ready';" > /etc/nginx/conf.d/ready_response.conf
nginx -s reload

WAIT_TIME=30
if [ "$1" ]; then
  WAIT_TIME="$1"
fi

for i in $(seq 1 $WAIT_TIME); do
  if [ "$(nginx -s status | grep 'Active connections' | awk '{print $3}')" -eq "0" ]; then
    exit 0
  fi
  sleep 1
done

nginx -s stop

exit 0