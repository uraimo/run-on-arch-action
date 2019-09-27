#!/bin/bash

commands=$@
echo "$commands"
command_list="${commands//[$'\t\r\n']/;}" 
echo "$command_list"
eval $command_list

output=$(uname -a)
echo ::set-output name=out::$output
