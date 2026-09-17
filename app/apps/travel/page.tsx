import type { Metadata } from "next";
import Link from "next/link";
import TravelMap from "./TravelMap";

export const metadata: Metadata = {
  title: "Birth City to Ballpark | Abscissa & Ordinate",
  description:
    "How far did each MLB roster travel? Mapping player birth cities to their 2025 home stadium.",
};

export default function TravelPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <Link
        href="/#apps"
        className="text-brass-400 text-sm uppercase tracking-wider hover:text-brass-500 transition-colors"
      >
        &larr; Back to Apps
      </Link>

      <header className="mt-6 mb-10 space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-starlight-200 leading-tight">
          Birth City to Ballpark
        </h1>
        <p className="max-w-2xl text-lg text-starlight-300 font-light leading-relaxed">
          Every player who appeared for a team in the 2025 season, plotted from
          birthplace to home stadium. Pick a team to see the roster&rsquo;s
          full journey.
        </p>
      </header>

      <TravelMap />

      <p className="mt-10 text-xs text-starlight-400 leading-relaxed max-w-3xl">
        Roster, birthplace, and park data from the Lahman Baseball Database
        (2025 season, Chadwick Bureau / seanlahman.com). Distances are
        great-circle miles between birth city and home ballpark. A small
        number of birthplaces (marked with &ldquo;~&rdquo;) couldn&rsquo;t be
        matched to an exact city and are approximated to a state or country
        centroid.
      </p>
    </div>
  );
}
