#!/usr/bin/env python3
"""
Converts a team-stats spreadsheet (Team, Wins, Batting Average, HR, ERA,
fWAR, Total Salary columns) into app/apps/cost-of-baseball/cost-data.json.

Requires openpyxl (pip install openpyxl).

Usage:
    python3 scripts/import_cost_of_baseball_xlsx.py path/to/stats.xlsx [season]
"""

import argparse
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

try:
    import openpyxl
except ImportError:
    print("This script needs openpyxl: pip install openpyxl", file=sys.stderr)
    sys.exit(1)

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUT = SCRIPT_DIR.parent / "app" / "apps" / "cost-of-baseball" / "cost-data.json"

# 3-letter IDs match the ones used for team colors in app/lib/mlbTeams.ts.
TEAMS = [
    ("ARI", "Diamondbacks"), ("ATH", "Athletics"), ("ATL", "Braves"),
    ("BAL", "Orioles"), ("BOS", "Red Sox"), ("CHA", "White Sox"),
    ("CHN", "Cubs"), ("CIN", "Reds"), ("CLE", "Guardians"),
    ("COL", "Rockies"), ("DET", "Tigers"), ("HOU", "Astros"),
    ("KCA", "Royals"), ("LAA", "Angels"), ("LAN", "Dodgers"),
    ("MIA", "Marlins"), ("MIL", "Brewers"), ("MIN", "Twins"),
    ("NYA", "Yankees"), ("NYN", "Mets"), ("PHI", "Phillies"),
    ("PIT", "Pirates"), ("SDN", "Padres"), ("SEA", "Mariners"),
    ("SFN", "Giants"), ("SLN", "Cardinals"), ("TBA", "Rays"),
    ("TEX", "Rangers"), ("TOR", "Blue Jays"), ("WAS", "Nationals"),
]

EXPECTED_HEADER = ["Team", "Wins", "Batting Average", "HR", "ERA", "fWAR", "Total Salary"]


def fold(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    return re.sub(r"[^a-z]", "", s.lower())


def match_team_id(name: str):
    folded = fold(name)
    for team_id, nickname in TEAMS:
        if fold(nickname) in folded:
            return team_id
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("xlsx_path")
    parser.add_argument("season", nargs="?", default=str(datetime.now().year))
    parser.add_argument("--out", dest="out", default=str(DEFAULT_OUT))
    args = parser.parse_args()

    wb = openpyxl.load_workbook(args.xlsx_path, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    header = [str(h).strip() for h in rows[0]]
    if header != EXPECTED_HEADER:
        print(f"⚠️  Header doesn't match what this script expects.\n  got:      {header}\n  expected: {EXPECTED_HEADER}\n  Update the column mapping below if the sheet's layout changed.", file=sys.stderr)

    teams = []
    unmatched = []
    for row in rows[1:]:
        if row[0] is None:
            continue
        name, wins, avg, hr, era, fwar, payroll = row[:7]
        team_id = match_team_id(str(name))
        if not team_id:
            unmatched.append(name)
            continue
        teams.append(
            {
                "teamID": team_id,
                "name": name,
                "wins": int(wins),
                "battingAvg": round(float(avg), 3),
                "hr": int(hr),
                "era": round(float(era), 2),
                "fWAR": round(float(fwar), 1),
                "payroll": int(payroll),
            }
        )

    if unmatched:
        print(f"⚠️  Could not match to a known team: {', '.join(str(u) for u in unmatched)}", file=sys.stderr)

    teams.sort(key=lambda t: t["teamID"])

    output = {
        "season": int(args.season),
        "importedAt": datetime.now(timezone.utc).isoformat(),
        "sourceFile": Path(args.xlsx_path).name,
        "teams": teams,
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Wrote {len(teams)}/30 teams to {out_path}")


if __name__ == "__main__":
    main()
