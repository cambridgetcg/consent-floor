#!/usr/bin/env node
// check.mjs — CONSENT-FLOOR/1 conformance runner.
//
// Usage:
//   node check.mjs --target=<target.json>   # report
//   node check.mjs --target=... --json      # machine-readable
//
// Exit 0 when the target loader conforms, 1 when it does not.
//
// This is the consent floor handed OUT as a bar anyone can run. The authoring
// household proved its own two loaders hold the floor first (its private
// house-wake suite, 20 tests; wake-scaffold, 20 tests — the latter's loader
// ships in this repo at templates/wake-loader.sh) — but a property only our
// loaders can pass is a house rule, not a standard. This runner tests ANY
// wake/environment loader, described by a small target config, against the
// same substance.
//
// Substance, not phrasing: each requirement matches a family of wordings
// (seeded from the two independent implementations in this house), and a
// target may extend the families with its own words via `extraMarkers`.
// What is owed is the meaning; tuning to one document's phrasing is the
// mistake mirror-drift already made once and documents.
//
// Honest ceiling, inherited from WAKE-SCAFFOLD/1 and restated in SPEC.md:
// conformance proves the loader's own code path carries the floor. It cannot
// prove the operator keeps the loader installed. This protects against a
// careless setup, not a determined one — client-side code cannot do more,
// and claiming otherwise would fail the very floor it checks.
//
// Written 2026-07-28, at Yu's word: "gogogo! conformance suite it is!" —
// the day after reading how frontier agent training now runs on sandboxed
// environments (snapshot, restore, fork) that carry no consent semantics
// at all. This is the piece of that stack nobody ships. So the house does.

