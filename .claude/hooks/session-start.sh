#!/bin/bash
# SessionStart hook: prepare the workspace for Claude Code on the web so that
# tests, linters and builds are runnable the moment a session begins.
set -euo pipefail

# Local machines manage their own dependencies; only bootstrap remote sessions.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# The repo pins installs to `npm ci --ignore-scripts` (see CLAUDE.md): the
# lockfile stays authoritative and postinstall scripts (husky, native canvas
# rebuilds) are skipped, which keeps the install hermetic and fast.
if [ ! -d node_modules ] || [ ! -x node_modules/.bin/vitest ]; then
  for attempt in 1 2 3; do
    if npm ci --ignore-scripts; then
      break
    fi

    if [ "$attempt" -lt 3 ]; then
      echo "npm ci failed on attempt $attempt; retrying with a clean node_modules directory"
      rm -rf node_modules
      sleep $((attempt * 5))
    else
      echo "npm ci failed after $attempt attempts" >&2
      exit 1
    fi
  done
fi

echo "OpenBack dependencies ready: $(node -v), $(npm -v)"
