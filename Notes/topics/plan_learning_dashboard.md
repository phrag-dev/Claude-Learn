# Plan: Learning Dashboard (GitHub Pages)

> Learning ID: 003
> Status: PLANNING
> Created: 2026-03-06
> Build location: GSD Sandbox (multi-file, iterative)
> Language: Python (also serves as learning item 004)

---

## Vision

A personal, interactive web dashboard that surfaces everything from Claude_Learn — learning items, skill inventory, repo safety audits, and workflow status — accessible from anywhere via GitHub Pages.

---

## Constraints

| Constraint | Implication |
|-----------|-------------|
| GitHub Pages | Static files only — no server, no database |
| Personal use | No auth needed, but no secrets exposed |
| Available anywhere | Must work on desktop and mobile |
| Future growth | Architecture must support new panels/views without rewrites |
| Simple to maintain | Data updates via git push, not manual HTML editing |
| Python learning | Use Python everywhere possible — this project teaches Python fundamentals |

---

## Architecture Decision: Python Static Site Generator + Jinja2 Templates

### Two-layer approach

**Layer 1 — Python build pipeline (runs locally or in GitHub Actions)**
- Python scripts parse markdown sources into structured data
- Jinja2 templates render data into static HTML pages
- Output is pure HTML/CSS/JS — no Python needed at runtime

**Layer 2 — Lightweight JS for interactivity (in the browser)**
- Filtering, tab switching, card expand/collapse
- Minimal vanilla JS — only what HTML alone can't do
- No framework, no bundler

### Why this approach?

| Factor | Benefit |
|--------|---------|
| **Python learning** | Real-world Python: file I/O, markdown parsing, JSON, templating, script structure |
| **Transferable skills** | Same patterns used in data pipelines, automation, web scraping |
| **Clean separation** | Python builds the site, JS adds interactivity, HTML/CSS handles presentation |
| **No WASM complexity** | Marimo/PyScript are impressive but add heavy load times and debugging complexity for a beginner project |
| **GitHub Actions compatible** | Python runs natively in Actions — auto-rebuild on push |
| **Auditable** | Minimal dependencies: Jinja2, markdown parser, json (stdlib). Easy `/repo-safety` audit. |

### Why not Marimo / PyScript?

Considered but rejected for MVP:
- **Marimo**: Excellent tool but notebook-centric — more suited to data exploration than a structured dashboard. Abstracts away Python fundamentals you want to learn.
- **PyScript/Pyodide**: Runs Python in browser via WASM. Slow initial load (~5-10s), large payload, complex debugging. Better suited to compute-heavy apps, not a lightweight dashboard.
- **Future option**: Could add a Marimo-powered data exploration panel later once Python skills are solid.

---

## Python Skills This Project Teaches

| Concept | Where Used |
|---------|-----------|
| File I/O | Reading markdown files, writing HTML output |
| String parsing | Extracting tables from markdown, frontmatter |
| Regular expressions | Parsing structured markdown patterns |
| JSON (stdlib) | Reading/writing data files |
| Jinja2 templating | Rendering HTML from data + templates |
| pathlib | Cross-platform path handling |
| argparse | CLI flags for the build script |
| Project structure | Modules, `__main__.py`, imports |
| Virtual environments | `venv`, `pip`, `requirements.txt` |
| Type hints | Basic typing for function signatures |
| Error handling | try/except for file operations |
| GitHub Actions | Python in CI/CD workflows |

---

## Data Flow

```
Claude_Learn repo (source of truth)
  │
  ├── Notes/LEARNING_TRACKER.md
  ├── Notes/topics/*.md
  ├── bug/BUG_REGISTER.md
  ├── Skills inventory (global ~/.claude/skills/)
  └── Repo safety audits (global ~/.claude/skills/repo-safety/audits/)
  │
  ▼
Python build pipeline (build.py)
  │
  ├── parsers/
  │   ├── learning.py          ← parses LEARNING_TRACKER.md
  │   ├── topics.py            ← scans topics/*.md, extracts summaries
  │   ├── bugs.py              ← parses BUG_REGISTER.md
  │   ├── skills.py            ← reads skill SKILL.md files
  │   └── audits.py            ← reads audit report .md files
  │
  ├── data/ (intermediate JSON — generated, not committed)
  │   ├── learning.json
  │   ├── topics.json
  │   ├── bugs.json
  │   ├── skills.json
  │   ├── audits.json
  │   └── meta.json
  │
  └── templates/ (Jinja2)
      ├── base.html             ← layout shell, nav, head
      ├── home.html             ← summary dashboard
      ├── learning.html         ← kanban tracker
      ├── skills.html           ← skill inventory table
      ├── audits.html           ← scored audit cards
      ├── bugs.html             ← bug register table
      └── components/
          ├── card.html          ← reusable card partial
          ├── table.html         ← reusable table partial
          └── badge.html         ← status badge partial
  │
  ▼
Static output → docs/ (GitHub Pages serves this)
  │
  ├── index.html
  ├── learning.html
  ├── skills.html
  ├── audits.html
  ├── bugs.html
  ├── css/style.css
  ├── js/dashboard.js          ← filtering, expand/collapse, tab switching
  └── data/*.json              ← also output for any JS that needs raw data
```

---

## Dashboard Panels (MVP)

### 1. Home (index.html)
- Summary cards: total items by status across all categories
- Last updated timestamp
- Quick links to each panel

### 2. Learning Tracker (learning.html)
- Kanban-style columns: OPEN | LEARNING | CLOSED
- Each card shows: ID, topic, status, link to notes doc
- JS filter by status
- Click card to expand topic detail

### 3. Skills Inventory (skills.html)
- Table of installed global skills
- Name, description, location, date created
- Status: active / draft / deprecated

