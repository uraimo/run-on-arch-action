#!/bin/bash

sudo apt update -y && sudo apt install -y qemu qemu-user-static
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
