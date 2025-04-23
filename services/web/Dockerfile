# syntax = devthefuture/dockerfile-x
FROM ./dockerfile-x/node AS build
ENV NODE_ENV=production

# fetch
COPY --chown=1000:1000 yarn.lock .yarnrc.yml ./
COPY --chown=1000:1000 .yarn .yarn
RUN yarn fetch workspaces focus @as/web

# copy
COPY --chown=1000:1000 services/web/package.json services/web/package.json
COPY --chown=1000:1000 services/web/src services/web/src
COPY --chown=1000:1000 services/web/public services/web/public

# build
RUN yarn workspaces foreach -A -t run postinstall
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN yarn workspace @as/web build

# clean
RUN yarn workspaces focus --production @as/web && yarn cache clean --all

# server
FROM ./dockerfile-x/nginx
COPY --from=build /app/services/web/build /usr/share/nginx/html/

LABEL project="alertesecours"