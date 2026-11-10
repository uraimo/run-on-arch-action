#!/bin/sh

   set -- a "--volume" "/tmp/my dir:/data"

   declare -a bad=${@:2:${#@}}
   printf '<%s>\n' "${bad[@]}"
   # can become:
   # <--volume>
   # </tmp/my>
   # <dir:/data>
   
   
   set -- a "--volume" "/tmp/my dir:/data"

   good=("${@:2}")
   printf '<%s>\n' "${good[@]}"
   # <--volume>
   # </tmp/my dir:/data>
