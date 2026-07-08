# 🛡 Security Toolkit

A fast, searchable directory of **5,300+ offensive and defensive cybersecurity tools**.

**Live:** https://securitytoolkit.github.io/

## Features

- **Full-text search** across names, descriptions, tags, URLs, and languages
- **Faceted filters** by MITRE ATT&CK tactic, target platform, function, and language (stack filters with AND)
- **Tool pages** with a copy-ready `git clone` command and the README loaded live from GitHub
- **Offline-friendly, no build step** — plain HTML/CSS/JS, opens straight from `file://`
- Light / dark theme, keyboard shortcuts (`/` to search, `↑/↓` to navigate)

## How it works

Every tool is one record in `index.jsonl` (`name`, `url`, `tags`, `desc`), tagged against a
controlled vocabulary in `tags.json` (5 axes: tactic, target, function, reference, language).
The web app (`web/`) reads a generated `web/data.js` and does all search client-side.

```
web/          static search app (index.html, app.js, styles.css)
index.jsonl   the tool manifest
tags.json     the tag vocabulary
```

Regenerate the site data after editing the manifest:

```bash
python3 web/build.py
```


## Author

Built by [João Varelas](https://vrls.ws) —
[GitHub](https://github.com/joaovarelas) ·
[LinkedIn](https://linkedin.com/in/joaovarelas)



## Disclaimer

All tools listed here are indexed from **public repositories** and are **not authored,
maintained, hosted, or vetted** by this project. They are provided **as-is**, for
**education, research, and authorized security testing only**.

No warranty is given and **no responsibility is accepted** for malicious code, malware,
viruses, data loss, malfunctioning software, or any damage arising from their use — nor for
any **illegal or unauthorized use** of this collection. You are solely responsible for
complying with all applicable laws and for only testing systems you own or are explicitly
authorized to test.