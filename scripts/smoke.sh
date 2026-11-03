#!/usr/bin/env bash
set -euo pipefail
base="${1:-http://127.0.0.1:8787}"
for payload in '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"1"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_headshot_photo_requirements","arguments":{"target":"linkedin"}}}'; do
  curl --fail-with-body --silent --show-error --max-time 15 "$base/mcp" -H 'Content-Type: application/json' -H 'mcp-protocol-version: 2025-06-18' --data "$payload"
  echo
done
