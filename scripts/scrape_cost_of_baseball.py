#!/usr/bin/env python3
"""
Scrapes current-season MLB standings (wins/losses) from the official MLB
Stats API and team payroll from Spotrac's team payroll page, joins them by
team, and writes app/apps/cost-of-baseball/cost-data.json.

Standard library only — no pip install needed.

Usage (from the repo root, or anywhere with --out set):
    python3 scripts/scrape_cost_of_baseball.py [season]

If Spotrac blocks the direct request (Cloudflare, bot protection — I
couldn't load the page from my end to verify any of this, so this is a
real possibility), save the payroll page's HTML yourself (open it in a
browser, View Source / Save Page As -> HTML) and point the script at that
file instead:

    python3 scripts/scrape_cost_of_baseball.py [season] --payroll-html ./spotrac-payroll.html

If the run reports unmatched teams or an unexpectedly low payroll-row
count, open parse_payroll() below and adjust the parsing to match what's
actually on the page — this was written from general knowledge of
Spotrac's typical table layout, not by inspecting the live page.
"""

import argparse
import json
import re
import sys
import unicodedata
import urllib.request
import urllib.error
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import List, Optional

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUT = SCRIPT_DIR.parent / "app" / "apps" / "cost-of-baseball" / "cost-data.json"

# 3-letter IDs match the ones used for team colors in app/lib/mlbTeams.ts,
# so both apps stay visually consistent.
TEAMS = [
    ("ARI", "Diamondbacks"),
    ("ATH", "Athletics"),
    ("ATL", "Braves"),
    ("BAL", "Orioles"),
    ("BOS", "Red Sox"),
    ("CHA", "White Sox"),
    ("CHN", "Cubs"),
    ("CIN", "Reds"),
    ("CLE", "Guardians"),
    ("COL", "Rockies"),
    ("DET", "Tigers"),
    ("HOU", "Astros"),
    ("KCA", "Royals"),
    ("LAA", "Angels"),
    ("LAN", "Dodgers"),
    ("MIA", "Marlins"),
    ("MIL", "Brewers"),
    ("MIN", "Twins"),
    ("NYA", "Yankees"),
    ("NYN", "Mets"),
    ("PHI", "Phillies"),
    ("PIT", "Pirates"),
    ("SDN", "Padres"),
    ("SEA", "Mariners"),
    ("SFN", "Giants"),
    ("SLN", "Cardinals"),
    ("TBA", "Rays"),
    ("TEX", "Rangers"),
    ("TOR", "Blue Jays"),
    ("WAS", "Nationals"),
]

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)


