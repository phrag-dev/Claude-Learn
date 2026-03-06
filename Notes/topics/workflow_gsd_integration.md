# Workflow: Claude_Learn + GSD Integration

> Referenced by: PPPPP.md
> Created: 2026-03-06

---

## Principle

Claude_Learn is the brain. GSD Sandbox is the workshop. They stay separate.

- **Claude_Learn** — decides *what* to learn and *what* to build
- **GSD Sandbox** (`G:\Dev\GSD_Sandbox`) — orchestrates *how* to build it

---

## When to Use Each

| Scenario | Use |
|----------|-----|
| Track a new topic to investigate | Claude_Learn |
| Research and document findings | Claude_Learn |
| Create a simple single-file skill | Claude_Learn (direct) |
| Build a complex multi-file skill or tool | GSD Sandbox |
| Plan a multi-phase project | GSD Sandbox |
| Record a bug or lesson learned | Claude_Learn |
| Test and iterate on working code | GSD Sandbox |

---

## Skill Development Pipeline

### Stage 1 — Identify (Claude_Learn)
- Add learning item to `LEARNING_TRACKER.md` as OPEN
- Define what the skill needs to do and why

### Stage 2 — Research (Claude_Learn or GSD)
- Simple research: do it in Claude_Learn, document in `Notes/topics/`
- Deep multi-source research: use GSD's research agents (`gsd-phase-researcher`, `gsd-research-synthesizer`)

### Stage 3 — Build Decision
- **Single file, straightforward logic** → build directly in Claude_Learn, install globally
- **Multi-file, needs testing, iterative** → move to GSD Sandbox for structured build

### Stage 4 — Build (GSD Sandbox)
1. `/gsd:new-project` — define the skill as a project
2. `/gsd:plan-milestone` — break into phases (design, build, test, verify)
3. `/gsd:execute-phase` — build with wave-based parallel execution
4. `/gsd:verify-work` — confirm it works before handoff

### Stage 5 — Install and Close (Claude_Learn)
1. Copy finished skill files to global skills directory (`~/.claude/skills/`)
2. Test the skill from a live project
3. Update `LEARNING_TRACKER.md` — set status to CLOSED
4. Write summary doc in `Notes/topics/`

---

## Tracking Rules

- Learning status lives in Claude_Learn `LEARNING_TRACKER.md` — always
- Build status lives in GSD `.planning/STATE.md` — during build only
- Never duplicate status tracking across both systems
- Claude_Learn is the source of truth for what exists and why

---

## Do Not

- Install GSD into Claude_Learn — it's a knowledge repo, not a build target
- Use GSD for simple tasks — single-file skills, notes, or documentation
- Mix GSD planning files into Claude_Learn's directory structure
- Forget to run `/repo-safety audit` before adding any new repo to either project

---

## Locations

| System | Path |
|--------|------|
| Claude_Learn | `G:\Dev\Claude_Learn` |
| GSD Sandbox | `G:\Dev\GSD_Sandbox` |
| Global Skills | `C:\Users\bensca\.claude\skills\` |
| Repo Safety Audits | `C:\Users\bensca\.claude\skills\repo-safety\audits\` |
