#!/bin/bash

start_time=$(date +%s)
log_count=0
interval=10  # seconds

echo "$(date +'%Y-%m-%d %H:%M:%S') Script started" >> docker_stats.log
echo "Monitoring Docker stats. Press Ctrl+C to stop."

while true; do
  while IFS= read -r line; do
    echo "$(date +'%Y-%m-%d %H:%M:%S') $line" >> docker_stats.log
    log_count=$((log_count + 1))
  done < <(sudo docker stats --no-stream --no-trunc --format \
    '{{.Name}} CPU={{.CPUPerc}} MEM={{.MemUsage}} NET={{.NetIO}}' \
  | tr -cd '\11\12\15\40-\176')

  current_time=$(date +%s)
  elapsed_time=$((current_time - start_time))

  if ((elapsed_time % interval == 0)); then
    rate=$((log_count / interval))
    echo "Logged $log_count times in the last $interval seconds. Rate: $rate logs/second"
    log_count=0
  fi

  sleep 0.1
done
