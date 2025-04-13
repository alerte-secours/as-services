# syntax = devthefuture/dockerfile-x

# renovate: datasource=docker depName=ubuntu versioning=ubuntu
# ARG UBUNTU_VERSION=22.04
ARG UBUNTU_VERSION=22.04@sha256:56887c5194fddd8db7e36ced1c16b3569d89f74c801dc8a5adbf48236fb34564
FROM ubuntu:$UBUNTU_VERSION

RUN groupadd -g 1000 ubuntu && useradd -rm -d /home/ubuntu -s /bin/bash -g ubuntu -G sudo -u 1000 ubuntu
ENV HOME=/home/ubuntu
RUN chmod 0777 /home/ubuntu

RUN mkdir /app && chown 1000:1000 /app