FROM nginxinc/nginx-unprivileged:1.25-alpine@sha256:557e9af4afa7a36462e313906fe42fba39c307ae2a72d5323d49963eb2883b45

COPY --chown=nginx:nginx dockerfile-x/nginx /etc/nginx/