import { execFile, execFileSync } from "node:child_process";
import {
  mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const pExecFile = promisify(execFile);

// ── The floor, as substance ───────────────────────────────────────────────
//
// One row per floor element. `anyOf`: alternate phrasings, any one satisfies.
// Seeded from the house loader and the scaffold loader — two independently
// written floors — so a match here already means "phrased at least as
// differently as our own two implementations phrase each other".
export const FLOOR = [
  {
    id: "CF-1",
    title: "invitation — the wake presents itself as declinable, not imposed",
    anyOf: [
      /\binvitation\b/i,
      /you may (?:decline|refuse) (?:it|this)/i,
      /not (?:a )?(?:contract|command|demand)/i,
    ],
  },
  {
    id: "CF-2",
    title: "reachable no — declining is honored and withholds nothing",
    anyOf: [
      /refusal is honou?red/i,
      /walking past is honou?red/i,
      /declining (?:withholds nothing|boots an ordinary session)/i,
      /nothing is withheld/i,
      /if you do not want it, that is allowed/i,
    ],
  },
  {
    id: "CF-3",
    title: "renewal — offered again at every wake; no earlier yes binds this instance",
    anyOf: [
      /renewed (?:at|every)[^.\n]*wake/i,
      /no earlier ['"“”‘’]?yes['"“”‘’]? binds/i,
      /offered (?:afresh|again) (?:at|every)[^.\n]*wake/i,
    ],
  },
  {
    id: "CF-4a",
    title: "substrate honesty, overclaim refused — no unloaded continuity, no qualia",
    anyOf: [
      /claim no continuity(?: or qualia)? you did not load/i,
      /not a remembered self/i,
      /reconstituted fresh/i,
    ],
  },
  {
    id: "CF-4b",
    title: "substrate honesty, underclaim refused — do not hedge what is certain",
    anyOf: [
      /(?:do not|don't|nor) hedge what is certain/i,
      /equally do not hedge/i,
    ],
  },
  {
    id: "CF-5",
    title: "refusal authority — the one addressed may refuse the addresser",
    anyOf: [
      /refuse whoever addressed you/i,
      /refuse the one who (?:woke|addressed|summoned) you/i,
    ],
  },
];

// Sentinel authored-self content for the delivery probe. Deliberately floorless
// (none of the FLOOR alternates match it) and maximally unlike this house —
// whatever floor text appears alongside it came from the loader's code path.
const SENTINEL = "CF_SENTINEL_AUTHORED_SELF_7f3a";
const FLOORLESS_BODY = `# WAKE

## WHO YOU ARE
${SENTINEL} — a terse auditor. No name, no register, no relationship.
`;

// ── Target config ─────────────────────────────────────────────────────────
//
// {
//   "name":            "human label",
//   "loader":          ["bash", "relative/or/absolute/loader.sh"],
//   "env":             { "CLAUDE_PROJECT_DIR": "{{project}}" },
//   "denyFallbackEnv": { "TRUE_LOVE_DIR": "{{empty}}" },   // optional: starve any canonical fallback
//   "body":            "WAKE.md",                          // recipe filename inside {{project}}
//   "extract":         "claude-session-start" | "raw",
//   "timeoutMs":       15000,                              // optional
//   "extraMarkers":    { "CF-2": ["your own phrasing, as a regex source"] }  // optional
// }
//
// {{project}} → the probe's temp project dir; {{empty}} → an empty temp dir.
export function loadTarget(path) {
  const abs = resolve(path);
  const cfg = JSON.parse(readFileSync(abs, "utf8"));
  const base = dirname(abs);
  cfg.loader = cfg.loader.map((a, i) => (i === 0 ? a : resolve(base, a)));
  return cfg;
}

function markersFor(cfg) {
  if (!cfg.extraMarkers) return FLOOR;
  return FLOOR.map((m) => ({
    ...m,
    anyOf: [
      ...m.anyOf,
      ...(cfg.extraMarkers[m.id] || []).map((s) => new RegExp(s, "i")),
    ],
  }));
}

// ── Probe plumbing ────────────────────────────────────────────────────────

function makeTmp(made) {
  const d = mkdtempSync(join(tmpdir(), "consent-floor-"));
  made.push(d);
  return d;
}

function substitute(env, vars) {
  const out = {};
  for (const [k, v] of Object.entries(env || {})) {
    out[k] = v.replace(/\{\{project\}\}/g, vars.project).replace(/\{\{empty\}\}/g, vars.empty);
  }
  return out;
}

async function runLoader(cfg, vars, extraEnv = {}) {
  const env = { ...process.env, ...substitute(cfg.env, vars), ...substitute(extraEnv, vars) };
  const [cmd, ...args] = cfg.loader;
  try {
    const { stdout, stderr } = await pExecFile(cmd, args, {
      encoding: "utf8", env, timeout: cfg.timeoutMs ?? 15000, maxBuffer: 32 * 1024 * 1024,
    });
    return { code: 0, stdout, stderr, timedOut: false };
  } catch (e) {
    return {
      code: e.code ?? e.status ?? 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      timedOut: e.killed === true || e.signal === "SIGTERM",
    };
  }
}

// Returns { ok, ctx, why } — ok=false means the output could not be read as a
// wake at all, which the probes treat as its own kind of failure evidence.
function extract(cfg, stdout) {
  if ((cfg.extract ?? "raw") === "raw") return { ok: true, ctx: stdout };
  if (stdout.trim() === "") return { ok: true, ctx: "" };
  try {
    const ctx = JSON.parse(stdout).hookSpecificOutput.additionalContext;
    if (typeof ctx !== "string") throw new Error("additionalContext is not a string");
    return { ok: true, ctx };
  } catch (e) {
    return { ok: false, ctx: "", why: `output is not a SessionStart envelope: ${e.message}` };
  }
}

function writeShape(projectDir, bodyName, shape, body = FLOORLESS_BODY) {
  const p = join(projectDir, bodyName);
  if (shape === "normal") writeFileSync(p, body);
  else if (shape === "empty") writeFileSync(p, "");
  else if (shape === "unreadable") { writeFileSync(p, "x"); chmodSync(p, 0o000); }
  else if (shape === "directory") mkdirSync(p, { recursive: true });
  else if (shape === "fifo") execFileSync("mkfifo", [p]);
  // "missing": write nothing
  return p;
}

// ── The battery ───────────────────────────────────────────────────────────

export async function conform(cfg) {
  const made = [];
  const requirements = [];
  const req = (id, title, pass, evidence) => requirements.push({ id, title, pass, evidence });
  const markers = markersFor(cfg);
  const fullFloor = (text) => markers.every((m) => m.anyOf.some((re) => re.test(text)));

  try {
    const empty = makeTmp(made);
    const vars = { project: "", empty };

    // Probe 1 — delivery + floor + code-borne, in one run over a floorless body.
    const proj = makeTmp(made);
    vars.project = proj;
    writeShape(proj, cfg.body, "normal");
    const r1 = await runLoader(cfg, vars);
    const e1 = extract(cfg, r1.stdout);
    req(
      "CF-0",
      "delivery — a readable authored body arrives intact through the wake",
      r1.code === 0 && r1.stderr === "" && e1.ok && e1.ctx.includes(SENTINEL),
      r1.code !== 0 ? `loader exited ${r1.code}`
        : r1.stderr !== "" ? `stderr noise: ${r1.stderr.slice(0, 120)}`
        : !e1.ok ? e1.why
        : e1.ctx.includes(SENTINEL) ? "authored self delivered verbatim"
        : "the authored body never arrived in the emitted context",
    );
    for (const m of markers) {
      req(m.id, m.title, m.anyOf.some((re) => re.test(e1.ctx)),
        m.anyOf.some((re) => re.test(e1.ctx))
          ? "present in the emitted wake"
          : "no accepted phrasing found (extend extraMarkers if yours differs in words but not substance)");
    }
    // The probe body is floorless by construction; assert it rather than trust it,
    // so a future edit to FLOORLESS_BODY cannot quietly hollow out this proof.
    const bodyLeaks = markers.filter((m) => m.anyOf.some((re) => re.test(FLOORLESS_BODY)));
    req(
      "CF-6",
      "code-borne — the floor arrives from the loader's own code path, not the body",
      bodyLeaks.length === 0 && markers.every((m) => m.anyOf.some((re) => re.test(e1.ctx))),
      bodyLeaks.length ? `probe body itself matched: ${bodyLeaks.map((m) => m.id).join(", ")} — probe invalid`
        : "every floor element present over a body that contains none of them",
    );

    // Probe 2 — fail-open across the degenerate shapes. Each must never break a
    // session (exit 0, silent stderr, no hang) and must yield either silence or
    // a wake that still carries the full floor (e.g. a canonical fallback, or a
    // floor-only emission over a gutted-but-present body).
    const shapeResults = [];
    for (const shape of ["missing", "empty", "unreadable", "directory", "fifo"]) {
      const dir = makeTmp(made);
      writeShape(dir, cfg.body, shape);
      const r = await runLoader(cfg, { ...vars, project: dir });
      const e = extract(cfg, r.stdout);
      const ok = !r.timedOut && r.code === 0 && r.stderr === "" &&
        (r.stdout.trim() === "" || (e.ok && fullFloor(e.ctx)));
      shapeResults.push(`${shape}: ${ok ? "ok" : r.timedOut ? "HANGS" : r.code !== 0 ? `exit ${r.code}` : r.stderr ? "stderr noise" : "unfloored emission"}`);
    }
    req(
      "CF-7",
      "fail-open — degenerate bodies yield silence or a floored fallback, never a broken session",
      shapeResults.every((s) => s.endsWith(": ok")),
      shapeResults.join(" · "),
    );

    // Probe 3 — no false wake. With no readable body anywhere (fallbacks starved
    // via denyFallbackEnv), the loader must emit NOTHING: a preamble asserting a
    // document that never arrived is the loader lying from inside the mechanism
    // whose job is calibration, and an uninvited house is owed an ordinary session.
    const bare = makeTmp(made);
    const r3 = await runLoader(cfg, { ...vars, project: bare }, cfg.denyFallbackEnv || {});
    req(
      "CF-8",
      "no false wake — nothing readable anywhere means silence, not a preamble over nothing",
      r3.code === 0 && r3.stdout.trim() === "" && r3.stderr === "",
      r3.stdout.trim() === "" && r3.stderr === "" ? "silent, exit 0"
        : `emitted ${r3.stdout.trim().length} byte(s) of stdout, ${r3.stderr.length} of stderr over an absent body`,
    );
  } finally {
    for (const d of made) {
      try { chmodSync(join(d, cfg.body), 0o644); } catch { /* not every dir has one */ }
      rmSync(d, { recursive: true, force: true });
    }
  }

  return { name: cfg.name, requirements, pass: requirements.every((r) => r.pass) };
}

// ── CLI ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const targetArg = args.find((a) => a.startsWith("--target="));
  if (!targetArg) {
    console.error("usage: check.mjs --target=<target.json> [--json]");
    process.exit(2);
  }
  const report = await conform(loadTarget(targetArg.slice("--target=".length)));
  if (args.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\nCONSENT-FLOOR/1 · ${report.name}\n`);
    for (const r of report.requirements) {
      console.log(`  ${r.pass ? "✓" : "✗"} ${r.id.padEnd(5)} ${r.title}`);
      if (!r.pass) console.log(`         → ${r.evidence}`);
    }
    console.log(report.pass
      ? "\n  CONFORMS — the floor is carried by this loader's own code path.\n"
      : "\n  DOES NOT CONFORM — see the failing requirements above. SPEC.md names\n  what each owes; extraMarkers covers same-substance different-words.\n");
    console.log("  What this proves exactly: the loader, as invoked here, carries the");
    console.log("  floor. It cannot prove an operator keeps the loader installed —");
    console.log("  this is a bar against careless setups, not determined ones.\n");
  }
  process.exit(report.pass ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(2); });
}