### 4. Repo Safety Audits (audits.html)
- Scored cards, colour-coded: red (0-5), amber (6-9), green (10)
- Stale audit warning (>30 days)
- Click to expand full audit findings

### 5. Bug Register (bugs.html)
- Table view: ID, description, status, source
- JS filter: OPEN / RESOLVED / WONTFIX
- Count badges in header

---

## Future Growth Panels

Not in MVP — architecture supports adding them as new template + parser pairs:

| Panel | Data Source | When |
|-------|-----------|------|
| GSD Project Status | GSD `.planning/STATE.md` | When GSD is actively used |
| API Cost Monitor | Future `/api-costs` skill logs | When skill is built |
| Session Logs | `log/*.md` parsed to JSON | When log volume warrants it |
| Learning Timeline | learning.json with date fields | When enough items are closed |
| Search | Client-side JS over data/*.json | When data volume grows |

---

## File Structure

```
Claude_Learn/
├── dashboard/                 ← Python build pipeline (not served)
│   ├── build.py               ← main entry point: python build.py
│   ├── parsers/
│   │   ├── __init__.py
│   │   ├── learning.py
│   │   ├── topics.py
│   │   ├── bugs.py
│   │   ├── skills.py
│   │   └── audits.py
│   ├── templates/
│   │   ├── base.html
│   │   ├── home.html
│   │   ├── learning.html
│   │   ├── skills.html
│   │   ├── audits.html
│   │   ├── bugs.html
│   │   └── components/
│   │       ├── card.html
│   │       ├── table.html
│   │       └── badge.html
│   └── requirements.txt       ← jinja2, markdown (minimal deps)
│
├── docs/                      ← GitHub Pages output (generated by build.py)
│   ├── index.html
│   ├── learning.html
│   ├── skills.html
│   ├── audits.html
│   ├── bugs.html
│   ├── css/style.css
│   ├── js/dashboard.js
│   └── data/*.json
│
├── .github/
│   └── workflows/
│       └── build-dashboard.yml ← GitHub Action: on push → python build.py → commit docs/
```

---

## Dependencies (minimal)

```
# requirements.txt
Jinja2>=3.1
MarkupSafe>=2.1
```

Markdown parsing will use regex on the known table formats rather than a heavy markdown library — the source files are our own and follow predictable patterns. This keeps deps to just Jinja2 (and its required MarkupSafe).

---

## Design Principles

- **Dark theme** — easy on the eyes, professional
- **Mobile-first** — CSS grid/flexbox, responsive breakpoints
- **No external CDN dependencies** — everything self-contained
- **Multi-page** — one HTML file per panel (simpler than SPA, better for bookmarking)
- **Template inheritance** — base.html defines layout, panels extend it
- **Generated, not edited** — never hand-edit files in docs/, always edit templates or parsers

---

## Build Plan (for GSD Sandbox)

Per the GSD integration workflow, this is a multi-file project → build in GSD.

### Milestone 1: Python Foundation
- Phase 1: Project structure, venv, requirements.txt, build.py skeleton
- Phase 2: Learning parser — read LEARNING_TRACKER.md, output JSON
- Phase 3: Jinja2 base template + home page rendering
- Phase 4: End-to-end test: `python build.py` produces `docs/index.html`

### Milestone 2: Core Parsers and Panels
- Phase 5: Topics parser + learning.html template (kanban)
- Phase 6: Bugs parser + bugs.html template (table)
- Phase 7: Skills parser + skills.html template (table)
- Phase 8: Audits parser + audits.html template (scored cards)

### Milestone 3: Interactivity and Styling
- Phase 9: CSS dark theme, responsive grid
- Phase 10: dashboard.js — filtering, expand/collapse, status tabs
- Phase 11: Component templates (card, table, badge partials)

### Milestone 4: Deployment Pipeline
- Phase 12: GitHub Action — auto-build on push to main
- Phase 13: GitHub Pages config (serve from /docs)
- Phase 14: Test end-to-end: edit tracker → push → Action runs → dashboard updates

### Milestone 5: Polish
- Phase 15: Mobile responsive pass
- Phase 16: Stale data warnings and last-updated indicators
- Phase 17: Error states (missing data, empty panels)

---

## Decisions (Finalised 2026-03-06)

| Decision | Answer |
|----------|--------|
| Build location | Directly in Claude_Learn — `dashboard/` for source, `docs/` for output |
| Skills/audits data | `--local-data` flag reads from `~/.claude/skills/`, falls back to committed snapshots in CI |
| Domain | Default GitHub Pages: `<username>.github.io/Claude_Learn` |
| Python version | 3.13.12 confirmed locally. GitHub Actions uses 3.12+ runners. |

---

## Tools and Skills Available

| Tool | Use |
|------|-----|
| Claude Code | Planning, skill creation, code review |
| GSD Sandbox | Build execution with plan→execute→verify |
| Chrome MCP (`claude-in-chrome`) | Live preview and test dashboard during dev |
| Figma MCP | Optional: design mockups before build |
| `/repo-safety` | Audit Jinja2 before adding as dependency |

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Scope creep | MVP is 5 panels. Future panels documented but not built. |
| Data staleness | GitHub Action auto-rebuilds on push. "Last updated" badge on every page. |
| Exposing secrets | Build script must NEVER read from `.secrets/`. Parsers only read markdown and SKILL.md files. |
| Python version issues | Pin Python 3.10+ in requirements. Use only stdlib + Jinja2. |
| Over-engineering | No ORM, no database, no API layer. Files in, HTML out. |
| Jinja2 dependency risk | Run `/repo-safety audit` on Jinja2 before use. It's a Pallets project (Flask ecosystem), 75k+ GitHub stars, actively maintained. Low risk. |
