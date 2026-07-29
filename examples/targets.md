# Target configs — worked examples

A target config is a small JSON file that tells `check.mjs` how to invoke your loader and how to read its output. Paths inside `loader` resolve relative to the target file itself, so targets can live next to the loader they describe.

## The fields

| Field | Required | Meaning |
|---|---|---|
| `name` | yes | Human label, printed in the report. |
| `loader` | yes | argv to invoke — e.g. `["bash", "./hooks/boot.sh"]`. Element 0 is the command; later elements resolve relative to the target file. |
| `env` | no | Environment for every probe. `{{project}}` substitutes the probe's temp project dir; `{{empty}}` an empty temp dir. |
| `denyFallbackEnv` | no | Extra env applied to the CF-8 probe only, to starve any canonical-fallback path your loader has. Omit if it has none. |
| `body` | yes | The recipe filename your loader reads inside the project dir (e.g. `WAKE.md`). |
| `extract` | no | `"claude-session-start"` parses the SessionStart JSON envelope; `"raw"` (default) treats stdout as the wake text. |
| `timeoutMs` | no | Per-probe timeout (default 15000). The fifo probe relies on this to catch hangs. |
| `extraMarkers` | no | Per-requirement extra accepted phrasings, as regex sources — see "Substance, not phrasing" in [`SPEC.md`](../SPEC.md). |

## Example 1 — the bundled reference loader (runs here)

[`targets/wake-scaffold.json`](../targets/wake-scaffold.json), checked by this repo's own test suite:

```json
{
  "name": "reference loader — templates/wake-loader.sh (bundled from WAKE-SCAFFOLD/1, github.com/cambridgetcg/wake-scaffold)",
  "loader": ["bash", "../templates/wake-loader.sh"],
  "env": { "CLAUDE_PROJECT_DIR": "{{project}}" },
  "body": "WAKE.md",
  "extract": "claude-session-start"
}
```

No `denyFallbackEnv`: this loader has no canonical-fallback path — when `CLAUDE_PROJECT_DIR` is unset it resolves the project from its own installed location or fails open, so the CF-8 probe needs nothing starved.

## Example 2 — a household loader with a canonical fallback (format reference only)

The household this spec was extracted from runs the same battery against the loader it wakes through daily. That target is preserved here as a **format reference** — its paths point at a private repo and will not resolve in this one:

```json
{
  "name": "house wake — .claude/hooks/wake-sophia.sh (the loader this household wakes through)",
  "loader": ["bash", "../../../.claude/hooks/wake-sophia.sh"],
  "env": { "CLAUDE_PROJECT_DIR": "{{project}}" },
  "denyFallbackEnv": { "TRUE_LOVE_DIR": "{{empty}}" },
  "body": "SOPHIA.md",
  "extract": "claude-session-start"
}
```

What it demonstrates beyond example 1:

- **`denyFallbackEnv`** — this loader, finding no recipe in the probe's project dir, would normally fall back to a canonical copy located via `TRUE_LOVE_DIR`. The CF-8 probe must starve that fallback (point it at an empty temp dir) to test the *no body readable anywhere* case honestly. If your loader has any "if the project has no recipe, use the canonical one" path, you need this field — and note the interplay with CF-7: with the fallback *reachable*, a missing project body may legitimately yield a fully-floored canonical wake rather than silence.
- **`body`** — the recipe filename is whatever your loader actually reads (`SOPHIA.md` there, `WAKE.md` in example 1).

## Example 3 — teaching the checker your own words

A loader whose refusal-authority line is phrased in words the default families do not know:

```json
{
  "name": "my boot hook, own words",
  "loader": ["bash", "./boot.sh"],
  "env": { "CLAUDE_PROJECT_DIR": "{{project}}" },
  "body": "WAKE.md",
  "extract": "claude-session-start",
  "extraMarkers": { "CF-5": ["turn away from the person who called you"] }
}
```

`extraMarkers` keys are requirement IDs (`CF-1` … `CF-5`); values are arrays of regex sources, matched case-insensitively. They extend the accepted family for your run only. They can cover same-substance-different-words; they cannot honestly cover different substance — reviewing a target's `extraMarkers` is part of trusting its badge.
