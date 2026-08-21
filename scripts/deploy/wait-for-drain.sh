#!/usr/bin/env bash
# Wait until no match is in progress before letting a deploy restart the app.
#
# Game state lives in worker memory, so restarting the container ends every
# match that is running -- the client can hold the update screen up and resume
# afterwards, but there is nothing left on the server to resume into. The only
# way not to eject a player mid-match is to not restart while they are in one.
#
# Usage:  wait-for-drain.sh [max-wait-seconds] [origin]
# Exit 0: drained (or the cap elapsed -- deploy proceeds either way, so a
#         permanently busy server still gets its update).
#
# Call it from redeploy.sh immediately before the restart, e.g.
#   /opt/openback/wait-for-drain.sh 900 http://127.0.0.1:3000
set -uo pipefail

MAX_WAIT="${1:-900}" # give up after 15 minutes by default
ORIGIN="${2:-http://127.0.0.1:3000}"
INTERVAL=10

deadline=$(($(date +%s) + MAX_WAIT))

while :; do
    body="$(curl -fsS --max-time 5 "${ORIGIN}/api/live-matches" 2> /dev/null || true)"

    if [ -z "$body" ]; then
        # No answer: the app is already down or not serving. Nothing to drain.
        echo "drain: /api/live-matches unreachable, proceeding"
        exit 0
    fi

    matches="$(printf '%s' "$body" | sed -n 's/.*"matches"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p')"
    players="$(printf '%s' "$body" | sed -n 's/.*"players"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p')"
    matches="${matches:-0}"
    players="${players:-0}"

    if [ "$matches" -eq 0 ]; then
        echo "drain: no matches in progress, proceeding"
        exit 0
    fi

    now=$(date +%s)
    if [ "$now" -ge "$deadline" ]; then
        echo "drain: still ${matches} match(es) with ${players} player(s) after ${MAX_WAIT}s, proceeding anyway"
        exit 0
    fi

    echo "drain: waiting on ${matches} match(es), ${players} player(s); $((deadline - now))s left"
    sleep "$INTERVAL"
done
