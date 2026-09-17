import type { Metadata } from "next";
import Link from "next/link";
import CostChart from "./CostChart";

export const metadata: Metadata = {
  title: "Cost of Doing Baseball | Abscissa & Ordinate",
  description:
    "Every MLB team's win percentage plotted against total payroll, split into four quadrants of roster efficiency.",
};

export default function CostOfBaseballPage() {
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
          Cost of Doing Baseball
        </h1>
        <p className="max-w-2xl text-lg text-starlight-300 font-light leading-relaxed">
          Wins don&rsquo;t come cheap &mdash; but they don&rsquo;t always come
          expensive either. Plotting every team&rsquo;s win percentage against
          total payroll splits the league into four quadrants: teams buying
          their way to contention, teams punching above their budget, teams
          rebuilding on the cheap, and teams paying premium prices for
          middling results.
        </p>
      </header>

      <CostChart />

      <p className="mt-10 text-xs text-starlight-400 leading-relaxed max-w-3xl">
        Standings from the MLB Stats API; payroll figures from Spotrac.
        Quadrant boundaries are the league median payroll and median win
        percentage for the current dataset, so they shift as the season and
        payrolls change.
      </p>
    </div>
  );
}
