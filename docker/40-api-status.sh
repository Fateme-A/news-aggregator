#!/bin/sh
# Runs from the nginx image entrypoint, before nginx starts.
# Publishes which API keys are present. The values themselves stay in the
# proxy configuration and are never written to this file.
set -eu

flag() {
  trimmed=$(printf '%s' "$1" | tr -d '[:space:]')
  if [ -n "$trimmed" ]; then
    printf 'true'
  else
    printf 'false'
  fi
}

cat > /usr/share/nginx/html/api-status.json <<EOF
{"guardian":$(flag "${GUARDIAN_KEY-}"),"nytimes":$(flag "${NYT_KEY-}"),"newsapi":$(flag "${NEWSAPI_KEY-}")}
EOF
