import type { Metadata } from "next";
import Link from "next/link";
import TempTrendsApp from "./TempTrendsApp";

export const metadata: Metadata = {
  title: "Temp Trends | Abscissa & Ordinate",
  description:
    "Compare upcoming 10-day forecasts and recent temperatures against 5- to 30-year historical climate baselines, with a 30-year drill-down for any single day.",
};

export default function TempTrendsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <Link
        href="/#apps"
        className="text-brass-400 text-sm uppercase tracking-wider hover:text-brass-500 transition-colors"
      >
        &larr; Back to Apps
      </Link>

      <header className="mt-6 mb-10 space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-starlight-200 leading-tight">
          Temp Trends
        </h1>
        <p className="max-w-2xl text-lg text-starlight-300 font-light leading-relaxed">
          Analyze upcoming forecasts and recent temperatures against 30-year
          historical climate baselines. Search any city or zip code, then
          click a point on the chart to drill into three decades of daily
          highs for that exact date.
        </p>
      </header>

      <TempTrendsApp />

      <p className="mt-10 text-xs text-starlight-400 leading-relaxed max-w-3xl">
        Forecast, recent actuals, and 30-year historical daily highs from the
        Open-Meteo forecast and ERA5 archive APIs, geocoded by city or zip
        code.
      </p>
    </div>
  );
}