def fold(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    return re.sub(r"[^a-z]", "", s.lower())


def match_team_id(name: str):
    folded = fold(name)
    for team_id, nickname in TEAMS:
        if fold(nickname) in folded:
            return team_id
    return None


def fetch_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_standings(season: str):
    url = f"https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season={season}"
    data = fetch_json(url)
    teams = []
    for record in data.get("records", []):
        for tr in record.get("teamRecords", []):
            teams.append(
                {
                    "name": (tr.get("team") or {}).get("name", ""),
                    "wins": tr.get("wins"),
                    "losses": tr.get("losses"),
                }
            )
    return teams


def fetch_payroll_html(payroll_html_path: Optional[str]) -> str:
    if payroll_html_path:
        return Path(payroll_html_path).read_text(encoding="utf-8")
    url = "https://www.spotrac.com/mlb/payroll/"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except (urllib.error.HTTPError, urllib.error.URLError) as e:
        raise RuntimeError(
            f"Spotrac request failed: {e}. Try saving the page's HTML locally "
            "and passing --payroll-html <file>."
        ) from e


class _TableRowExtractor(HTMLParser):
    """Collects the text of every <td> in every <tr> inside any <table>,
    grouped by row — no external HTML-parsing library needed."""

    def __init__(self):
        super().__init__()
        self.rows: List[List[str]] = []
        self._table_depth = 0
        self._in_row = False
        self._in_cell = False
        self._current_row: List[str] = []
        self._current_cell_text: List[str] = []

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self._table_depth += 1
        elif tag == "tr" and self._table_depth > 0:
            self._in_row = True
            self._current_row = []
        elif tag in ("td", "th") and self._in_row:
            self._in_cell = True
            self._current_cell_text = []

    def handle_endtag(self, tag):
        if tag == "table":
            self._table_depth = max(0, self._table_depth - 1)
        elif tag == "tr" and self._in_row:
            self._in_row = False
            if self._current_row:
                self.rows.append(self._current_row)
        elif tag in ("td", "th") and self._in_cell:
            self._in_cell = False
            self._current_row.append("".join(self._current_cell_text).strip())

    def handle_data(self, data):
        if self._in_cell:
            self._current_cell_text.append(data)


def parse_payroll(html: str):
    parser = _TableRowExtractor()
    parser.feed(html)
    rows = []
    dollar_re = re.compile(r"^\$[\d,]+")
    for cells in parser.rows:
        if len(cells) < 2:
            continue
        team_cell = cells[0]
        payroll_text = next((c for c in cells if dollar_re.match(c)), None)
        if team_cell and payroll_text and len(team_cell) > 2:
            payroll = int(re.sub(r"[$,]", "", payroll_text))
            if payroll > 0:
                rows.append({"name": team_cell, "payroll": payroll})
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("season", nargs="?", default=str(datetime.now().year))
    parser.add_argument("--payroll-html", dest="payroll_html", default=None)
    parser.add_argument("--out", dest="out", default=str(DEFAULT_OUT))
    args = parser.parse_args()

    print(f"Fetching {args.season} standings from MLB Stats API...")
    standings = fetch_standings(args.season)
    print(f"  got {len(standings)} teams")

    print(
        f"Reading payroll from {args.payroll_html}..."
        if args.payroll_html
        else "Fetching payroll from Spotrac..."
    )
    payroll_html = fetch_payroll_html(args.payroll_html)
    payroll_rows = parse_payroll(payroll_html)
    print(f"  parsed {len(payroll_rows)} payroll rows")

    if len(payroll_rows) < 25:
        print(
            f"\n⚠️  Only found {len(payroll_rows)} payroll rows (expected 30). The Spotrac table "
            "structure may have changed — open the page/HTML and adjust parse_payroll() in this script.\n",
            file=sys.stderr,
        )

    payroll_by_id = {}
    unmatched_payroll_rows = []
    for row in payroll_rows:
        team_id = match_team_id(row["name"])
        if team_id:
            payroll_by_id[team_id] = row["payroll"]
        else:
            unmatched_payroll_rows.append(row["name"])

    teams = []
    unmatched_standings_rows = []
    for s in standings:
        team_id = match_team_id(s["name"])
        payroll = payroll_by_id.get(team_id) if team_id else None
        if not team_id or payroll is None:
            unmatched_standings_rows.append(s["name"])
            continue
        wins, losses = s["wins"], s["losses"]
        teams.append(
            {
                "teamID": team_id,
                "name": s["name"],
                "wins": wins,
                "losses": losses,
                "winPct": round(wins / (wins + losses), 4),
                "payroll": payroll,
            }
        )

    if unmatched_payroll_rows:
        print(f"\n⚠️  Payroll rows we couldn't match to a known team: {', '.join(unmatched_payroll_rows)}", file=sys.stderr)
    if unmatched_standings_rows:
        print(f"⚠️  Standings teams with no matching payroll row: {', '.join(unmatched_standings_rows)}\n", file=sys.stderr)

    teams.sort(key=lambda t: t["teamID"])

    output = {
        "season": int(args.season),
        "scrapedAt": datetime.now(timezone.utc).isoformat(),
        "teams": teams,
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2), encoding="utf-8")

    print(f"\nWrote {len(teams)}/30 teams to {out_path}")
    if len(teams) < 30:
        print("Fewer than 30 teams matched — check the warnings above before using this data.", file=sys.stderr)


if __name__ == "__main__":
    main()
