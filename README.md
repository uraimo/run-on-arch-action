# Run-On-Arch GitHub Action

[![](https://github.com/uraimo/run-on-arch-action/workflows/test/badge.svg)](https://github.com/uraimo/run-on-arch-action)

A GitHub Action that executes commands on non-x86 CPU architecture (armv6, armv7, aarch64, s390x, ppc64le) via QEMU.

## Usage

This action requires three input parameters:

* `arch`: CPU architecture: `armv6`, `armv7`, `aarch64`, `riscv64`, `s390x`, or `ppc64le`. See [Supported Platforms](#supported-platforms) for the full matrix.
* `distro`: Linux distribution name: `ubuntu22.04`,`ubuntu20.04`, `bookworm`,`bullseye`, `buster`, `stretch`,  `fedora_latest`, `alpine_latest` or `archarm_latest`. See [Supported Platforms](#supported-platforms) for the full matrix.
* `run`: Shell commands to execute in the container.

The action also accepts some optional input parameters:

* `githubActionsCache`: Set to `true` to cache with GitHub Actions cache instead of GitHub Package Registry. This speeds up subsequent builds and is highly recommended.
* `githubToken`: Your GitHub token, used for caching Docker images in your project's public package registry rather than using GitHub Actions cache. Usually this would just be `${{ github.token }}`.
* `env`: Environment variables to propagate to the container. YAML, but must begin with a `|` character. These variables will be available in both run and setup.
* `shell`: The shell to run commands with in the container. Default: `/bin/sh` on Alpine, `/bin/bash` for other distros.
* `dockerRunArgs`: Additional arguments to pass to `docker run`, such as volume mappings. See [`docker run` documentation](https://docs.docker.com/engine/reference/commandline/run).
* `setup`: Shell commands to execute on the host before running the container, such as creating directories for volume mappings.
* `install`: Shell commands to execute in the container as part of `docker build`, such as installing dependencies. This speeds up subsequent builds if `githubToken` is also used, but note that the image layer will be publicly available in your projects GitHub Package Registry, so make sure the resulting image does not have any secrets cached in logs or state.
* `base_image`: Specify a custom base image, `arch` and `distro` should be set to `none` in this case. This will allow you to choose direcly the image that will be used in the *FROM* clause of the internal docker container without needing to create a Dockerfile.arch.distro for a specific arch/distro pair. If required by the docker image, the architecture can be specified prepenging the platform identifier before the image name, e.g. `--platform=linux/armv7 arm32v7/debian:buster`. Known limitation: Only one base_image configuration for each workflow if you use GitHub images caching.

### Basic example

A basic example that sets an output variable for use in subsequent steps:

```yaml
on: [push, pull_request]

jobs:
  armv7_job:
    # The host should always be Linux
    runs-on: ubuntu-22.04
    name: Build on ubuntu-22.04 armv7
    steps:
      - uses: actions/checkout@v4
      
      # Only required if you are using the GitHub Actions cache. 
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        
      - uses: uraimo/run-on-arch-action@v2
        name: Run commands
        id: runcmd
        with:
          arch: armv7
          distro: ubuntu22.04

          # Not required, but speeds up builds by storing container images in
          # the GitHub Actions cache between runs.
          githubActionsCache: 'true'

          # Set an output parameter `uname` for use in subsequent steps
          run: |
            uname -a
            echo ::set-output name=uname::$(uname -a)

      - name: Get the output
        # Echo the `uname` output parameter from the `runcmd` step
        run: |
          echo "The uname output was ${{ steps.runcmd.outputs.uname }}"
```

### Advanced example

This shows how to use a matrix to produce platform-specific artifacts, and includes example values for the optional input parameters `setup`, `shell`, `env`, and `dockerRunArgs`.

```yaml
on: [push, pull_request]

jobs:
  build_job:
    # The host should always be linux
    runs-on: ubuntu-22.04
    name: Build on ${{ matrix.distro }} ${{ matrix.arch }}

    # Run steps on a matrix of 4 arch/distro combinations
    strategy:
      matrix:
        include:
          - arch: aarch64
            distro: ubuntu22.04
          - arch: aarch64
            distro: bullseye 
          - arch: ppc64le
            distro: alpine_latest
          - arch: none
            distro: none
            base_image: --platform=linux/riscv64 riscv64/busybox
    steps:
      - uses: actions/checkout@v4
      - uses: uraimo/run-on-arch-action@v2
        name: Build artifact
        id: build
        with:
          arch: ${{ matrix.arch }}
          distro: ${{ matrix.distro }}

          # Not required, but speeds up builds
          githubToken: ${{ github.token }}

          # Create an artifacts directory
          setup: |
            mkdir -p "${PWD}/artifacts"

          # Mount the artifacts directory as /artifacts in the container
          dockerRunArgs: |
            --volume "${PWD}/artifacts:/artifacts"

          # Pass some environment variables to the container
          env: | # YAML, but pipe character is necessary
            artifact_name: git-${{ matrix.distro }}_${{ matrix.arch }}

          # The shell to run commands with in the container
          shell: /bin/sh

          # Install some dependencies in the container. This speeds up builds if
          # you are also using githubToken. Any dependencies installed here will
          # be part of the container image that gets cached, so subsequent
          # builds don't have to re-install them. The image layer is cached
          # publicly in your project's package repository, so it is vital that
          # no secrets are present in the container state or logs.
          install: |
            case "${{ matrix.distro }}" in
              ubuntu*|jessie|stretch|buster|bullseye)
                apt-get update -q -y
                apt-get install -q -y git
                ;;
              fedora*)
                dnf -y update
                dnf -y install git which
                ;;
              alpine*)
                apk update
                apk add git
                ;;
            esac

          # Produce a binary artifact and place it in the mounted volume
          run: |
            cp $(which git) "/artifacts/${artifact_name}"
            echo "Produced artifact at /artifacts/${artifact_name}"

      - name: Show the artifact
        # Items placed in /artifacts in the container will be in
        # ${PWD}/artifacts on the host.
        run: |
          ls -al "${PWD}/artifacts"
```

## Supported Platforms

This table details the valid `arch`/`distro` combinations:


| arch     | distro     |
| -------- | ---------- |
| armv6    | stretch, buster, bullseye, bookworm, alpine_latest |
| armv7    | stretch, buster, bullseye, bookworm, ubuntu20.04, ubuntu22.04, ubuntu_latest, ubuntu_rolling, ubuntu_devel, fedora_latest, alpine_latest, archarm_latest |
| aarch64  | stretch, buster, bullseye, bookworm, ubuntu20.04, ubuntu22.04, ubuntu_latest, ubuntu_rolling, ubuntu_devel, fedora_latest, alpine_latest, archarm_latest |
| riscv64  | ubuntu20.04, ubuntu22.04, ubuntu_latest, ubuntu_rolling, ubuntu_devel, alpine_edge |
| s390x    | stretch, buster, bullseye, bookworm, ubuntu20.04, ubuntu22.04, ubuntu_latest, ubuntu_rolling, ubuntu_devel, alpine_latest |
| ppc64le  | stretch, buster, bullseye, bookworm, ubuntu20.04, ubuntu22.04, ubuntu_latest, ubuntu_rolling, ubuntu_devel, alpine_latest |


Using an invalid `arch`/`distro` combination will fail.

## Architecture emulation

This project makes use of an additional QEMU container to be able to emulate via software architectures like ARM, s390x, ppc64le, etc... that are not natively supported by GitHub. You should keep this into consideration when reasoning about the expected running time of your jobs, there will be a visible impact on performance when compared to a job executed on a vanilla runner.

## Contributing

New distros and archs can be added simply by creating a Dockerfile named `Dockerfile.{arch}.{distro}` (that targets an image for the desired combination) in the [Dockerfiles](https://github.com/uraimo/run-on-arch-action/blob/master/Dockerfiles) directory. Pull requests welcome!

## Authors

[Umberto Raimondi](https://github.com/uraimo)

[Elijah Shaw-Rutschman](https://github.com/elijahr)

And many other [contributors](https://github.com/uraimo/run-on-arch-action/graphs/contributors).

## License

This project is licensed under the [BSD 3-Clause License](https://github.com/uraimo/run-on-arch-action/blob/master/LICENSE).
