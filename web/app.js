/* Security Toolkit — faceted tool console. Vanilla JS, no dependencies.
   Data comes from data.js (window.TOOLS / TAGMETA / AXES). */
(function () {
  "use strict";

  const TOOLS = window.TOOLS || [];
  const TAGMETA = window.TAGMETA || {};
  const AXES = window.AXES || ["tactic","target","function","reference","language"];
  const REPO_PATH = "./repos";           // shown in the clone/cd hints
  const RENDER_CAP = 50;                     // rows drawn at once (perf)

  // ---- precompute a lowercased search blob + axis-split tags per tool ----
  TOOLS.forEach(t => {
    t._name = t.name.toLowerCase();
    t._blob = (t.name + " " + (t.url || "") + " " + (t.desc || "") + " " +
               (t.tags || []).join(" ")).toLowerCase();
    t._byAxis = {};
    (t.tags || []).forEach(tag => {
      const ax = (TAGMETA[tag] || {}).axis || "other";
      (t._byAxis[ax] = t._byAxis[ax] || []).push(tag);
    });
  });

  // ---- state ----
  const state = { q: "", tags: new Set(), active: -1 };

  // ---- helpers ----
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // parse a github.com URL -> {owner, repo} (null for non-github hosts)
  function githubRepo(url) {
    const m = (url || "").match(/^https?:\/\/github\.com\/([^\/#?]+)\/([^\/#?]+)/i);
    return m ? { owner: m[1], repo: m[2].replace(/\.git$/, "") } : null;
  }

  // fetch + render README live from GitHub (server-rendered HTML, CORS-enabled).
  // cached in memory + sessionStorage to spare the 60-req/hr unauth rate limit.
  const readmeCache = {};
  function loadReadme(owner, repo, el) {
    const key = owner + "/" + repo;
    const hit = readmeCache[key] || sessionStorage.getItem("rm:" + key);
    if (hit) { readmeCache[key] = hit; el.innerHTML = hit; return; }
    el.innerHTML = '<div class="readme-status">loading README from github…</div>';
    fetch(`https://api.github.com/repos/${owner}/${repo}/readme`,
          { headers: { Accept: "application/vnd.github.html" } })
      .then(r => {
        if (r.status === 404) throw new Error("this repo has no README");
        if (r.status === 403) throw new Error("GitHub rate limit reached (60/hr) — try later");
        if (!r.ok) throw new Error("GitHub returned HTTP " + r.status);
        return r.text();
      })
      .then(html => {
        readmeCache[key] = html;
        try { sessionStorage.setItem("rm:" + key, html); } catch (e) {}
        if (document.body.contains(el)) el.innerHTML = html;   // ignore if navigated away
      })
      .catch(err => {
        if (!document.body.contains(el)) return;
        el.innerHTML = `<div class="readme-status">✕ ${esc(err.message)} ·
          <a href="https://github.com/${esc(owner)}/${esc(repo)}" target="_blank" rel="noreferrer">open on GitHub ↗</a></div>`;
      });
  }

  // ---- elements ----
  const $ = sel => document.querySelector(sel);
  const app = $("#app");
  const elSearch = $("#search");
  const elCount = $("#count");
  const elSidebar = $("#sidebar");
  const elMain = $("#main");

  // ---- filtering ----
  function filter() {
    const tokens = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    // AND across every selected tag: a tool must carry ALL of them
    const wanted = [...state.tags];

    const out = [];
    for (const t of TOOLS) {
      let ok = true;
      for (const tok of tokens) { if (t._blob.indexOf(tok) === -1) { ok = false; break; } }
      if (!ok) continue;
      for (const w of wanted) {
        if ((t.tags || []).indexOf(w) === -1) { ok = false; break; }
      }
      if (ok) out.push(t);
    }

    // rank: name-prefix > name-substring > rest (only when searching)
    if (tokens.length) {
      const q0 = tokens[0];
      out.sort((a, b) => rank(a, q0) - rank(b, q0) || a._name.localeCompare(b._name));
    } else {
      out.sort((a, b) => a._name.localeCompare(b._name));
    }
    return out;
  }
  function rank(t, q0) {
    if (t._name.startsWith(q0)) return 0;
    if (t._name.indexOf(q0) !== -1) return 1;
    return 2;
  }

  // ---- facet counts over current result set ----
  function facetCounts(results) {
    const counts = {};                       // axis -> {tag: n}
    AXES.forEach(ax => counts[ax] = {});
    for (const t of results) {
      for (const tag of (t.tags || [])) {
        const ax = (TAGMETA[tag] || {}).axis;
        if (ax && counts[ax]) counts[ax][tag] = (counts[ax][tag] || 0) + 1;
      }
    }
    return counts;
  }

  // ---- rendering: sidebar ----
  function renderSidebar(results) {
    const counts = facetCounts(results);
    let html = "";
    if (state.tags.size)
      html += `<button class="clear-filters" data-clear>✕ clear ${state.tags.size} filter${state.tags.size>1?"s":""}</button>`;
    for (const ax of AXES) {
      const entries = Object.entries(counts[ax]).sort((a, b) => b[1] - a[1]);
      // include selected tags even if 0 in current set
      state.tags.forEach(tag => {
        if ((TAGMETA[tag]||{}).axis === ax && !counts[ax][tag])
          entries.push([tag, 0]);
      });
      if (!entries.length) continue;
      html += `<div class="facet-group"><div class="facet-head">${ax}</div><div class="facet-list">`;
      for (const [tag, n] of entries) {
        const on = state.tags.has(tag) ? " on" : "";
        html += `<div class="facet${on}" data-tag="${esc(tag)}">
          <span class="facet-name">${esc(tag)}</span><span class="facet-n">${n}</span></div>`;
      }
      html += `</div></div>`;
    }
    elSidebar.innerHTML = html;
  }

  // ---- rendering: results list ----
  function renderList(results) {
    if (!results.length) {
      elMain.innerHTML = `<div class="empty">no tools match</div>`;
      return;
    }
    const shown = results.slice(0, RENDER_CAP);
    let html = `<div class="results">`;
    shown.forEach((t, i) => {
      const langs = (t._byAxis.language || []).join(" ");
      const tags = (t.tags || []).filter(tg => (TAGMETA[tg]||{}).axis !== "language")
        .map(tg => `<span class="tag t-${(TAGMETA[tg]||{}).axis||'other'}">${esc(tg)}</span>`).join("");
      html += `<div class="row" data-name="${esc(t.name)}" data-i="${i}">
        <div class="row-name">${esc(t.name)}</div>
        <div class="row-langs">${esc(langs)}</div>
        <div class="row-desc">${esc(t.desc || "")}</div>
        <div class="row-tags">${tags}</div>
      </div>`;
    });
    html += `</div>`;
    if (results.length > RENDER_CAP)
      html += `<div class="more-note">showing ${RENDER_CAP} of ${results.length} — refine your search</div>`;
    elMain.innerHTML = html;
    elMain.scrollTop = 0;
  }

  // ---- rendering: detail ----
  function renderDetail(name) {
    const t = TOOLS.find(x => x.name === name);
    if (!t) { location.hash = ""; return; }
    const clone = t.url ? `git clone ${t.url}` : null;
    const gh = githubRepo(t.url);
    let axesHtml = "";
    for (const ax of AXES) {
      const tags = t._byAxis[ax];
      if (!tags || !tags.length) continue;
      axesHtml += `<div class="d-axis-row"><span class="d-axis-name">${ax}</span>
        <div class="d-tags">${tags.map(tg =>
          `<span class="tag t-${ax}" data-tag="${esc(tg)}" title="${esc((TAGMETA[tg]||{}).desc||'')}">${esc(tg)}</span>`
        ).join("")}</div></div>`;
    }
    elMain.innerHTML = `<div class="detail">
      <button class="back" data-back>← back to results</button>
      <h1>${esc(t.name)}</h1>
      <p class="d-desc">${esc(t.desc || "(no description)")}</p>

      ${t.url ? `<div class="d-block"><div class="d-label">repository</div>
        <div class="cmd"><code><a href="${esc(t.url)}" target="_blank" rel="noreferrer">${esc(t.url)}</a></code>
          <button class="copy" data-copy="${esc(t.url)}">copy url</button></div></div>` : ""}

      ${clone ? `<div class="d-block"><div class="d-label">clone</div>
        <div class="cmd"><span class="prompt">$</span><code>${esc(clone)}</code>
          <button class="copy" data-copy="${esc(clone)}">copy</button></div></div>` : ""}

      <!-- <div class="d-block"><div class="d-label">local path</div>
        <div class="cmd"><span class="prompt">$</span><code class="path">cd ${esc(REPO_PATH)}/${esc(t.name)}</code>
          <button class="copy" data-copy="cd ${esc(REPO_PATH)}/${esc(t.name)}">copy</button></div></div>-->

      <div class="d-block"><div class="d-label">classification</div>${axesHtml || '<span class="path">untagged</span>'}</div>

      ${gh ? `<div class="d-block"><div class="d-label">readme
        <span class="readme-src">live from github ↗</span></div>
        <div class="readme" id="readme-body"></div></div>` : ""}
    </div>`;
    elMain.scrollTop = 0;
    if (gh) loadReadme(gh.owner, gh.repo, document.getElementById("readme-body"));
  }

  // ---- main refresh ----
  function refresh() {
    const results = filter();
    state.active = -1;
    elCount.textContent = results.length.toLocaleString() + " / " + TOOLS.length.toLocaleString();
    renderSidebar(results);
    if (!isDetail()) renderList(results);
    return results;
  }

  // ---- routing ----
  function isDetail() { return location.hash.startsWith("#/tool/"); }
  function route() {
    refresh();                                   // always builds the sidebar + count
    if (isDetail())                              // refresh() skips the list when in detail mode
      renderDetail(decodeURIComponent(location.hash.slice(7)));
  }

  // ---- events ----
  elSearch.addEventListener("input", () => {
    state.q = elSearch.value;
    if (isDetail()) location.hash = "";
    else refresh();
  });

  document.addEventListener("click", e => {
    // links inside the fetched README: keep them from hijacking the hash route
    const rmLink = e.target.closest(".readme a");
    if (rmLink) {
      const href = rmLink.getAttribute("href") || "";
      if (href.startsWith("#")) {                       // in-page anchor -> scroll, don't route
        e.preventDefault();
        const tgt = document.getElementById(href.slice(1));
        if (tgt) tgt.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {                                          // external -> new tab, keep app open
        e.preventDefault();
        window.open(rmLink.href, "_blank", "noopener");
      }
      return;
    }
    const tagEl = e.target.closest("[data-tag]");
    const rowEl = e.target.closest(".row");
    const copyEl = e.target.closest("[data-copy]");
    const backEl = e.target.closest("[data-back]");
    const clearEl = e.target.closest("[data-clear]");

    if (copyEl) { doCopy(copyEl); return; }
    if (backEl) { location.hash = ""; return; }
    if (clearEl) { state.tags.clear(); refresh(); return; }
    if (tagEl) {
      const tag = tagEl.getAttribute("data-tag");
      if (state.tags.has(tag)) state.tags.delete(tag); else state.tags.add(tag);
      if (isDetail()) location.hash = "";
      else refresh();
      return;
    }
    if (rowEl) { location.hash = "#/tool/" + encodeURIComponent(rowEl.getAttribute("data-name")); return; }
    // facet-head collapse
    const head = e.target.closest(".facet-head");
    if (head) { head.nextElementSibling.classList.toggle("collapsed"); }
    // close drawer when clicking scrim
    if (e.target.classList.contains("scrim")) app.classList.remove("drawer");
  });

  function doCopy(btn) {
    const text = btn.getAttribute("data-copy");
    navigator.clipboard.writeText(text).then(() => {
      const old = btn.textContent; btn.textContent = "copied ✓"; btn.classList.add("ok");
      setTimeout(() => { btn.textContent = old; btn.classList.remove("ok"); }, 1200);
    });
  }

  // ---- keyboard ----
  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement !== elSearch) { e.preventDefault(); elSearch.focus(); return; }
    if (e.key === "Escape") {
      if (isDetail()) { location.hash = ""; }
      else if (state.q || state.tags.size) { elSearch.value = ""; state.q = ""; state.tags.clear(); refresh(); }
      elSearch.blur(); return;
    }
    if (isDetail()) return;
    const rows = [...elMain.querySelectorAll(".row")];
    if (!rows.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      state.active += (e.key === "ArrowDown" ? 1 : -1);
      state.active = Math.max(0, Math.min(rows.length - 1, state.active));
      rows.forEach(r => r.classList.remove("active"));
      const r = rows[state.active]; r.classList.add("active");
      r.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && state.active >= 0) {
      location.hash = "#/tool/" + encodeURIComponent(rows[state.active].getAttribute("data-name"));
    }
  });

  // ---- theme ----
  const THEME_KEY = "arsenal-theme";
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(THEME_KEY, t);
  }
  $("#theme").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(cur === "dark" ? "light" : "dark");
  });
  (function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) setTheme(saved);
    else if (window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches) setTheme("light");
    else setTheme("dark");
  })();

  // ---- drawer (mobile) ----
  $("#menu").addEventListener("click", () => app.classList.toggle("drawer"));

  // ---- brand → home (clear search, filters, and any open detail) ----
  $(".brand").addEventListener("click", () => {
    elSearch.value = "";
    state.q = "";
    state.tags.clear();
    if (isDetail()) location.hash = "";   // hashchange → route → refresh
    else refresh();
    elMain.scrollTop = 0;
  });

  // ---- deep link: ?q= pre-fills search (powers the JSON-LD SearchAction) ----
  const qp = new URLSearchParams(location.search).get("q");
  if (qp) { elSearch.value = qp; state.q = qp; }

  // ---- go ----
  window.addEventListener("hashchange", route);
  route();
})();
