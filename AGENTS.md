# Security Toolkit — Agent Guide

A curated, searchable arsenal of ~5,400 cybersecurity tools (mostly offensive).
Each tool is a git repo cloned locally, plus one metadata record. A static web app
provides faceted search. This file explains the layout, data model, and workflows so
an AI agent can operate the project safely.

> Successor to the old flat 23-category site (securitytoolkit.github.io). Physical
> categories were replaced by **multi-axis tags** — a tool is no longer filed in one
> folder; it carries many tags across several axes.

---

## Layout

```
Tools/
├── repos/<name>/        all tool repos, FLAT (no category dirs). ~127 GB. gitignored.
├── index.jsonl          the manifest — source of truth. one JSON record per line.
├── tags.json            the controlled tag vocabulary (5 axes). source of truth for tags.
├── bin/
│   └── tool-add         clone a repo → tag it → append to index → rebuild web data
├── web/                 static, dependency-free search app (open index.html directly)
│   ├── index.html  app.js  styles.css
│   ├── build.py         regenerates data.js from index.jsonl + tags.json
│   └── data.js          GENERATED (window.TOOLS/TAGMETA/AXES). gitignored.
├── .env                 ANTHROPIC_API_KEY=…  (optional STK_MODEL=…). gitignored.
└── .gitignore
```

## Data model — `index.jsonl`

One compact JSON object per line, **sorted by `name` (case-insensitive)**:

```json
{"name":"CrackMapExec","url":"https://github.com/byt3bl33d3r/CrackMapExec","tags":["active-directory","credential-access","lateral-movement","python","red-team"],"desc":"Post-exploitation tool for Windows/AD: credential dumping and lateral movement."}
```

- **`name`** — the folder name under `repos/`. So `repos/<name>` is the path; it is NOT stored separately.
- **`url`** — git remote, or `""` if the tool has no repo.
- **`tags`** — array of canonical tags; **every tag must exist in `tags.json`**. Sorted, deduped.
- **`desc`** — one concrete line, ≤ ~150 chars, no markdown/HTML.

**Invariants (keep these true):**
- Compact JSON (`separators=(",",":")`), one record per line.
- Sorted by `name.casefold()`.
- No duplicate names. No empty `tags`/`desc`. Every tag ∈ `tags.json`.

## Tag vocabulary — `tags.json`

Five **axes**; each maps a canonical tag → `{desc, aliases}` (the `language` axis also has `ext`):

| Axis | Meaning | Examples |
|------|---------|----------|
| `tactic` | MITRE kill-chain phase | `recon`, `credential-access`, `lateral-movement`, `impact` |
| `target` | platform / environment | `windows`, `active-directory`, `cloud`, `web`, `wifi` |
| `function` | kind of tool / capability | `scanner`, `c2`, `exploit`, `red-team`, `blue-team`, `detection` |
| `reference` | non-runnable artifacts | `cheatsheet`, `awesome-list`, `writeup`, `payloads`, `wordlist` |
| `language` | implementation language | `python`, `go`, `powershell`, `c`, `rust` (auto-detected offline) |

- **Aliases** absorb drift: a resolver maps any alias → its canonical tag (e.g. `reconnaissance`→`recon`, `sigma`→`detection`, `azure`→`cloud`). The model's output is normalized through this, and unknown tags are dropped.
- **`language` extensions** live here too (`"ext": [".py"]`) — `tool-add` derives its file-extension→language map from this file. Add a language in ONE place.
- A tag earns its place by **partitioning** the collection (useful filter), not just being a valid concept. `desc`/full-text search handles fine detail; tags are coarse facets.
- To rename/remove a tag: edit `tags.json`, then sweep `index.jsonl` (`jq` map) so no record references the old spelling. To add an axis: add a top-level key (validation/prompts iterate axes generically).

## Workflows

### Add tools
```bash
bin/tool-add https://github.com/user/repo            # one
bin/tool-add <url1> <url2> ...                       # many
bin/tool-add <url> --dry-run                          # preview naming/dedupe, no writes
STK_MODEL=claude-opus-4-8 bin/tool-add <url>          # stronger tagging model
```
For each URL it: dedupes by URL (skip if present) → picks a non-colliding name
(`repo`, else `repo-owner`, matching existing convention) → `git clone --depth 1`
into `repos/` → detects languages offline → asks the model for tags (from `tags.json`)
+ a description → normalizes → inserts into `index.jsonl` (sorted) → rebuilds `web/data.js`.
If the API is unavailable it falls back to language-only tags + README first line and warns.

### Rebuild the web data after any manual edit to index.jsonl
```bash
python3 web/build.py
```

### Validate the index (run after bulk changes)
```bash
python3 - <<'PY'
import json
tags=json.load(open("tags.json")); axis={t:a for a,e in tags.items() for t in e}; valid=set(axis)
recs=[json.loads(l) for l in open("index.jsonl")]
bad=[(r["name"],t) for r in recs for t in r["tags"] if t not in valid]
nosem=[r["name"] for r in recs if not [t for t in r["tags"] if axis.get(t)!="language"]]
names=[r["name"] for r in recs]
print("tools",len(recs),"| invalid tags",len(bad),"| no-semantic",len(nosem),
      "| dupes",len(names)-len(set(names)),"| sorted",names==sorted(names,key=str.casefold))
PY
```

## Critical gotchas

1. **NEVER run two index-writing scripts at once** (`tool-add`, manual writes).
   Each does load-all → modify → sort → rewrite; concurrent runs clobber each other and
   corrupt `index.jsonl`. Serialize — wait for one to finish (or queue) before the next.
2. **Long batches write `index.jsonl` only at the end.** Mid-run the file looks unchanged;
   that's normal, not a failure. (An interrupted batch loses in-flight work but is resumable
   via URL-dedupe — just re-run with the same URL list.)
3. **API key** comes from `.env` (loaded automatically) or a real `ANTHROPIC_API_KEY` env var
   (env wins). Never commit it; `.env` is gitignored.
4. **Rate limiting** on big batches → some calls fail after retries and fall back to offline
   tagging (language-only tags, weak desc). Re-tag those records afterward.
5. **Clone failures** = the repo is deleted/renamed/private on GitHub (`could not read Username`).
   Skipped cleanly; nothing to fix locally.
6. **Model default** is `claude-sonnet-4-6` (override with `STK_MODEL`). Tags are always
   normalized against `tags.json`; the model cannot introduce new tags.
7. **`web/data.js` is generated** — never edit by hand; run `web/build.py`. If hosting `web/`
   on GitHub Pages, un-gitignore `data.js` (Pages can't run the build step).

## Web app (web/)

Vanilla HTML/CSS/JS, zero dependencies, works from `file://` (data is loaded via `data.js`,
not `fetch`). Faceted search over all fields; click axis facets to stack **AND** filters;
tool detail view has copy buttons and loads the live README from GitHub's API. Theme is
light/dark. Design is deliberately hand-styled (green-on-charcoal "console"), not a framework
template. Open with `xdg-open web/index.html` or serve the dir statically.
