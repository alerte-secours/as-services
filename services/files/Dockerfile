# syntax = devthefuture/dockerfile-x

FROM ./dockerfile-x/node AS build
ENV NODE_ENV=production

# fetch
COPY --chown=1000:1000 yarn.lock .yarnrc.yml ./
COPY --chown=1000:1000 .yarn .yarn
RUN yarn fetch workspaces focus @as/files

# copy
COPY --chown=1000:1000 libs libs
COPY --chown=1000:1000 services/files/package.json services/files/package.json
COPY --chown=1000:1000 services/files/src services/files/src

# build
RUN yarn workspaces foreach -A -t run postinstall
RUN yarn workspace @as/files build

# clean
RUN yarn workspaces focus --production @as/files && yarn cache clean --all

FROM ./dockerfile-x/node
ENV NODE_ENV=production
CMD ["node","/app/dist/index.js","start"]
COPY --from=build /app/services/files/dist/ /app/dist/

LABEL project="alertesecours"