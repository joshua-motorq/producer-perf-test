#!/bin/bash
PATH=$PATH:/usr/local/bin
while true; do
  docker stats --no-stream --no-trunc --format \
    '{{.Name}} CPU={{.CPUPerc}} MEM={{.MemUsage}} NET={{.NetIO}}' \
    producer-perf-test-producer-1-1 producer-perf-test-producer-2-1 |
  tr -cd '\11\12\15\40-\176' |
  while IFS= read -r line; do
    echo "$(date +'%Y-%m-%d %H:%M:%S') $line" >> docker_stats.log
  done
  sleep 0.1
done
