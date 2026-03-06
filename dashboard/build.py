"""
Dashboard build script — main entry point.

Usage:
    python dashboard/build.py                    # standard build
    python dashboard/build.py --local-data       # include skills/audits from ~/.claude/skills/

Reads markdown sources from Claude_Learn, parses to structured data,
renders Jinja2 templates, and writes static HTML to docs/.
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
TEMPLATE_DIR = SCRIPT_DIR / "templates"
OUTPUT_DIR = PROJECT_ROOT / "docs"
DATA_DIR = OUTPUT_DIR / "data"

# Sources
TRACKER_PATH = PROJECT_ROOT / "Notes" / "LEARNING_TRACKER.md"
TOPICS_DIR = PROJECT_ROOT / "Notes" / "topics"
BUG_REGISTER_PATH = PROJECT_ROOT / "bug" / "BUG_REGISTER.md"

# Global paths (used with --local-data)
SKILLS_DIR = Path.home() / ".claude" / "skills"
AUDITS_DIR = SKILLS_DIR / "repo-safety" / "audits"

# Snapshot fallbacks (committed to repo for CI builds)
SKILLS_SNAPSHOT = DATA_DIR / "skills.json"
AUDITS_SNAPSHOT = DATA_DIR / "audits.json"


def setup_jinja() -> Environment:
    """Create and configure the Jinja2 template environment."""

    env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=True,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    return env


def load_learning() -> tuple[list[dict], dict]:
    """Parse the learning tracker and return (items, counts)."""

    from parsers.learning import parse, get_counts

    if not TRACKER_PATH.exists():
        print(f"  WARNING: {TRACKER_PATH} not found, using empty data")
        return [], {"OPEN": 0, "LEARNING": 0, "CLOSED": 0}

    items = parse(TRACKER_PATH)
    counts = get_counts(items)
    print(f"  Learning: {len(items)} items ({counts})")
    return items, counts


def load_topics() -> list[dict]:
    """Scan topics directory and extract title + first paragraph from each."""

    topics = []
    if not TOPICS_DIR.exists():
        print(f"  WARNING: {TOPICS_DIR} not found, using empty data")
        return topics

    for md_file in sorted(TOPICS_DIR.glob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        lines = text.splitlines()

        # Extract title from first # heading
        title = md_file.stem
        summary = ""
        for line in lines:
            if line.startswith("# "):
                title = line.lstrip("# ").strip()
                break

        # Extract first non-empty, non-heading paragraph as summary
        in_content = False
        for line in lines:
            if line.startswith("#"):
                in_content = True
                continue
            if in_content and line.strip() and not line.startswith(">") and not line.startswith("---"):
                summary = line.strip().replace("**", "")
                break

        topics.append({
            "filename": md_file.name,
            "title": title,
            "summary": summary,
        })

    print(f"  Topics: {len(topics)} files")
    return topics


def load_bugs() -> list[dict]:
    """Parse the bug register. Returns empty list if file doesn't exist or has no table."""

    bugs = []
    if not BUG_REGISTER_PATH.exists():
        print(f"  WARNING: {BUG_REGISTER_PATH} not found, using empty data")
        return bugs

    text = BUG_REGISTER_PATH.read_text(encoding="utf-8")
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        if "---" in line:
            continue

        cells = [c.strip() for c in line.split("|") if c.strip()]
        # Skip header rows
        if len(cells) >= 2 and cells[0].upper() in ("ID", "BUG", "STATUS", "FIELD"):
            continue
        # Skip placeholder rows
        if len(cells) >= 2 and cells[0] == "-":
            continue

        # Columns: ID | Date | Source | Description | Status | Resolution
        if len(cells) >= 5:
            bugs.append({
                "id": cells[0],
                "date": cells[1],
                "source": cells[2],
                "description": cells[3],
                "status": cells[4],
                "resolution": cells[5] if len(cells) > 5 else "",
            })

    print(f"  Bugs: {len(bugs)} items")
    return bugs


