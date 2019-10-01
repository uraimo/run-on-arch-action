#!/bin/bash

ARCH=$1
DISTRO=$2
COMMANDS=$3
COMMANDS="${COMMANDS//[$'\t\r\n']/;}" #Replace newline with ;

# Install support for new archs via qemu
# Platforms: linux/amd64, linux/arm64, linux/riscv64, linux/ppc64le, linux/s390x, linux/386, linux/arm/v7, linux/arm/v6
sudo apt update -y && sudo apt install -y qemu qemu-user-static

# Symbolic link for the action repository location
ln -s /home/runner/work/_actions/uraimo/run-on-arch-action/${GITHUB_REF##*/}/ multi-act

docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
docker build . --file multi-act/Dockerfiles/Dockerfile.$ARCH.$DISTRO --tag multiarchimage 

docker run --workdir /github/workspace --rm -e HOME -e GITHUB_REF -e GITHUB_SHA -e GITHUB_REPOSITORY -e GITHUB_ACTOR -e GITHUB_WORKFLOW -e GITHUB_HEAD_REF -e GITHUB_BASE_REF -e GITHUB_EVENT_NAME -e GITHUB_WORKSPACE -e GITHUB_ACTION -e GITHUB_EVENT_PATH -e RUNNER_OS -e RUNNER_TOOL_CACHE -e RUNNER_TEMP -e RUNNER_WORKSPACE -v "/var/run/docker.sock":"/var/run/docker.sock" -v "/home/runner/work/_temp/_github_home":"/github/home" -v "/home/runner/work/_temp/_github_workflow":"/github/workflow" -v "${PWD}":"/github/workspace" -t multiarchimage /bin/bash -c "$COMMANDS"
