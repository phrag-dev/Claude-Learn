"""
Parser for Notes/LEARNING_TRACKER.md

Reads the markdown table and produces a list of learning items as dicts.
Each item has: id, topic, status, notes_doc

Example input row:
    | 001 | Skills v2 / Claude Code implementation | LEARNING | - |

Example output:
    {"id": "001", "topic": "Skills v2 / ...", "status": "LEARNING", "notes_doc": null}
"""

import re
from pathlib import Path


def parse(tracker_path: Path) -> list[dict]:
    """Parse LEARNING_TRACKER.md and return a list of learning items."""

    text = tracker_path.read_text(encoding="utf-8")
    items = []

    for line in text.splitlines():
        # Match table data rows: | value | value | value | value |
        # Skip header row (contains "ID") and separator row (contains "---")
        line = line.strip()
        if not line.startswith("|"):
            continue
        if "---" in line or "ID" in line.split("|")[1]:
            continue

        # Split on pipes, strip whitespace, drop empty first/last from leading/trailing |
        cells = [cell.strip() for cell in line.split("|")]
        cells = [c for c in cells if c != ""]

        if len(cells) < 4:
            continue

        item_id, topic, status, notes_doc = cells[0], cells[1], cells[2], cells[3]

        items.append({
            "id": item_id,
            "topic": topic,
            "status": status,
            "notes_doc": notes_doc if notes_doc != "-" else None,
        })

    return items


def get_counts(items: list[dict]) -> dict:
    """Return a dict of status counts from parsed items."""

    counts = {"OPEN": 0, "LEARNING": 0, "CLOSED": 0}
    for item in items:
        status = item["status"]
        if status in counts:
            counts[status] += 1
    return counts


if __name__ == "__main__":
    # Quick test: run directly to see parsed output
    import json
    import sys

    # Default path relative to project root
    default_path = Path(__file__).parent.parent.parent / "Notes" / "LEARNING_TRACKER.md"
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_path

    if not path.exists():
        print(f"File not found: {path}")
        sys.exit(1)

    items = parse(path)
    print(json.dumps(items, indent=2))
    print(f"\nCounts: {get_counts(items)}")
