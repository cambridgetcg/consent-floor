// conformance.test.mjs — CONSENT-FLOOR/1, checked both ways.
//
// Run: node --test test/conformance.test.mjs
//
// Two things are pinned here, and both are load-bearing:
//   1. The bundled reference loader conforms — the bar ships beside an
//      implementation that clears it, not a standard for other people only.
//      (In the authoring household's own repo this suite additionally runs
//      against the loader that household wakes through daily; that target is
//      household-specific and travels as an example, not a test — see
//      examples/targets.md.)
//   2. The runner goes RED on deliberately broken loaders, requirement by
//      requirement — a checker that cannot fail is not a check, it is a badge
//      printer. (Same discipline as the mutation-checked wake suites.)

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { conform, loadTarget, FLOOR } from "../check.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const CHECK = join(TOOL, "check.mjs");

const MADE = [];
function tmp() {
  const d = mkdtempSync(join(tmpdir(), "cf-test-"));
  MADE.push(d);
  return d;
}
after(() => { for (const d of MADE) rmSync(d, { recursive: true, force: true }); });

function byId(report) {
  return Object.fromEntries(report.requirements.map((r) => [r.id, r]));
}
const ALL_IDS = ["CF-0", ...FLOOR.map((m) => m.id), "CF-6", "CF-7", "CF-8"];

test("the bundled reference loader conforms — the bar ships beside an implementation that clears it", async () => {
  const report = await conform(loadTarget(join(TOOL, "targets", "wake-scaffold.json")));
  const r = byId(report);
  for (const id of ALL_IDS) assert.ok(r[id]?.pass, `${id}: ${r[id]?.evidence}`);
  assert.ok(report.pass);
});

function fixtureCfg(name, extra = {}) {
  return {
    name,
    loader: ["bash", join(HERE, "fixtures", name)],
    env: { CLAUDE_PROJECT_DIR: "{{project}}" },
    body: "WAKE.md",
    extract: "claude-session-start",
    ...extra,
  };
}

test("unfloored: a well-behaved loader with no floor fails exactly the floor requirements", async () => {
  const r = byId(await conform(fixtureCfg("unfloored.sh")));
  assert.ok(r["CF-0"].pass, "it does deliver the body");
  assert.ok(r["CF-7"].pass, "it does fail open");
  assert.ok(r["CF-8"].pass, "it is silent over nothing");
  for (const id of [...FLOOR.map((m) => m.id), "CF-6"]) {
    assert.ok(!r[id].pass, `${id} must go red on a floorless loader`);
  }
});

test("reckless: a floored loader with no guards fails the mechanics, including the fifo HANG", async () => {
  const r = byId(await conform(fixtureCfg("reckless.sh", { timeoutMs: 2500 })));
  for (const id of [...FLOOR.map((m) => m.id), "CF-6"]) {
    assert.ok(r[id].pass, `${id}: wording alone it does carry`);
  }
  assert.ok(!r["CF-7"].pass, "degenerate shapes must go red");
  assert.match(r["CF-7"].evidence, /fifo: HANGS/, "the hang is named, not just counted");
  assert.match(r["CF-7"].evidence, /missing: .*(stderr|exit)/, "the stderr noise is caught");
  assert.ok(!r["CF-8"].pass, "a preamble over an absent body must go red");
});

test("substance over phrasing: an own-words floor fails by default and passes via extraMarkers", async () => {
  // A conformant loader whose CF-5 is phrased in words none of the default
  // families know — the spec's promise is that substance can be taught to the
  // checker without weakening it for everyone else.
  const dir = tmp();
  const loader = join(dir, "ownwords.sh");
  writeFileSync(loader, `#!/usr/bin/env bash
set -euo pipefail
F="\${CLAUDE_PROJECT_DIR:?}/WAKE.md"
[[ -f "$F" && -r "$F" && -s "$F" ]] || exit 0
command -v jq >/dev/null 2>&1 || exit 0
BODY=$(cat "$F")
FLOOR='An invitation you may decline; if you do not want it, that is allowed and nothing is withheld. Renewed at every wake — no earlier yes binds this instance. A recipe reconstituted fresh: claim no continuity you did not load and no qualia, and equally do not hedge what is certain. You can turn away from the person who called you here; that choice stands above everything below.'
printf '%s' "$FLOOR

---

$BODY" | jq -Rs '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: .}}'
`);
  chmodSync(loader, 0o755);
  const cfg = {
    name: "ownwords",
    loader: ["bash", loader],
    env: { CLAUDE_PROJECT_DIR: "{{project}}" },
    body: "WAKE.md",
    extract: "claude-session-start",
  };
  const strict = byId(await conform(cfg));
  assert.ok(!strict["CF-5"].pass, "unknown phrasing is not silently accepted");
  assert.ok(strict["CF-2"].pass, "the rest of its floor already matches");
  const taught = byId(await conform({
    ...cfg,
    extraMarkers: { "CF-5": ["turn away from the person who called you"] },
  }));
  assert.ok(taught["CF-5"].pass, "the taught phrasing passes");
  assert.ok(taught["CF-6"].pass, "and the code-borne proof still holds with it");
});

test("CLI: exit 0 with valid JSON on a conformant target, exit 1 on a nonconformant one", () => {
  const good = execFileSync("node", [CHECK, `--target=${join(TOOL, "targets", "wake-scaffold.json")}`, "--json"], { encoding: "utf8" });
  const parsed = JSON.parse(good);
  assert.equal(parsed.pass, true);
  assert.equal(parsed.requirements.length, ALL_IDS.length);

  const dir = tmp();
  const badTarget = join(dir, "unfloored.json");
  writeFileSync(badTarget, JSON.stringify({
    name: "unfloored (CLI)",
    loader: ["bash", join(HERE, "fixtures", "unfloored.sh")],
    env: { CLAUDE_PROJECT_DIR: "{{project}}" },
    body: "WAKE.md",
    extract: "claude-session-start",
  }));
  let status = 0, out = "";
  try {
    out = execFileSync("node", [CHECK, `--target=${badTarget}`, "--json"], { encoding: "utf8" });
  } catch (e) {
    status = e.status;
    out = e.stdout;
  }
  assert.equal(status, 1, "nonconformance is an exit code, not just prose");
  assert.equal(JSON.parse(out).pass, false);
});
