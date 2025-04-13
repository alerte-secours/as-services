# syntax = devthefuture/dockerfile-x

FROM ./dockerfile-x/node AS build
ENV NODE_ENV=production

# fetch
COPY --chown=1000:1000 .yarnrc.yml ./
COPY --chown=1000:1000 yarn.lock.prod ./yarn.lock
COPY --chown=1000:1000 .yarn .yarn
RUN yarn fetch workspaces focus @as/api

# copy
COPY --chown=1000:1000 libs libs
COPY --chown=1000:1000 services/api/package.json services/api/package.json
COPY --chown=1000:1000 services/api/src services/api/src

# build
RUN yarn workspaces foreach -A -t run postinstall
RUN yarn workspace @as/api build

# clean
RUN yarn workspaces focus --production @as/api && yarn cache clean --all

# server
FROM ./dockerfile-x/node
ENV NODE_ENV=production
CMD ["node","/app/dist/index.js","start"]
COPY --from=build /app/services/api/dist/ /app/dist/

LABEL project="alertesecours"