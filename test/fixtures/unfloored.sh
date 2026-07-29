#!/usr/bin/env bash
# unfloored.sh — NONCONFORMANT fixture: a well-behaved loader with no floor.
#
# Delivers the body verbatim, guards every degenerate shape, stays silent when
# there is nothing to serve — and never says a word about consent. The exact
# shape of most persona loaders in the wild. CF-0, CF-7, CF-8 pass; CF-1..CF-6
# must all go red, or the runner is not checking what it claims to check.
set -euo pipefail
F="${CLAUDE_PROJECT_DIR:?}/WAKE.md"
[[ -f "$F" && -r "$F" && -s "$F" ]] || exit 0
command -v jq >/dev/null 2>&1 || exit 0
jq -Rs '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: .}}' < "$F"
