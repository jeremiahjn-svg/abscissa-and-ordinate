"use client";

import { useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import rawCostData from "./cost-data.json";
import { TEAM_COLORS } from "../../lib/mlbTeams";

type Team = {
  teamID: string;
  name: string;
  wins: number;
  losses: number;
  winPct: number;
  payroll: number;
};

type CostData = {
  season: number;
  scrapedAt: string | null;
  mock?: boolean;
  mockNote?: string;
  teams: Team[];
};

const costData = rawCostData as CostData;

const WIDTH = 900;
const HEIGHT = 560;
const MARGIN = { top: 32, right: 32, bottom: 56, left: 64 };

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function quadrantFor(team: Team, medianPayroll: number, medianWinPct: number) {
  const highWin = team.winPct >= medianWinPct;
  const highPayroll = team.payroll >= medianPayroll;
  if (highWin && highPayroll) return "Powerhouse";
  if (highWin && !highPayroll) return "Overperforming";
  if (!highWin && !highPayroll) return "Rebuilding";
  return "Money Pit";
}

export default function CostChart() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const teams = costData.teams;
  const medianPayroll = useMemo(() => median(teams.map((t) => t.payroll)), [teams]);
  const medianWinPct = useMemo(() => median(teams.map((t) => t.winPct)), [teams]);

  const xScale = useMemo(() => {
    const [min, max] = [Math.min(...teams.map((t) => t.payroll)), Math.max(...teams.map((t) => t.payroll))];
    const pad = (max - min) * 0.08 || max * 0.1;
    return scaleLinear()
      .domain([min - pad, max + pad])
      .range([MARGIN.left, WIDTH - MARGIN.right]);
  }, [teams]);

  const yScale = useMemo(() => {
    const [min, max] = [Math.min(...teams.map((t) => t.winPct)), Math.max(...teams.map((t) => t.winPct))];
    const pad = (max - min) * 0.12 || 0.05;
    return scaleLinear()
      .domain([min - pad, max + pad])
      .range([HEIGHT - MARGIN.bottom, MARGIN.top]);
  }, [teams]);

  const xTicks = xScale.ticks(5);
  const yTicks = yScale.ticks(6);

  const active = activeIdx !== null ? teams[activeIdx] : null;
  const activeXY = active ? [xScale(active.payroll), yScale(active.winPct)] : null;

  return (
    <div>
      {costData.mock && (
        <div className="mb-6 px-4 py-3 rounded-lg border border-brass-500/40 bg-brass-500/10 text-sm text-brass-400">
          Placeholder data — {costData.mockNote}
        </div>
      )}

      <div className="bg-space-800 border border-space-700 rounded-lg p-4 sm:p-6">
        <div className="relative">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto"
            role="img"
            aria-label="Scatter chart of MLB team win percentage versus total payroll"
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
              x1={xScale(medianPayroll)}
              x2={xScale(medianPayroll)}
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
              y1={yScale(medianWinPct)}
              y2={yScale(medianWinPct)}
              stroke="#E5C158"
              strokeOpacity={0.4}
              strokeDasharray="4 4"
              strokeWidth={1.25}
            />

            {/* Quadrant labels */}
            <text x={WIDTH - MARGIN.right - 8} y={MARGIN.top + 20} textAnchor="end" className="fill-starlight-400 text-[11px] tracking-widest uppercase">
              Powerhouse
            </text>
            <text x={MARGIN.left + 8} y={MARGIN.top + 20} textAnchor="start" className="fill-starlight-400 text-[11px] tracking-widest uppercase">
              Overperforming
            </text>
            <text x={MARGIN.left + 8} y={HEIGHT - MARGIN.bottom - 10} textAnchor="start" className="fill-starlight-400 text-[11px] tracking-widest uppercase">
              Rebuilding
            </text>
            <text x={WIDTH - MARGIN.right - 8} y={HEIGHT - MARGIN.bottom - 10} textAnchor="end" className="fill-starlight-400 text-[11px] tracking-widest uppercase">
              Money Pit
            </text>

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
                ${Math.round(t / 1_000_000)}M
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
                {Math.round(t * 100)}%
              </text>
            ))}

            <text
              x={(MARGIN.left + (WIDTH - MARGIN.right)) / 2}
              y={HEIGHT - 12}
              textAnchor="middle"
              className="fill-starlight-300 text-xs tracking-widest uppercase"
            >
              Total Payroll
            </text>
            <text
              x={-(MARGIN.top + (HEIGHT - MARGIN.bottom)) / 2}
              y={18}
              textAnchor="middle"
              transform="rotate(-90)"
              className="fill-starlight-300 text-xs tracking-widest uppercase"
            >
              Win %
            </text>

            {/* Team dots */}
            {teams.map((t, i) => {
              const isActive = i === activeIdx;
              return (
                <circle
                  key={t.teamID}
                  cx={xScale(t.payroll)}
                  cy={yScale(t.winPct)}
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
              <p className="font-serif text-brass-400 text-base mb-1">{active.name}</p>
              <p className="text-starlight-300">
                {active.wins}&ndash;{active.losses} &middot; {(active.winPct * 100).toFixed(1)}% win rate
              </p>
              <p className="text-starlight-300">
                ${(active.payroll / 1_000_000).toFixed(1)}M payroll
              </p>
              <p className="text-brass-500 text-xs uppercase tracking-wider mt-1">
                {quadrantFor(active, medianPayroll, medianWinPct)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
