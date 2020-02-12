# Run-On-Arch Github Action



[![](https://github.com/uraimo/run-on-arch-action/workflows/Test/badge.svg)](https://github.com/uraimo/run-on-arch/actions)

A Github Action that executes commands on an alternative architecture (ARMv6, ARMv7, aarch64, s390x, ppc64le).

## Usage

This action requires three input parameters:

* `architecture`: The cpu architecture of the container that will run your commands;
* `distribution`: The Linux distribution the will be launched by the container (right now, various releases of Debian or Ubuntu);
* `run`: A series of commands that will be executed.

The action does not define any default output variable, feel free to create as many as you want and set them in the `run` block. 

### Basic example

This basic example executes `uname -a` and then does it again to save the value in a variable:

```
on: [push]

jobs:
  armv7_job:
    runs-on: ubuntu-18.04
    name: Build on ARMv7 
    steps:
      - uses: actions/checkout@v1.0.0
      - uses: uraimo/run-on-arch-action@v1.0.5
        id: runcmd
        with:
          architecture: armv7
          distribution: ubuntu18.04
          additionalArgs: <additional args for architecture specific docker, optional>
          run: |
            uname -a
            echo ::set-output name=uname::$(uname -a)
      - name: Get the output
        run: |
            echo "The uname output was ${{ steps.runcmd.outputs.uname }}"
```

More complex examples that use different architectures and that show how output artifacts can be easily saved as you would normally do with actions running on x86 can be found in the [.github/workflows](https://github.com/uraimo/run-on-arch-action/tree/master/.github/workflows) directory.

### Optional parameters

Additional arguments can be passed to the docker that this action spawns:
```
...
        with:
          architecture: armv7
          distribution: ubuntu18.04
          additionalArgs: <additional args for architecture specific docker, optional>
          run: |
            uname -a
```

## Supported Platforms

This table contains a list of possible Architecture/Distribution combinations:

| Architecture | Distributions |
| -------- | ------------- |
| armv6    | jessie, stretch, buster |
| armv7    | jessie, stretch, buster, ubuntu16.04, ubuntu18.04 |
| aarch64  | stretch, buster, ubuntu16.04, ubuntu18.04 |
| s390x  | jessie, stretch, buster, ubuntu16.04, ubuntu18.04 |
| ppc64le  | jessie, stretch, buster, ubuntu16.04, ubuntu18.04 |

Using an invalid combination will result in a crash but new configuration can be easily added if a working docker image is available.

## License

This project is licensed under the [BSD 3-Clause License](https://github.com/uraimo/run-on-arch-action/blob/master/LICENSE).
