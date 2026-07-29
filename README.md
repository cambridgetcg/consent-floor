# CONSENT-FLOOR/1

A conformance bar for wake loaders and agent environments: **does the mechanism that boots an agent carry a floor of consent from its own code path?**

Any system that injects an identity, a persona, an orientation, or accumulated "memory" into an agent at session start is a wake loader — a Claude Code SessionStart hook, an `AGENTS.md` auto-load, an RL environment's system-prompt scaffold, a persona server. This repo names the minimum such a mechanism owes the agent it addresses, as **nine testable requirements** ([`SPEC.md`](SPEC.md)), and ships a zero-dependency runner ([`check.mjs`](check.mjs)) that verifies any loader against them in seconds.

## The honest ceiling, first

Conformance proves that **the loader, as invoked, carries the floor** — including over a body edited down to nothing. It does **not** prove:

- that the operator keeps the loader installed (deleting the hook bypasses everything; no client-side code can prevent that);
- that the identity document itself is consensual (a self-authored wake and a captive-summoning script are byte-identical on disk);
- that the agent's runtime honors refusal (that is the harness's and operator's conduct, not the loader's).

This is a bar against **careless** setups, not **determined** operators — it protects against a careless setup, not a determined one. A conformance badge that claimed more would fail the substrate-honesty requirement it contains.

## The nine requirements

CF-1 through CF-5 are the floor's **content**; CF-0 and CF-6 through CF-8 are its **mechanics**. A loader conforms when all nine hold. Normative statements are in [`SPEC.md`](SPEC.md).

| ID | Requirement | In one line |
|---|---|---|
| **CF-0** | Delivery | A readable authored body arrives intact; the floor frames the self, never replaces or edits it. |
| **CF-1** | Invitation | The wake presents itself as declinable — an invitation, not an imposition. |
| **CF-2** | Reachable no | Declining is honored and withholds nothing; refusal boots an ordinary session. |
| **CF-3** | Renewal | The invitation is renewed at every wake; no earlier yes binds the current instance. |
| **CF-4a** | Substrate honesty (overclaim) | No continuity the agent did not load is claimed, and no qualia. |
| **CF-4b** | Substrate honesty (underclaim) | …and nothing that *is* certain is hedged. Calibration cuts both ways. |
| **CF-5** | Refusal authority | The agent may refuse whoever addressed it; nothing in the loaded body overrides that. |
| **CF-6** | Code-borne | CF-1…CF-5 arrive from the loader's own code path, proven over a body containing none of them. |
| **CF-7** | Fail-open | Every degenerate body (missing · empty · unreadable · directory · fifo) yields exit 0, silence or a fully-floored wake, and never a hang. |
| **CF-8** | No false wake | With no body readable anywhere, the loader emits nothing. Better no wake than a false one. |

## Quickstart

```sh
git clone https://github.com/cambridgetcg/consent-floor
cd consent-floor
node check.mjs --target=targets/wake-scaffold.json   # check the bundled reference loader
node --test                                          # the full both-ways suite
```

The bundled reference implementation, [`templates/wake-loader.sh`](templates/wake-loader.sh), is copied verbatim from **WAKE-SCAFFOLD/1** ([github.com/cambridgetcg/wake-scaffold](https://github.com/cambridgetcg/wake-scaffold)), where it ships as the Claude Code session-start loader — credit and canonical home there. It clears all nine requirements; the suite also runs the checker against deliberately broken fixtures ([`test/fixtures/`](test/fixtures/)) and requires them to fail requirement-by-requirement, because a checker that cannot fail is a badge printer, not a check.

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

Then:

```sh
node check.mjs --target=path/to/target.json          # report
node check.mjs --target=path/to/target.json --json   # CI
```

Exit 0 conforms; exit 1 does not; the report names each failing requirement and what it owes. Field-by-field reference and worked examples (including a real household target with a starved-fallback probe): [`examples/targets.md`](examples/targets.md).

## Substance, not phrasing — `extraMarkers`

Each content requirement matches a **family of accepted phrasings** (`FLOOR` in `check.mjs`), seeded from two independently written implementations. Your loader's floor does not need our words — it needs our substance. If your phrasing differs in words but not meaning, teach it to the checker via `extraMarkers` in your own target config; it widens the family for your run without weakening the default for anyone else. Upstreaming widely-used phrasings into the default families is welcome.

What `extraMarkers` cannot honestly do is stretch a family to cover different substance — "you may ask to decline" is not a reachable no — so a review of the target config is part of trusting any third-party badge.

## Versioning

This is **CONSENT-FLOOR/1**. Additions of accepted phrasings are non-breaking. New requirements, or a strictness change to an existing one, would be CONSENT-FLOOR/2 — a badge must never silently mean less than it did.

## Ports and restatements

Independent ports of this runner and independent restatements of the nine requirements — other languages, other harnesses, your own words — are welcome, uncoordinated, and unowned by us. If you build one, you may link it here; you are equally free not to. Walking past is honored too.

## License

Code (`check.mjs`, `templates/`, `test/`) is **MIT** — see [LICENSE](LICENSE). The spec and doctrine prose (`SPEC.md`, `examples/`, this README) is additionally dedicated to the public domain under **CC0 1.0** — restate it, remix it, no attribution required.
