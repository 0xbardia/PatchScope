#!/bin/sh
# Creates .env from .env.example only when .env is missing. Never prints secrets.
set -eu
cd "$(dirname "$0")/.."
if [ -f .env ]; then
  echo "env file already present; left unchanged"
  exit 0
fi
umask 077
cp .env.example .env
secret="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
tmp="$(mktemp)"
awk -v secret="$secret" '{ if ($0 ~ /^SESSION_SECRET=$/) print "SESSION_SECRET=" secret; else print }' .env > "$tmp"
mv "$tmp" .env
chmod 600 .env
echo "env file created; secrets were not printed"
