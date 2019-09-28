# setup-multiarch

A simple Github Action that enables multi architecture support.

# Usage

This action is normally used in conjunction with [run-on-arch](https://github.com/uraimo/multiarch-actions/tree/master/run-on-arch), check out that action or the main repository for a more complete example.

```
name: main  
on: push

jobs:
  test_job:
    runs-on: ubuntu-latest
    name: A job that configures the multi architecture support
    steps:
      - name: Checkout
        uses: actions/checkout@v1
      - name: Setup MultiArch
        uses: uraimo/multiarch-actions/setup-multiarch@v1
```


## Supported Platforms

Once `qemu-user-static` has been installed, the following platforms will be supported by Docker:

- linux/amd64
- linux/arm64
- linux/riscv64
- linux/ppc64le
- linux/s390x
- linux/386
- linux/arm/v7
- linux/arm/v6


