"use client";

import { useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import rawCostData from "./cost-data.json";
import { TEAM_COLORS } from "../../lib/mlbTeams";

type MetricKey = "wins" | "battingAvg" | "hr" | "era" | "fWAR" | "payroll";

type Team = {
  teamID: string;
  name: string;
  wins: number;
  battingAvg: number;
  hr: number;
  era: number;
  fWAR: number;
  payroll: number;
};

type CostData = {
  season: number;
  importedAt: string;
  teams: Team[];
};

const costData = rawCostData as CostData;

type Metric = {
  key: MetricKey;
  label: string;
  format: (v: number) => string;
};

const METRICS: Metric[] = [
  { key: "wins", label: "Wins", format: (v) => `${Math.round(v)}` },
  { key: "payroll", label: "Total Payroll", format: (v) => `$${(v / 1_000_000).toFixed(1)}M` },
  { key: "battingAvg", label: "Batting Average", format: (v) => v.toFixed(3).replace(/^0/, "") },
  { key: "hr", label: "Home Runs", format: (v) => `${Math.round(v)}` },
  { key: "era", label: "ERA", format: (v) => v.toFixed(2) },
  { key: "fWAR", label: "fWAR", format: (v) => v.toFixed(1) },
];

function metricFor(key: MetricKey) {
  return METRICS.find((m) => m.key === key)!;
}

function costPerWin(team: Team) {
  return team.payroll / team.wins;
}

function formatCostPerWin(v: number) {
  return `$${(v / 1_000_000).toFixed(2)}M`;
}

const WIDTH = 900;
const HEIGHT = 560;
const MARGIN = { top: 32, right: 32, bottom: 56, left: 76 };

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Named quadrants only make sense for the "cost of doing baseball" framing
// (wins vs. payroll) — any other pair of metrics just gets the median
// divider lines without a Powerhouse/Money Pit style label.
const QUADRANT_LABELS = {
  topRight: "Powerhouse",
  topLeft: "Overperforming",
  bottomLeft: "Rebuilding",
  bottomRight: "Money Pit",
};

function quadrantFor(team: Team, xKey: MetricKey, yKey: MetricKey, medianX: number, medianY: number) {
  if (xKey !== "payroll" || yKey !== "wins") return null;
  const highWin = team.wins >= medianY;
  const highPayroll = team.payroll >= medianX;
  if (highWin && highPayroll) return QUADRANT_LABELS.topRight;
  if (highWin && !highPayroll) return QUADRANT_LABELS.topLeft;
  if (!highWin && !highPayroll) return QUADRANT_LABELS.bottomLeft;
  return QUADRANT_LABELS.bottomRight;
}

function AxisSelect({
  label,
  value,
  onChange,
  exclude,
}: {
  label: string;
  value: MetricKey;
  onChange: (v: MetricKey) => void;
  exclude: MetricKey;
}) {
  return (
    <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-starlight-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as MetricKey)}
        className="bg-space-900 border border-space-700 rounded-md px-2 py-1.5 text-sm text-starlight-200 normal-case tracking-normal hover:border-brass-400/50 focus:border-brass-400 focus:outline-none"
      >
        {METRICS.filter((m) => m.key !== exclude).map((m) => (
          <option key={m.key} value={m.key}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function CostChart() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [xKey, setXKey] = useState<MetricKey>("payroll");
  const [yKey, setYKey] = useState<MetricKey>("wins");
  const [hoveredRankedIdx, setHoveredRankedIdx] = useState<number | null>(null);

  const teams = costData.teams;
  const rankedByCostPerWin = useMemo(
    () => [...teams].sort((a, b) => costPerWin(b) - costPerWin(a)),
    [teams]
  );
  const maxCostPerWin = rankedByCostPerWin.length ? costPerWin(rankedByCostPerWin[0]) : 1;
  const xMetric = metricFor(xKey);
  const yMetric = metricFor(yKey);

  const medianX = useMemo(() => median(teams.map((t) => t[xKey])), [teams, xKey]);
  const medianY = useMemo(() => median(teams.map((t) => t[yKey])), [teams, yKey]);

  const xScale = useMemo(() => {
    const values = teams.map((t) => t[xKey]);
    const [min, max] = [Math.min(...values), Math.max(...values)];
    const pad = (max - min) * 0.08 || max * 0.1 || 1;
    return scaleLinear()
      .domain([min - pad, max + pad])
      .range([MARGIN.left, WIDTH - MARGIN.right]);
  }, [teams, xKey]);

  const yScale = useMemo(() => {
    const values = teams.map((t) => t[yKey]);
    const [min, max] = [Math.min(...values), Math.max(...values)];
    const pad = (max - min) * 0.12 || max * 0.1 || 1;
    return scaleLinear()
      .domain([min - pad, max + pad])
      .range([HEIGHT - MARGIN.bottom, MARGIN.top]);
  }, [teams, yKey]);

  const xTicks = xScale.ticks(5);
  const yTicks = yScale.ticks(6);

  const active = activeIdx !== null ? teams[activeIdx] : null;
  const activeXY = active ? [xScale(active[xKey]), yScale(active[yKey])] : null;
  const activeQuadrant = active ? quadrantFor(active, xKey, yKey, medianX, medianY) : null;
  const showQuadrantLabels = xKey === "payroll" && yKey === "wins";

  function swapAxes() {
    setXKey(yKey);
    setYKey(xKey);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-6 px-4 py-3 rounded-lg border border-space-700 bg-space-800/60">
        <AxisSelect label="Y axis" value={yKey} onChange={setYKey} exclude={xKey} />
        <button
          onClick={swapAxes}
          aria-label="Swap axes"
          title="Swap axes"
          className="w-7 h-7 rounded bg-space-900 border border-space-700 text-brass-400 hover:border-brass-400 flex items-center justify-center text-xs leading-none transition-colors"
        >
          &#8646;
        </button>
        <AxisSelect label="X axis" value={xKey} onChange={setXKey} exclude={yKey} />
      </div>

      <div className="bg-space-800 border border-space-700 rounded-lg p-4 sm:p-6">
        <div className="relative">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto"
            role="img"
            aria-label={`Scatter chart of MLB team ${yMetric.label} versus ${xMetric.label}`}
          >
            {/* Gridlines */}
            {xTicks.map((t) => (
              <line
                key={`gx-${t}`}
                x1={xScale(t)}
                x2={xScale(t)}
                y1={MARGIN.top}
                y2={HEIGHT - MARGIN.bottom}
                stroke="#1C2438"
                strokeWidth={1}
              />
            ))}
            {yTicks.map((t) => (
              <line
                key={`gy-${t}`}
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={yScale(t)}
                y2={yScale(t)}
                stroke="#1C2438"
                strokeWidth={1}
              />
            ))}

            {/* Quadrant dividers at league medians */}
            <line
              x1={xScale(medianX)}
              x2={xScale(medianX)}
              y1={MARGIN.top}
              y2={HEIGHT - MARGIN.bottom}
              stroke="#E5C158"
              strokeOpacity={0.4}
              strokeDasharray="4 4"
              strokeWidth={1.25}
            />
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={yScale(medianY)}
              y2={yScale(medianY)}
              stroke="#E5C158"
              strokeOpacity={0.4}
              strokeDasharray="4 4"
              strokeWidth={1.25}
            />

            {/* Quadrant labels (only for the canonical wins-vs-payroll view) */}
            {showQuadrantLabels && (
              <>
                <text x={WIDTH - MARGIN.right - 8} y={MARGIN.top + 20} textAnchor="end" className="fill-starlight-400 text-[11px] tracking-widest uppercase">
                  {QUADRANT_LABELS.topRight}
                </text>
                <text x={MARGIN.left + 8} y={MARGIN.top + 20} textAnchor="start" className="fill-starlight-400 text-[11px] tracking-widest uppercase">
                  {QUADRANT_LABELS.topLeft}
                </text>
                <text x={MARGIN.left + 8} y={HEIGHT - MARGIN.bottom - 10} textAnchor="start" className="fill-starlight-400 text-[11px] tracking-widest uppercase">
                  {QUADRANT_LABELS.bottomLeft}
                </text>
                <text x={WIDTH - MARGIN.right - 8} y={HEIGHT - MARGIN.bottom - 10} textAnchor="end" className="fill-starlight-400 text-[11px] tracking-widest uppercase">
                  {QUADRANT_LABELS.bottomRight}
                </text>
              </>
            )}

            {/* Axes */}
            <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={HEIGHT - MARGIN.bottom} y2={HEIGHT - MARGIN.bottom} stroke="#131A2A" strokeWidth={1.5} />
            <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} stroke="#131A2A" strokeWidth={1.5} />

            {xTicks.map((t) => (
              <text
                key={`xt-${t}`}
                x={xScale(t)}
                y={HEIGHT - MARGIN.bottom + 20}
                textAnchor="middle"
                className="fill-starlight-400 text-[11px]"
              >
                {xMetric.format(t)}
              </text>
            ))}
            {yTicks.map((t) => (
              <text
                key={`yt-${t}`}
                x={MARGIN.left - 12}
                y={yScale(t) + 4}
                textAnchor="end"
                className="fill-starlight-400 text-[11px]"
              >
                {yMetric.format(t)}
              </text>
            ))}

            <text
              x={(MARGIN.left + (WIDTH - MARGIN.right)) / 2}
              y={HEIGHT - 12}
              textAnchor="middle"
              className="fill-starlight-300 text-xs tracking-widest uppercase"
            >
              {xMetric.label}
            </text>
            <text
              x={-(MARGIN.top + (HEIGHT - MARGIN.bottom)) / 2}
              y={18}
              textAnchor="middle"
              transform="rotate(-90)"
              className="fill-starlight-300 text-xs tracking-widest uppercase"
            >
              {yMetric.label}
            </text>

            {/* Team dots */}
            {teams.map((t, i) => {
              const isActive = i === activeIdx;
              return (
                <circle
                  key={t.teamID}
                  cx={xScale(t[xKey])}
                  cy={yScale(t[yKey])}
                  r={isActive ? 9 : 6.5}
                  fill={TEAM_COLORS[t.teamID] ?? "#E5C158"}
                  fillOpacity={isActive ? 1 : 0.85}
                  stroke={isActive ? "#F8FAFC" : "#05050A"}
                  strokeWidth={isActive ? 2 : 1}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseLeave={() => setActiveIdx(null)}
                  onClick={() => setActiveIdx(isActive ? null : i)}
                />
              );
            })}
          </svg>

          {active && activeXY && (
            <div
              className="absolute pointer-events-none bg-space-900 border border-brass-400/60 rounded-lg px-4 py-3 shadow-[0_0_30px_rgba(0,0,0,0.5)] text-sm w-56"
              style={{
                left: `${(activeXY[0] / WIDTH) * 100}%`,
                top: `${(activeXY[1] / HEIGHT) * 100}%`,
                transform: `translate(${activeXY[0] / WIDTH > 0.65 ? "-108%" : "12px"}, ${
                  activeXY[1] / HEIGHT > 0.58 ? "-115%" : "-12px"
                })`,
              }}
            >
              <p className="font-serif text-brass-400 text-base mb-2">{active.name}</p>
              <dl className="space-y-0.5 text-starlight-300">
                {METRICS.map((m) => (
                  <div key={m.key} className="flex justify-between gap-3">
                    <dt className={m.key === xKey || m.key === yKey ? "text-starlight-200" : "text-starlight-400"}>
                      {m.label}
                    </dt>
                    <dd className={m.key === xKey || m.key === yKey ? "text-brass-400 font-medium" : ""}>
                      {m.format(active[m.key])}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="flex justify-between gap-3 mt-2 pt-2 border-t border-space-700/50">
                <span className="text-starlight-200">Cost per Win</span>
                <span className="text-brass-400 font-medium">{formatCostPerWin(costPerWin(active))}</span>
              </div>
              {activeQuadrant && (
                <p className="text-brass-500 text-xs uppercase tracking-wider mt-2">{activeQuadrant}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="font-serif text-2xl text-brass-400 mb-2">Cost per Win</h2>
        <p className="text-starlight-300 text-sm mb-6">
          Total payroll divided by wins &mdash; who&rsquo;s paying the most (and
          least) for each win in the standings.
        </p>
        <div className="bg-space-800 border border-space-700 rounded-lg p-4 sm:p-6">
          {rankedByCostPerWin.map((t, i) => {
            const value = costPerWin(t);
            const pct = Math.max((value / maxCostPerWin) * 100, 2);
            const isHovered = i === hoveredRankedIdx;
            return (
              <div
                key={t.teamID}
                onMouseEnter={() => setHoveredRankedIdx(i)}
                onMouseLeave={() => setHoveredRankedIdx(null)}
                className="flex items-center gap-3 py-1.5"
              >
                <span className="w-5 shrink-0 text-right text-xs text-starlight-500 tabular-nums">
                  {i + 1}
                </span>
                <span
                  className={`w-28 sm:w-44 shrink-0 truncate text-sm ${
                    isHovered ? "text-brass-400" : "text-starlight-200"
                  }`}
                  title={t.name}
                >
                  {t.name}
                </span>
                <div className="flex-1 h-4 bg-space-900 rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-150"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: TEAM_COLORS[t.teamID] ?? "#E5C158",
                      opacity: isHovered ? 1 : 0.85,
                    }}
                  />
                </div>
                <span
                  className={`w-16 sm:w-20 shrink-0 text-right text-sm tabular-nums ${
                    isHovered ? "text-brass-400 font-medium" : "text-starlight-300"
                  }`}
                >
                  {formatCostPerWin(value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