def load_skills(use_local: bool) -> list[dict]:
    """Load skills inventory. Uses local ~/.claude/skills if --local-data, else snapshot."""

    skills = []

    if use_local and SKILLS_DIR.exists():
        print(f"  Skills: reading from {SKILLS_DIR}")
        for skill_dir in sorted(SKILLS_DIR.iterdir()):
            skill_file = skill_dir / "SKILL.md"
            if not skill_file.exists():
                continue

            text = skill_file.read_text(encoding="utf-8")

            # Extract name and description from frontmatter
            name = skill_dir.name
            description = ""
            in_frontmatter = False
            for line in text.splitlines():
                if line.strip() == "---":
                    in_frontmatter = not in_frontmatter
                    continue
                if in_frontmatter:
                    if line.startswith("name:"):
                        name = line.split(":", 1)[1].strip()
                    elif line.startswith("description:"):
                        description = line.split(":", 1)[1].strip()

            skills.append({
                "name": name,
                "description": description,
                "path": str(skill_dir),
                "status": "active",
            })

        print(f"  Skills: {len(skills)} found locally")
    elif SKILLS_SNAPSHOT.exists():
        print(f"  Skills: reading from snapshot {SKILLS_SNAPSHOT}")
        skills = json.loads(SKILLS_SNAPSHOT.read_text(encoding="utf-8"))
        print(f"  Skills: {len(skills)} from snapshot")
    else:
        print("  Skills: no data available (use --local-data or commit a snapshot)")

    return skills


def load_audits(use_local: bool) -> list[dict]:
    """Load repo safety audits. Uses local path if --local-data, else snapshot."""

    audits = []

    if use_local and AUDITS_DIR.exists():
        print(f"  Audits: reading from {AUDITS_DIR}")
        for audit_file in sorted(AUDITS_DIR.glob("*.md")):
            text = audit_file.read_text(encoding="utf-8")

            # Extract key fields from the audit report
            repo_name = audit_file.stem.rsplit("_", 1)[0]  # remove date suffix
            url = ""
            date = ""
            score = ""
            verdict = ""

            for line in text.splitlines():
                if line.startswith("- **URL:**"):
                    url = line.split("**URL:**")[1].strip()
                elif line.startswith("- **Date:**"):
                    date = line.split("**Date:**")[1].strip()
                elif line.startswith("**Final Score:"):
                    score = line.split("**Final Score:")[1].strip().rstrip("*")
                elif "Verdict:" in line and ("**Verdict:" in line or "## Verdict:" in line):
                    verdict_raw = line.split("Verdict:")[1].strip().rstrip("*")
                    # Normalise verdict
                    if "BLOCKED" in verdict_raw:
                        verdict = "BLOCKED"
                    elif "MANUAL REVIEW" in verdict_raw:
                        verdict = "MANUAL REVIEW"
                    elif "AUTO-INSTALL" in verdict_raw:
                        verdict = "AUTO-INSTALL"
                    else:
                        verdict = verdict_raw

            # Check staleness (>30 days)
            stale = False
            if date:
                try:
                    audit_date = datetime.strptime(date, "%Y-%m-%d")
                    stale = (datetime.now() - audit_date).days > 30
                except ValueError:
                    pass

            audits.append({
                "repo_name": repo_name,
                "url": url,
                "date": date,
                "score": score,
                "verdict": verdict,
                "stale": stale,
            })

        print(f"  Audits: {len(audits)} found locally")
    elif AUDITS_SNAPSHOT.exists():
        print(f"  Audits: reading from snapshot {AUDITS_SNAPSHOT}")
        audits = json.loads(AUDITS_SNAPSHOT.read_text(encoding="utf-8"))
        print(f"  Audits: {len(audits)} from snapshot")
    else:
        print("  Audits: no data available (use --local-data or commit a snapshot)")

    return audits


def get_github_repo_url() -> str:
    """Get the GitHub repo URL for linking to files."""
    return "https://github.com/phrag-dev/Claude-Learn"


def get_item_topics(item: dict, all_topics: list) -> list[dict]:
    """Get topic files related to a specific learning item."""
    item_id = item["id"]
    notes_doc = item.get("notes_doc")
    related = []
    repo_url = get_github_repo_url()

    for topic in all_topics:
        filename = topic["filename"]
        # Match by ID prefix (e.g. 002_arcgis.md, 002_notes.md)
        if filename.startswith(f"{item_id}_"):
            t = dict(topic)
            t["github_url"] = f"{repo_url}/blob/master/Notes/topics/{filename}"
            related.append(t)
        # Match by notes_doc reference
        elif notes_doc and filename in notes_doc:
            t = dict(topic)
            t["github_url"] = f"{repo_url}/blob/master/Notes/topics/{filename}"
            if t not in related:
                related.append(t)

    return related


