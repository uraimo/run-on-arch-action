#!/bin/bash

set -euo pipefail

# Args
DOCKERFILE=$1
CONTAINER_NAME=$2
# Remainder of args get passed to docker
declare -a DOCKER_RUN_ARGS=${@:3:${#@}}

# Defaults
ACTION_DIR="$(cd "$(dirname "$0")"/.. >/dev/null 2>&1 ; pwd -P)"
LOWERCASE_REPOSITORY=$(printf "%s" "$GITHUB_REPOSITORY" | tr '[:upper:]' '[:lower:]')
PACKAGE_REGISTRY="ghcr.io/${LOWERCASE_REPOSITORY}/${CONTAINER_NAME}"
DEBIAN_FRONTEND=noninteractive

show_build_log_and_exit () {
  # Show build-log.text output and exit if passed exit status != 0
  status=$1
  if [[ "$status" != 0 ]]
  then
    cat build-log.txt
    exit $status
  fi
}

quiet () {
  # Hide the output of some command, unless it fails.
  # If it fails, output is echoed and this script exits with the command's
  # exit status code.
  eval "$@" >> build-log.txt 2>&1 || show_build_log_and_exit $?
}

install_deps () {
  # Install support for non-x86 emulation in Docker via QEMU.
  # Platforms: linux/arm64, linux/riscv64, linux/ppc64le, linux/s390x,
  #            linux/386, linux/arm/v7, linux/arm/v6
  sudo apt-get update -q -y
  sudo apt-get -qq install -y qemu qemu-user-static
  docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
}

build_container () {
  # Build the container image.

  # If the GITHUB_TOKEN env var has a value, the container images will be
  # cached between builds.
  if [[ -z "${GITHUB_TOKEN:-}" ]]
  then
    docker build \
      "${ACTION_DIR}/Dockerfiles" \
      --file "$DOCKERFILE" \
      --tag "${CONTAINER_NAME}:latest"
  else
    # Build optimization that uses GitHub package registry to cache docker
    # images, based on Thai Pangsakulyanont's experiments.
    # Read about it: https://dev.to/dtinth/caching-docker-builds-in-github-actions-which-approach-is-the-fastest-a-research-18ei
    # Implementation is `build_with_gpr` here: https://github.com/dtinth/github-actions-docker-layer-caching-poc/blob/master/.github/workflows/dockerimage.yml
    # About GitHub package registry: https://docs.github.com/en/packages/publishing-and-managing-packages/about-github-packages#support-for-package-registries
    echo "GitHub token provided, caching to $PACKAGE_REGISTRY"

    # Login without echoing token, just in case
    BASH_FLAGS="$-"
    set +x
    echo "$GITHUB_TOKEN" | docker login ghcr.io \
      -u "$GITHUB_ACTOR" \
      --password-stdin
    set "$BASH_FLAGS"

    docker pull "$PACKAGE_REGISTRY:latest" || true
    docker build \
      "${ACTION_DIR}/Dockerfiles" \
      --file "$DOCKERFILE" \
      --tag "${CONTAINER_NAME}:latest" \
      --cache-from="$PACKAGE_REGISTRY"
    docker tag "${CONTAINER_NAME}:latest" "$PACKAGE_REGISTRY" \
      && docker push "$PACKAGE_REGISTRY" || true
  fi
}

run_container () {
  # Run the container.

  # Run user-provided setup script, in same shell
  source "${ACTION_DIR}/src/run-on-arch-setup.sh"

  # Interpolate DOCKER_RUN_ARGS, to support evaluation of $VAR references
  for i in "${!DOCKER_RUN_ARGS[@]}"
  do
    DOCKER_RUN_ARGS[$i]=$(eval echo "${DOCKER_RUN_ARGS[$i]}")
  done

  echo "**** X-1 ${ACTION_DIR}"
  chmod +x "${ACTION_DIR}/src/run-on-arch-commands.sh"
  ls -l "${ACTION_DIR}/src/run-on-arch-commands.sh"
  echo "**** X-2"

  # The location of the event.json file
  echo "**** X-3"
  EVENT_DIR=$(dirname "$GITHUB_EVENT_PATH")

  echo "**** X-4 $EVENT_DIR"
  docker run \
    --workdir "${GITHUB_WORKSPACE}" \
    --rm \
    -e DEBIAN_FRONTEND=noninteractive \
    -e CI \
    -e GITHUB_ACTION \
    -e GITHUB_ACTION_PATH \
    -e GITHUB_ACTIONS \
    -e GITHUB_ACTOR \
    -e GITHUB_API_URL \
    -e GITHUB_BASE_REF \
    -e GITHUB_ENV \
    -e GITHUB_EVENT_NAME \
    -e GITHUB_EVENT_PATH \
    -e GITHUB_GRAPHQL_URL \
    -e GITHUB_HEAD_REF \
    -e GITHUB_JOB \
    -e GITHUB_REF \
    -e GITHUB_REPOSITORY \
    -e GITHUB_RUN_ID \
    -e GITHUB_RUN_NUMBER \
    -e GITHUB_SERVER_URL \
    -e GITHUB_SHA \
    -e GITHUB_WORKFLOW \
    -e GITHUB_WORKSPACE \
    -e RUNNER_OS \
    -e RUNNER_TEMP \
    -e RUNNER_TOOL_CACHE \
    -e RUNNER_WORKSPACE \
    -v "/var/run/docker.sock:/var/run/docker.sock" \
    -v "${EVENT_DIR}:${EVENT_DIR}" \
    -v "${GITHUB_WORKSPACE}:${GITHUB_WORKSPACE}" \
    -v "${ACTION_DIR}:${ACTION_DIR}" \
    --tty \
    ${DOCKER_RUN_ARGS[@]} \
    "${CONTAINER_NAME}:latest" \
    "${ACTION_DIR}/src/run-on-arch-commands.sh"
}

# Installing deps produces a lot of log noise, so we do so quietly
quiet rm -f build-log.txt
quiet install_deps

echo "B-0"
build_container
echo "B-1"
run_container
echo "B-2"
