# syntax = devthefuture/dockerfile-x

FROM ./dockerfile-x/node AS build
ENV NODE_ENV=production

# fetch
COPY --chown=1000:1000 yarn.lock .yarnrc.yml ./
COPY --chown=1000:1000 .yarn .yarn
RUN yarn fetch workspaces focus @as/tasks

# copy
COPY --chown=1000:1000 libs libs
COPY --chown=1000:1000 services/tasks/package.json services/tasks/package.json
COPY --chown=1000:1000 services/tasks/src services/tasks/src

# build
RUN yarn workspaces foreach -A -t run postinstall
RUN yarn workspace @as/tasks build

# clean
RUN yarn workspaces focus --production @as/tasks && yarn cache clean --all

FROM ./dockerfile-x/node
ENV NODE_ENV=production
CMD ["node","/app/dist/index.js","start"]
COPY --from=build /app/services/tasks/dist/ /app/dist/

LABEL project="alertesecours"