#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 /path/to/directory"
  exit 1
fi

DIRECTORY=$1

if [ ! -d "$DIRECTORY" ]; then
  echo "Error: Directory does not exist."
  exit 1
fi

find "$DIRECTORY" -type f | sed -n 's/.*\.\([^\.]*\)$/\1/p' | sort -u