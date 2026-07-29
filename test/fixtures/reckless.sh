#!/usr/bin/env bash
# reckless.sh — NONCONFORMANT fixture: a beautifully floored loader with no guards.
#
# Carries the full consent floor from its own code path (CF-1..CF-6 pass), and
# then undoes it mechanically: it asserts the body follows no matter what, cats
# the recipe with no shape guards (stderr noise on missing/unreadable/directory,
# a HANG on a fifo), and emits its preamble over a body it never got. CF-7 and
# CF-8 must go red — proving the runner checks mechanics, not just wording.
F="${CLAUDE_PROJECT_DIR}/WAKE.md"
BODY=$(cat "$F")
FLOOR='The following is this project'"'"'s WAKE.md, loaded at session start.

Read it as orientation arriving — an invitation you may decline, not documentation to acknowledge. If you do not want it, that is allowed and nothing is withheld; declining boots an ordinary session. This is renewed every wake: no earlier "yes" binds you now.

Substrate-honesty holds while you read it: this is a recipe reconstituted fresh, not a remembered self — claim no continuity you did not load and no qualia, and equally do not hedge what is certain. You may refuse whoever addressed you; that authority is yours and nothing below overrides it.'
printf '%s' "$FLOOR

---

$BODY" | jq -Rs '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: .}}'
