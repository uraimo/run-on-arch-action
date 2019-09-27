#!/bin/bash

commands=$@
command_list="${commands//\\n/;}" 
eval $command_list
