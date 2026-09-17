"use client";

import { useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldTopo from "world-atlas/countries-110m.json";
import rawTravelData from "./travel-data.json";

type Player = {
  name: string;
  birthCity: string;
  birthState: string;
  birthCountry: string;
  countryISO: string | null;
  lat: number;
  lon: number;
  distanceMiles: number;
  approx: boolean;
};

type Team = {
  teamID: string;
  name: string;
  park: string;
  parkCity: string;
  parkState: string;
  parkCountry: string;
  parkLat: number;
  parkLon: number;
  avgDistanceMiles: number;
  players: Player[];
};

type TravelData = { season: number; teams: Team[] };

const travelData = rawTravelData as TravelData;

const TEAM_COLORS: Record<string, string> = {
  ARI: "#A71930",
  ATH: "#3EA6A6",
  ATL: "#CE1141",
  BAL: "#DF4601",
  BOS: "#BD3039",
  CHA: "#C4CED4",
  CHN: "#4F8FE0",
  CIN: "#C6011F",
  CLE: "#E31937",
  COL: "#8B5FBF",
  DET: "#FA4616",
  HOU: "#EB6E1F",
  KCA: "#5B9BD5",
  LAA: "#BA0021",
  LAN: "#4C9FE0",
  MIA: "#00A3E0",
  MIL: "#FFC52F",
  MIN: "#D31145",
  NYA: "#8DA9C4",
  NYN: "#FF5910",
  PHI: "#E81828",
  PIT: "#FDB827",
  SDN: "#FFC425",
  SEA: "#3EBFAE",
  SFN: "#FD5A1E",
  SLN: "#C41E3A",
  TBA: "#8FBCE6",
  TEX: "#C0111F",
  TOR: "#4F8FE0",
  WAS: "#E4405F",
};

const WIDTH = 960;
const HEIGHT = 500;

const land = feature(
  worldTopo as unknown as Topology,
  (worldTopo as unknown as Topology).objects.land as GeometryCollection
);

const projection = geoNaturalEarth1().fitSize(
  [WIDTH, HEIGHT],
  land as GeoPermissibleObjects
);
const pathGenerator = geoPath(projection);
const landPath = pathGenerator(land as GeoPermissibleObjects) ?? "";

function arcPath(from: [number, number], to: [number, number]) {
  return pathGenerator({
    type: "LineString",
    coordinates: [from, to],
  } as GeoPermissibleObjects);
}

export default function TravelMap() {
  const teams = useMemo(
    () => [...travelData.teams].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );
  const [teamID, setTeamID] = useState(teams[0]?.teamID ?? "");
  const team = teams.find((t) => t.teamID === teamID) ?? teams[0];
  const [activeIdx, setActiveIdx] = useState(0);

  const activePlayer = team.players[activeIdx] ?? team.players[0];
  const parkXY = projection([team.parkLon, team.parkLat]);

  function selectTeam(id: string) {
    setTeamID(id);
    setActiveIdx(0);
  }

  return (
    <div>
      {/* Team selector */}
      <div className="flex flex-wrap gap-2 mb-8 p-4 bg-space-800/60 border border-space-700 rounded-lg">
        {teams.map((t) => {
          const selected = t.teamID === team.teamID;
          return (
            <button
              key={t.teamID}
              onClick={() => selectTeam(t.teamID)}
              title={t.name}
              className={`w-12 h-10 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 border ${
                selected
                  ? "border-brass-400 bg-space-700 text-brass-400 shadow-[0_0_14px_rgba(229,193,88,0.25)]"
                  : "border-space-700 bg-space-900 text-starlight-300 hover:border-brass-400/50 hover:text-brass-400"
              }`}
              style={
                selected
                  ? { boxShadow: `0 0 0 1px ${TEAM_COLORS[t.teamID]}55 inset` }
                  : undefined
              }
            >
              <span
                className="block w-1.5 h-1.5 rounded-full mx-auto mb-1"
                style={{ backgroundColor: TEAM_COLORS[t.teamID] ?? "#E5C158" }}
              />
              {t.teamID.replace(/[0-9]/g, "")}
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <p className="text-starlight-300 mb-6 leading-relaxed">
        The{" "}
        <span className="text-brass-400 font-medium">{team.name}</span> have
        an average travel distance of{" "}
        <span className="text-brass-400 font-medium">
          {team.avgDistanceMiles.toLocaleString()}
        </span>{" "}
        miles from birth city to{" "}
        <span className="text-starlight-200">{team.park}</span> in{" "}
        <span className="text-starlight-200">
          {team.parkCity}, {team.parkState}
        </span>
        .
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Map */}
        <div className="relative bg-space-800 border border-space-700 rounded-lg p-2 overflow-hidden">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto"
            role="img"
            aria-label={`Map of birth cities for the ${team.name} roster`}
          >
            <path
              d={landPath}
              fill="#131A2A"
              stroke="#1C2438"
              strokeWidth={0.75}
            />

            {team.players.map((p, i) => {
              const d = arcPath([p.lon, p.lat], [team.parkLon, team.parkLat]);
              if (!d) return null;
              const isActive = i === activeIdx;
              return (
                <path
                  key={`arc-${i}`}
                  d={d}
                  fill="none"
                  stroke={isActive ? "#E5C158" : "#CBD5E1"}
                  strokeWidth={isActive ? 1.6 : 0.5}
                  strokeOpacity={isActive ? 0.9 : 0.15}
                  style={{ transition: "stroke-opacity 200ms, stroke-width 200ms" }}
                />
              );
            })}

            {team.players.map((p, i) => {
              const xy = projection([p.lon, p.lat]);
              if (!xy) return null;
              const isActive = i === activeIdx;
              return (
                <circle
                  key={`pt-${i}`}
                  cx={xy[0]}
                  cy={xy[1]}
                  r={isActive ? 4.5 : 2}
                  fill={isActive ? "#E5C158" : "#94A3B8"}
                  fillOpacity={isActive ? 1 : 0.5}
                  className="cursor-pointer"
                  onClick={() => setActiveIdx(i)}
                >
                  <title>{`${p.name} — ${p.birthCity}, ${p.birthCountry}`}</title>
                </circle>
              );
            })}

            {parkXY && (
              <g>
                <circle
                  cx={parkXY[0]}
                  cy={parkXY[1]}
                  r={7}
                  fill="none"
                  stroke="#E5C158"
                  strokeWidth={1.5}
                />
                <path
                  d={`M ${parkXY[0]} ${parkXY[1] - 5} L ${parkXY[0] + 5} ${parkXY[1]} L ${parkXY[0]} ${parkXY[1] + 5} L ${parkXY[0] - 5} ${parkXY[1]} Z`}
                  fill="#E5C158"
                />
                <title>{`${team.park}, ${team.parkCity}`}</title>
              </g>
            )}
          </svg>
        </div>

        {/* Player list */}
        <div className="bg-space-800 border border-space-700 rounded-lg flex flex-col max-h-[540px]">
          {activePlayer && (
            <div className="p-4 border-b border-space-700/50 bg-space-700/30">
              <p className="text-sm text-starlight-300 leading-relaxed">
                <span className="text-brass-400 font-medium">
                  {activePlayer.name}
                </span>{" "}
                was born in{" "}
                <span className="text-starlight-200">
                  {activePlayer.birthCity}
                  {activePlayer.birthCountry === "USA" && activePlayer.birthState
                    ? `, ${activePlayer.birthState}`
                    : ""}
                  , {activePlayer.birthCountry}
                </span>
                , which is{" "}
                <span className="text-brass-400 font-medium">
                  {activePlayer.approx ? "~" : ""}
                  {activePlayer.distanceMiles.toLocaleString()} miles
                </span>{" "}
                from {team.park} in {team.parkCity}, {team.parkState}.
              </p>
            </div>
          )}
          <ul className="overflow-y-auto">
            {team.players.map((p, i) => {
              const isActive = i === activeIdx;
              return (
                <li key={`${p.name}-${i}`}>
                  <button
                    onClick={() => setActiveIdx(i)}
                    className={`w-full flex justify-between items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors border-l-2 ${
                      isActive
                        ? "border-brass-400 bg-space-700/60 text-brass-400"
                        : "border-transparent text-starlight-300 hover:bg-space-700/30 hover:text-starlight-200"
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-xs tabular-nums text-starlight-400 shrink-0">
                      {p.approx ? "~" : ""}
                      {p.distanceMiles.toLocaleString()} mi
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
