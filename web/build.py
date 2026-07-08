#!/usr/bin/env python3
"""Generate web/data.js from index.jsonl + tags.json.
Emits plain JS globals so the page works from file:// with no server.
Run this whenever index.jsonl changes (tool-add will call it)."""
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent 
WEB  = BASE / "web"
WEB.mkdir(exist_ok=True)

tools = [json.loads(l) for l in open(BASE / "index.jsonl", encoding="utf-8") if l.strip()]
tags  = json.load(open(BASE / "tags.json", encoding="utf-8"))

# canonical tag -> {axis, desc}
tagmeta = {t: {"axis": ax, "desc": m["desc"]}
           for ax, entries in tags.items() for t, m in entries.items()}
axes = ["tactic", "target", "function", "reference", "language"]

with open(WEB / "data.js", "w", encoding="utf-8") as f:
    f.write("window.TOOLS=")
    json.dump(tools, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\nwindow.TAGMETA=")
    json.dump(tagmeta, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\nwindow.AXES=")
    json.dump(axes, f)
    f.write(";\nwindow.BUILT=" + json.dumps(__import__("datetime").date.today().isoformat()) + ";\n")

print(f"wrote web/data.js — {len(tools)} tools, {len(tagmeta)} tags across {len(axes)} axes")
