// Scrapes current-season MLB standings (wins/losses) from the official MLB
// Stats API and team payroll from Spotrac's team payroll page, joins them by
// team, and writes app/apps/cost-of-baseball/cost-data.json.
//
// This can't be run from inside the sandbox that generated this script (its
// network egress is locked to package registries only) — run it wherever
// you have normal internet access:
//
//   node scripts/scrape-cost-of-baseball.js [season]
//
// If Spotrac blocks the direct request (Cloudflare, bot protection, a
// changed URL — I could not load the page to verify any of this live),
// save the payroll page's HTML yourself (open it, View Source or Save
// Page As → HTML, or `curl` it from a normal machine) and point the script
// at that file instead:
//
//   node scripts/scrape-cost-of-baseball.js [season] --payroll-html ./spotrac-payroll.html
//
// If the run reports unmatched teams or an unexpectedly low payroll-row
// count, open parsePayroll() below and adjust the table/column selectors to
// match what's actually on the page — I wrote this from general knowledge
// of Spotrac's typical table layout, not by inspecting the live page.

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const args = process.argv.slice(2);
const season = args.find((a) => /^\d{4}$/.test(a)) || String(new Date().getFullYear());
const payrollHtmlFlagIdx = args.indexOf("--payroll-html");
const payrollHtmlPath = payrollHtmlFlagIdx !== -1 ? args[payrollHtmlFlagIdx + 1] : null;

const OUT_PATH = path.join(__dirname, "..", "app", "apps", "cost-of-baseball", "cost-data.json");

// 3-letter IDs match the ones already used for team colors in
// app/lib/mlbTeams.ts, so both apps stay visually consistent.
const TEAMS = [
  { id: "ARI", nickname: "Diamondbacks" },
  { id: "ATH", nickname: "Athletics" },
  { id: "ATL", nickname: "Braves" },
  { id: "BAL", nickname: "Orioles" },
  { id: "BOS", nickname: "Red Sox" },
  { id: "CHA", nickname: "White Sox" },
  { id: "CHN", nickname: "Cubs" },
  { id: "CIN", nickname: "Reds" },
  { id: "CLE", nickname: "Guardians" },
  { id: "COL", nickname: "Rockies" },
  { id: "DET", nickname: "Tigers" },
  { id: "HOU", nickname: "Astros" },
  { id: "KCA", nickname: "Royals" },
  { id: "LAA", nickname: "Angels" },
  { id: "LAN", nickname: "Dodgers" },
  { id: "MIA", nickname: "Marlins" },
  { id: "MIL", nickname: "Brewers" },
  { id: "MIN", nickname: "Twins" },
  { id: "NYA", nickname: "Yankees" },
  { id: "NYN", nickname: "Mets" },
  { id: "PHI", nickname: "Phillies" },
  { id: "PIT", nickname: "Pirates" },
  { id: "SDN", nickname: "Padres" },
  { id: "SEA", nickname: "Mariners" },
  { id: "SFN", nickname: "Giants" },
  { id: "SLN", nickname: "Cardinals" },
  { id: "TBA", nickname: "Rays" },
  { id: "TEX", nickname: "Rangers" },
  { id: "TOR", nickname: "Blue Jays" },
  { id: "WAS", nickname: "Nationals" },
];

function fold(s) {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

// Match a team name string (from either source, whatever exact form it
// comes in — "Los Angeles Angels", "LA Angels", "Angels", etc.) to one of
// our 30 known teams by nickname, so the two sources don't need to agree on
// exact naming.
function matchTeamId(name) {
  const folded = fold(name);
  const hit = TEAMS.find((t) => folded.includes(fold(t.nickname)));
  return hit ? hit.id : null;
}

async function fetchStandings(season) {
  const url = `https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=${season}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MLB Stats API request failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const teams = [];
  for (const record of data.records ?? []) {
    for (const tr of record.teamRecords ?? []) {
      teams.push({
        name: tr.team?.name ?? "",
        wins: tr.wins,
        losses: tr.losses,
      });
    }
  }
  return teams;
}

async function fetchPayrollHtml() {
  if (payrollHtmlPath) {
    return fs.readFileSync(payrollHtmlPath, "utf8");
  }
  const url = "https://www.spotrac.com/mlb/payroll/";
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });
  if (!res.ok) {
    throw new Error(
      `Spotrac request failed: ${res.status} ${res.statusText}. Try saving the page's HTML locally and passing --payroll-html <file>.`
    );
  }
  return res.text();
}

function parsePayroll(html) {
  const $ = cheerio.load(html);
  const rows = [];
  $("table").each((_, table) => {
    $(table)
      .find("tbody tr")
      .each((_, tr) => {
        const cells = $(tr).find("td");
        if (cells.length < 2) return;
        const teamCell = $(cells[0]).text().trim();
        let payrollText = null;
        cells.each((_, td) => {
          const t = $(td).text().trim();
          if (!payrollText && /^\$[\d,]+/.test(t)) payrollText = t;
        });
        if (teamCell && payrollText) {
          const payroll = Number(payrollText.replace(/[$,]/g, ""));
          if (teamCell.length > 2 && Number.isFinite(payroll) && payroll > 0) {
            rows.push({ name: teamCell, payroll });
          }
        }
      });
  });
  return rows;
}

async function main() {
  console.log(`Fetching ${season} standings from MLB Stats API...`);
  const standings = await fetchStandings(season);
  console.log(`  got ${standings.length} teams`);

  console.log(payrollHtmlPath ? `Reading payroll from ${payrollHtmlPath}...` : "Fetching payroll from Spotrac...");
  const payrollHtml = await fetchPayrollHtml();
  const payrollRows = parsePayroll(payrollHtml);
  console.log(`  parsed ${payrollRows.length} payroll rows`);

  if (payrollRows.length < 25) {
    console.warn(
      `\n⚠️  Only found ${payrollRows.length} payroll rows (expected 30). The Spotrac table structure may` +
        ` have changed — open the page/HTML and adjust parsePayroll() in this script.\n`
    );
  }

  const payrollById = new Map();
  const unmatchedPayrollRows = [];
  for (const row of payrollRows) {
    const id = matchTeamId(row.name);
    if (id) payrollById.set(id, row.payroll);
    else unmatchedPayrollRows.push(row.name);
  }

  const teams = [];
  const unmatchedStandingsRows = [];
  for (const s of standings) {
    const id = matchTeamId(s.name);
    const payroll = id ? payrollById.get(id) : undefined;
    if (!id || payroll === undefined) {
      unmatchedStandingsRows.push(s.name);
      continue;
    }
    teams.push({
      teamID: id,
      name: s.name,
      wins: s.wins,
      losses: s.losses,
      winPct: Number((s.wins / (s.wins + s.losses)).toFixed(4)),
      payroll,
    });
  }

  if (unmatchedPayrollRows.length) {
    console.warn(`\n⚠️  Payroll rows we couldn't match to a known team: ${unmatchedPayrollRows.join(", ")}`);
  }
  if (unmatchedStandingsRows.length) {
    console.warn(`⚠️  Standings teams with no matching payroll row: ${unmatchedStandingsRows.join(", ")}\n`);
  }

  teams.sort((a, b) => a.teamID.localeCompare(b.teamID));

  const output = {
    season: Number(season),
    scrapedAt: new Date().toISOString(),
    teams,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${teams.length}/30 teams to ${path.relative(process.cwd(), OUT_PATH)}`);
  if (teams.length < 30) {
    console.warn("Fewer than 30 teams matched — check the warnings above before using this data.");
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { matchTeamId, parsePayroll, fold, TEAMS };
