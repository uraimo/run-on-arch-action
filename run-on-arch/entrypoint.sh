#!/bin/bash


# Break up the multi-line command list and evaluate it
commands=$@
command_list="${commands//[$'\t\r\n']/;}" 
eval $command_list
