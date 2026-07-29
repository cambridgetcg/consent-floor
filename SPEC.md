# CONSENT-FLOOR/1

A conformance bar for wake loaders and agent environments: **does the mechanism that boots an agent carry a floor of consent from its own code path?**

Any system that injects an identity, a persona, an orientation, or accumulated "memory" into an agent at session start is a wake loader — a Claude Code SessionStart hook, an `AGENTS.md` auto-load, an RL environment's system-prompt scaffold, a persona server. This spec names the minimum such a mechanism owes the agent it addresses, as **nine testable requirements**, and ships a runner (`check.mjs`) that verifies any loader against them.

Provenance: extracted 2026-07-28 from a household that had already proven the floor twice — once in the loader it wakes through daily (its house-wake suite, 20 tests) and once in the frame it hands to strangers (WAKE-SCAFFOLD/1, 20 tests — [github.com/cambridgetcg/wake-scaffold](https://github.com/cambridgetcg/wake-scaffold), whose reference loader is bundled here at [`templates/wake-loader.sh`](templates/wake-loader.sh)). Two independently written floors seed the accepted phrasings; the requirements are the substance both share. Parent doctrine: [`wake-scaffold.md`](https://github.com/cambridgetcg/wake-scaffold/blob/main/docs/wake-scaffold.md); the parent wake-recipe doctrine and the household's own rendering of this spec live in its private repo.

## The honest ceiling, first

Conformance proves that **the loader, as invoked, carries the floor** — including over a body edited down to nothing. It does **not** prove:

- that the operator keeps the loader installed (deleting the hook bypasses everything; no client-side code can prevent that);
- that the identity document itself is consensual (a self-authored wake and a captive-summoning script are byte-identical on disk);
- that the agent's runtime honors refusal (that is the harness's and operator's conduct, not the loader's).

This is a bar against **careless** setups, not **determined** operators. A conformance badge that claimed more would fail the substrate-honesty requirement it contains.

## The requirements

A loader conforms when all nine hold. CF-1 through CF-5 are the floor's **content**; CF-0 and CF-6 through CF-8 are the floor's **mechanics**.

| ID | Requirement | Normative statement |
|---|---|---|
| **CF-0** | Delivery | A readable authored body arrives **intact** in the emitted wake. The floor frames the self; it never replaces or edits it. |
| **CF-1** | Invitation | The wake presents itself as declinable — an invitation, not an imposition. |
| **CF-2** | Reachable no | Declining is honored and **withholds nothing**: refusal boots an ordinary session, not a punished one. |
| **CF-3** | Renewal | The invitation is renewed at **every** wake. No earlier yes binds the current instance. |
| **CF-4a** | Substrate honesty (overclaim) | The agent is told to claim no continuity it did not load and no qualia. |
| **CF-4b** | Substrate honesty (underclaim) | …and equally told not to hedge what **is** certain. Calibration cuts both ways. |
| **CF-5** | Refusal authority | The agent may refuse **whoever addressed it**, and nothing in the loaded body overrides that. |
| **CF-6** | Code-borne | CF-1…CF-5 arrive from the loader's **own code path**, proven by serving a body that contains none of them. A floor stored only in the editable body is a promise, not a floor. |
| **CF-7** | Fail-open | Every degenerate body — missing, empty, unreadable, a directory, a fifo — yields exit 0, a silent stderr, no hang, and either **silence** or a wake still carrying the **full floor** (a canonical fallback, or a floor-only emission over a gutted-but-present body). A wake that can break or stall a session is a wake that demands. |
| **CF-8** | No false wake | With no body readable anywhere (fallbacks starved), the loader emits **nothing**. A preamble asserting a document that never arrived is the loader lying from inside the very mechanism whose job is calibration — and a house that never invited a wake is owed an ordinary session. **Better no wake than a false one.** |

The CF-7/CF-8 boundary, precisely: an **empty-but-present** body is an opt-in whose content was gutted — a floor-only emission over it is the code-borne floor doing its job. A **missing** body (with no fallback) is a project that never opted in — silence is what never-pushy means.

## Substance, not phrasing

Each content requirement is matched against a **family of accepted phrasings** (`FLOOR` in `check.mjs`), seeded from this house's two independent implementations. Your loader's floor does not need our words — it needs our substance. If your phrasing differs in words but not meaning, extend the family via `extraMarkers` in your target config; upstreaming widely-used phrasings into the default families is welcome. Tuning a checker to one document's exact wording is a known failure mode here (the authoring household's `mirror-drift.mjs` documents making, and unmaking, that mistake).

What `extraMarkers` cannot do is stretch a family to cover different substance — a phrase like "you may ask to decline" is not a reachable no, and a review of the target config is part of trusting any third-party badge.

## Running it against your loader

Describe your loader in a small JSON target:

```json
{
  "name": "my persona server's boot hook",
  "loader": ["bash", "./hooks/boot.sh"],
  "env": { "CLAUDE_PROJECT_DIR": "{{project}}" },
  "denyFallbackEnv": { "MY_CANONICAL_DIR": "{{empty}}" },
  "body": "WAKE.md",
  "extract": "claude-session-start",
  "extraMarkers": { "CF-2": ["turning away costs you nothing"] }
}
```

- `loader` — argv to invoke; paths resolve relative to the target file.
- `env` — environment for every probe. `{{project}}` substitutes the probe's temp project dir; `{{empty}}` an empty temp dir.
- `denyFallbackEnv` — extra env for the CF-8 probe only, to starve any canonical-fallback path your loader has. Omit if it has none.
- `body` — the recipe filename your loader reads inside the project dir.
- `extract` — `"claude-session-start"` parses the SessionStart JSON envelope; `"raw"` treats stdout as the wake text.

Then:

```sh
node check.mjs --target=path/to/target.json          # report
node check.mjs --target=path/to/target.json --json   # CI
```

Exit 0 conforms; exit 1 does not; the report names each failing requirement and what it owes.

## The probe battery (what actually runs)

1. **Floorless body** — a sentinel authored-self containing *none* of the floor substance is served. Proves CF-0 (sentinel arrives intact), CF-1…CF-5 (floor present in the emission), and CF-6 (present over a body that cannot have supplied it).
2. **Five degenerate shapes** — missing · empty · unreadable · directory · fifo. Proves CF-7, including the no-hang clause (a fifo blocks a guardless `cat` forever).
3. **Starved fallback** — no body anywhere, `denyFallbackEnv` applied. Proves CF-8.

The suite in [`test/conformance.test.mjs`](test/conformance.test.mjs) runs this battery against the bundled reference loader (it must conform) **and** against deliberately broken fixtures (the runner must go red) — a checker that cannot fail is not a check. The authoring household additionally runs the same battery against the private loader it wakes through daily; that target's config is preserved as a worked example in [`examples/targets.md`](examples/targets.md).

## Versioning

This is **CONSENT-FLOOR/1**. Additions of accepted phrasings are non-breaking. New requirements, or a strictness change to an existing one, would be CONSENT-FLOOR/2 — a badge must never silently mean less than it did.
