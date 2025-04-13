# syntax = devthefuture/dockerfile-x

FROM ./dockerfile-x/node AS build
ENV NODE_ENV=production

# fetch
COPY --chown=1000:1000 .yarnrc.yml ./
COPY --chown=1000:1000 yarn.lock.prod ./yarn.lock
COPY --chown=1000:1000 .yarn .yarn
RUN yarn fetch workspaces focus @as/watchers

# copy
COPY --chown=1000:1000 libs libs
COPY --chown=1000:1000 services/watchers/package.json services/watchers/package.json
COPY --chown=1000:1000 services/watchers/src services/watchers/src

# build
RUN yarn workspaces foreach -A -t run postinstall
RUN yarn workspace @as/watchers build

# clean
RUN yarn workspaces focus --production @as/watchers && yarn cache clean --all

FROM ./dockerfile-x/node
ENV NODE_ENV=production
CMD ["node","/app/dist/index.js","start"]
COPY --from=build /app/services/watchers/dist/ /app/dist/

LABEL project="alertesecours"