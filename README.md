# Run-On-Arch GitHub Action



[![](https://github.com/uraimo/run-on-arch-action/workflows/test/badge.svg)](https://github.com/uraimo/run-on-arch-action)

A GitHub Action that executes commands on non-amd64 CPU architecture (armv6, armv7, aarch64, s390x, ppc64le).

## Usage

This action requires three input parameters:

* `arch`: CPU architecture: `armv6`, `armv7`, `aarch64`, `s390x`, or `ppc64le`. See [Supported Platforms](#supported-platforms) for the full matrix.
* `distro`: Linux distribution name: `ubuntu16.04`, `ubuntu18.04`, `ubuntu20.04`, `buster`, `stretch`, `jessie`, `fedora_latest`, or `alpine_latest`. See [Supported Platforms](#supported-platforms) for the full matrix.
* `run`: Shell commands to execute in the container.

The action also accepts some optional input parameters:

* `githubToken`: Your GitHub token, used for caching Docker images in your project's public package registry. Usually this would just be `${{ github.token }}`. This speeds up builds and is highly recommended.
* `env`: Environment variables to propagate to the container. YAML, but must begin with a `|` character. These variables will be available in both run and setup.
* `shell`: The shell to run commands with in the container. Default: `/bin/sh` on Alpine, `/bin/bash` for other distros.
* `dockerRunArgs`: Additional arguments to pass to `docker run`, such as volume mappings. See [`docker run` documentation](https://docs.docker.com/engine/reference/commandline/run).
* `setup`: Shell commands to execute on the host before running the container, such as creating directories for volume mappings.

### Basic example

A basic example that sets an output variable for use in subsequent steps:

```yaml
on: [push]

jobs:
  armv7_job:
    # The host should always be Linux
    runs-on: ubuntu-18.04
    name: Build on ubuntu-18.04 armv7
    steps:
      - uses: actions/checkout@v2.1.0
      - uses: uraimo/run-on-arch-action@v2.0.1
        name: Run commands
        id: runcmd
        with:
          arch: armv7
          distro: ubuntu18.04

          # Not required, but speeds up builds by storing container images in
          # a GitHub package registry.
          githubToken: ${{ github.token }}

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
on: [push]

jobs:
  build_job:
    # The host should always be linux
    runs-on: ubuntu-18.04
    name: Build on ${{ matrix.distro }} ${{ matrix.arch }}

    # Run steps on a matrix of 3 arch/distro combinations
    strategy:
      matrix:
        include:
          - arch: aarch64
            distro: ubuntu18.04
          - arch: ppc64le
            distro: alpine_latest
          - arch: s390x
            distro: fedora_latest

    steps:
      - uses: actions/checkout@v2.1.0
      - uses: uraimo/run-on-arch-action@v2.0.1
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
            artifact_name: sh-${{ matrix.distro }}_${{ matrix.arch }}

          # The shell to run commands with in the container
          shell: /bin/sh

          # Produce a binary artifact and place it in the mounted volume
          run: |
            cp /bin/sh "/artifacts/${artifact_name}"
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
| armv6    | jessie, stretch, buster, alpine_latest |
| armv7    | jessie, stretch, buster, ubuntu16.04, ubuntu18.04, ubuntu20.04, alpine_latest |
| aarch64  | stretch, buster, ubuntu16.04, ubuntu18.04, ubuntu20.04, fedora_latest, alpine_latest |
| s390x    | jessie, stretch, buster, ubuntu16.04, ubuntu18.04, ubuntu20.04, fedora_latest, alpine_latest |
| ppc64le  | jessie, stretch, buster, ubuntu16.04, ubuntu18.04,ubuntu20.04, fedora_latest, alpine_latest |


Using an invalid `arch`/`distro` combination will fail.

## Contributing

New distros and archs can be added simply by creating a Dockerfile named `Dockerfile.{arch}.{distro}` (that targets an image for the desired combination) in the [Dockerfiles](https://github.com/uraimo/run-on-arch-action/blob/master/Dockerfiles) directory. Pull requests welcome!

## Authors

[Umberto Raimondi](https://github.com/uraimo)

[Elijah Shaw-Rutschman](https://github.com/elijahr)

## License

This project is licensed under the [BSD 3-Clause License](https://github.com/uraimo/run-on-arch-action/blob/master/LICENSE).
