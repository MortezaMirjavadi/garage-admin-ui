#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

docker rm -f garage-container >/dev/null 2>&1 || true

# The command must be ONE invocation. `--mount type=bind` (unlike -v) fails
# loudly if garage.toml is missing instead of silently creating a directory.
docker run -d \
  --name garage-container \
  -p 3900:3900 -p 3901:3901 -p 3902:3902 -p 3903:3903 \
  --mount type=bind,source="$(pwd)/garage.toml",target=/etc/garage.toml \
  -v garage-data:/var/lib/garage \
  --env-file "$(pwd)/.env.garage" \
  dxflrs/garage:v2.5.0 \
  /garage server --single-node --default-bucket

echo "Started. Waiting for health..."
sleep 3
docker logs garage-container --tail 30
echo "--- cluster status ---"
docker exec garage-container /garage status