"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { select } from "d3-selection";
import "d3-transition";
import {
  zoom as d3zoom,
  zoomIdentity,
  type D3ZoomEvent,
  type ZoomBehavior,
  type ZoomTransform,
} from "d3-zoom";
import worldTopo from "world-atlas/countries-110m.json";
import rawTravelData from "./travel-data.json";
import { TEAM_COLORS } from "../../lib/mlbTeams";

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

const WIDTH = 960;
const HEIGHT = 500;
const MIN_ZOOM = 1;
const MAX_ZOOM = 12;

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
  const maxDistance = team.players[0]?.distanceMiles || 1;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [zoomTransform, setZoomTransform] = useState<ZoomTransform>(zoomIdentity);

  useEffect(() => {
    if (!svgRef.current) return;
    const zoomBehavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .translateExtent([
        [-WIDTH * 0.4, -HEIGHT * 0.4],
        [WIDTH * 1.4, HEIGHT * 1.4],
      ])
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        setZoomTransform(event.transform);
      });
    zoomBehaviorRef.current = zoomBehavior;
    const selection = select(svgRef.current);
    selection.call(zoomBehavior);
    return () => {
      selection.on(".zoom", null);
    };
  }, []);

  function zoomBy(factor: number) {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current)
      .transition()
      .duration(200)
      .call(zoomBehaviorRef.current.scaleBy, factor);
  }

  function resetView() {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.transform, zoomIdentity);
  }

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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Map */}
        <div className="relative bg-space-800 border border-space-700 rounded-lg p-2 overflow-hidden">
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
            <button
              onClick={() => zoomBy(1.6)}
              aria-label="Zoom in"
              className="w-7 h-7 rounded bg-space-900/80 border border-space-700 text-brass-400 hover:border-brass-400 backdrop-blur-sm flex items-center justify-center text-sm leading-none transition-colors"
            >
              +
            </button>
            <button
              onClick={() => zoomBy(1 / 1.6)}
              aria-label="Zoom out"
              className="w-7 h-7 rounded bg-space-900/80 border border-space-700 text-brass-400 hover:border-brass-400 backdrop-blur-sm flex items-center justify-center text-sm leading-none transition-colors"
            >
              &minus;
            </button>
            <button
              onClick={resetView}
              aria-label="Reset view"
              title="Reset view"
              className="w-7 h-7 rounded bg-space-900/80 border border-space-700 text-starlight-300 hover:border-brass-400 hover:text-brass-400 backdrop-blur-sm flex items-center justify-center text-xs leading-none transition-colors"
            >
              &#8634;
            </button>
          </div>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto cursor-grab active:cursor-grabbing touch-none"
            role="img"
            aria-label={`Map of birth cities for the ${team.name} roster. Scroll to zoom, drag to pan.`}
          >
            <g
              transform={`translate(${zoomTransform.x},${zoomTransform.y}) scale(${zoomTransform.k})`}
            >
              <path
                d={landPath}
                fill="#131A2A"
                stroke="#1C2438"
                strokeWidth={0.75}
                vectorEffect="non-scaling-stroke"
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
                    vectorEffect="non-scaling-stroke"
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
                    vectorEffect="non-scaling-stroke"
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
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={`M ${parkXY[0]} ${parkXY[1] - 5} L ${parkXY[0] + 5} ${parkXY[1]} L ${parkXY[0]} ${parkXY[1] + 5} L ${parkXY[0] - 5} ${parkXY[1]} Z`}
                    fill="#E5C158"
                  />
                  <title>{`${team.park}, ${team.parkCity}`}</title>
                </g>
              )}
            </g>
          </svg>
        </div>

        {/* Player lollipop chart */}
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
          <ul className="overflow-y-auto py-1">
            {team.players.map((p, i) => {
              const isActive = i === activeIdx;
              const pct = Math.max((p.distanceMiles / maxDistance) * 100, 3);
              return (
                <li key={`${p.name}-${i}`}>
                  <button
                    onClick={() => setActiveIdx(i)}
                    title={p.name}
                    className={`w-full flex items-center gap-2 px-4 py-1.5 text-left transition-colors border-l-2 ${
                      isActive
                        ? "border-brass-400 bg-space-700/60"
                        : "border-transparent hover:bg-space-700/30"
                    }`}
                  >
                    <span
                      className={`w-24 shrink-0 truncate text-xs ${
                        isActive ? "text-brass-400" : "text-starlight-300"
                      }`}
                    >
                      {p.name}
                    </span>
                    <span className="relative flex-1 h-4 flex items-center">
                      <span
                        className={`absolute left-0 h-px ${
                          isActive ? "bg-brass-400" : "bg-space-600"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                      <span
                        className={`absolute h-2 w-2 rounded-full -translate-x-1/2 transition-colors ${
                          isActive ? "bg-brass-400" : "bg-starlight-400"
                        }`}
                        style={{ left: `${pct}%` }}
                      />
                    </span>
                    <span
                      className={`w-14 shrink-0 text-right text-xs tabular-nums ${
                        isActive ? "text-brass-400" : "text-starlight-400"
                      }`}
                    >
                      {p.approx ? "~" : ""}
                      {p.distanceMiles.toLocaleString()}
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