def build_meta(learning_counts: dict, skills: list, audits: list, bugs: list) -> dict:
    """Build metadata dict with timestamp and counts."""

    return {
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "learning_total": sum(learning_counts.values()),
        "skills_total": len(skills),
        "audits_total": len(audits),
        "bugs_total": len(bugs),
    }


def write_json(data: object, filename: str) -> None:
    """Write data as JSON to the data output directory."""

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    output_path = DATA_DIR / filename
    output_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"  Wrote {output_path}")


def render_page(env: Environment, template_name: str, output_name: str, **context) -> None:
    """Render a Jinja2 template and write the result to docs/."""

    template = env.get_template(template_name)
    html = template.render(**context)
    output_path = OUTPUT_DIR / output_name
    output_path.write_text(html, encoding="utf-8")
    print(f"  Rendered {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Build the Claude_Learn dashboard")
    parser.add_argument(
        "--local-data",
        action="store_true",
        help="Read skills and audits from ~/.claude/skills/ (local machine only)",
    )
    args = parser.parse_args()

    print("=" * 50)
    print("Claude_Learn Dashboard Builder")
    print("=" * 50)

    # 1. Load data
    print("\n[1/4] Loading data sources...")
    learning, learning_counts = load_learning()
    topics = load_topics()
    bugs = load_bugs()
    skills = load_skills(args.local_data)
    audits = load_audits(args.local_data)
    meta = build_meta(learning_counts, skills, audits, bugs)

    # 2. Write JSON
    print("\n[2/4] Writing JSON data files...")
    write_json(learning, "learning.json")
    write_json(topics, "topics.json")
    write_json(bugs, "bugs.json")
    write_json(skills, "skills.json")
    write_json(audits, "audits.json")
    write_json(meta, "meta.json")

    # 3. Render HTML
    print("\n[3/4] Rendering templates...")
    env = setup_jinja()

    shared_context = {
        "meta": meta,
        "learning": learning,
        "learning_counts": learning_counts,
        "topics": topics,
        "bugs": bugs,
        "skills": skills,
        "audits": audits,
    }

    pages = [
        ("home.html", "index.html", "home"),
        ("learning.html", "learning.html", "learning"),
        ("skills.html", "skills.html", "skills"),
        ("audits.html", "audits.html", "audits"),
        ("bugs.html", "bugs.html", "bugs"),
    ]

    for template_name, output_name, page_id in pages:
        render_page(env, template_name, output_name, active_page=page_id, base_path="", **shared_context)

    # 3b. Render per-item detail pages
    print("\n[3b/4] Rendering item detail pages...")
    item_dir = OUTPUT_DIR / "item"
    item_dir.mkdir(parents=True, exist_ok=True)

    repo_url = get_github_repo_url()
    for item in learning:
        item_topics = get_item_topics(item, topics)
        # Add GitHub URL for notes_doc
        item_ctx = dict(item)
        if item.get("notes_doc"):
            item_ctx["notes_doc_url"] = f"{repo_url}/blob/master/{item['notes_doc']}"
        else:
            item_ctx["notes_doc_url"] = ""

        template = env.get_template("item.html")
        html = template.render(
            active_page="learning",
            base_path="../",
            item=item_ctx,
            item_topics=item_topics,
            **shared_context,
        )
        output_path = item_dir / f"{item['id']}.html"
        output_path.write_text(html, encoding="utf-8")
        print(f"  Rendered {output_path}")

    # 4. Summary
    print("\n[4/4] Build complete!")
    print(f"  Output: {OUTPUT_DIR}")
    print(f"  Pages:  {len(pages)} + {len(learning)} item pages rendered")
    print(f"  Data:   6 JSON files")
    print(f"  Time:   {meta['last_updated']}")
    print()


if __name__ == "__main__":
    main()
