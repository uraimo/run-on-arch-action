#!/bin/bash

sudo apt update -y && sudo apt install -y qemu qemu-user-static
# Install support for new archs via qemu
# Platforms: linux/amd64, linux/arm64, linux/riscv64, linux/ppc64le, linux/s390x, linux/386, linux/arm/v7, linux/arm/v6
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
