import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      
      {/* Hero Section */}
      <section className="py-24 space-y-6 border-b border-space-700/50">
        <h1 className="font-serif text-5xl md:text-7xl font-semibold text-starlight-200 leading-tight">
          Plotting the <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brass-400 to-brass-500">
            Abscissa & Ordinate
          </span>
        </h1>
        <p className="max-w-2xl text-lg md:text-xl text-starlight-300 font-light leading-relaxed">
          A digital space where data modeling meets interactive design. Exploring the intersection of analytics, custom web applications, and visualization.
        </p>
      </section>

      {/* Projects & Apps Grid */}
      <section id="apps" className="py-24 border-b border-space-700/50">
        <h2 className="font-serif text-3xl text-brass-400 mb-12">Interactive Applications</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Birth City to Ballpark */}
          <div className="group relative bg-space-800 border border-space-700 p-8 rounded-lg hover:border-brass-400/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(229,193,88,0.1)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brass-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg"></div>
            <h3 className="text-xl font-semibold mb-3">Birth City to Ballpark</h3>
            <p className="text-space-300 text-sm mb-6 leading-relaxed text-starlight-300">
              Mapping every 2025 MLB roster from player birthplace to home stadium, with per-team travel distance summaries drawn from the Lahman Baseball Database.
            </p>
            <Link href="/apps/travel" className="text-brass-400 text-sm uppercase tracking-wider hover:text-brass-500 transition-colors">
              Launch App &rarr;
            </Link>
          </div>

          {/* Example App Card */}
          <div className="group relative bg-space-800 border border-space-700 p-8 rounded-lg hover:border-brass-400/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(229,193,88,0.1)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brass-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg"></div>
            <h3 className="text-xl font-semibold mb-3">Temp Trends</h3>
            <p className="text-space-300 text-sm mb-6 leading-relaxed text-starlight-300">
              Compare upcoming forecasts and recent temperatures against 5- to 30-year historical climate baselines, with a 30-year drill-down for any single day.
            </p>
            <Link href="/apps/temp-trends" className="text-brass-400 text-sm uppercase tracking-wider hover:text-brass-500 transition-colors">
              Launch App &rarr;
            </Link>
          </div>

          {/* Cost of Doing Baseball */}
          <div className="group relative bg-space-800 border border-space-700 p-8 rounded-lg hover:border-brass-400/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(229,193,88,0.1)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brass-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg"></div>
            <h3 className="text-xl font-semibold mb-3">Cost of Doing Baseball</h3>
            <p className="text-space-300 text-sm mb-6 leading-relaxed text-starlight-300">
              Every team&rsquo;s wins plotted against total payroll, split into four quadrants of roster efficiency &mdash; or swap in batting average, home runs, ERA, and fWAR.
            </p>
            <Link href="/apps/cost-of-baseball" className="text-brass-400 text-sm uppercase tracking-wider hover:text-brass-500 transition-colors">
              Launch App &rarr;
            </Link>
          </div>
          
        </div>
      </section>

      {/* Blog Section */}
      <section id="blog" className="py-24 border-b border-space-700/50">
        <h2 className="font-serif text-3xl text-brass-400 mb-12">From the Blog</h2>
        <div className="space-y-8">

          <Link href="/blog/birth-city-to-ballpark" className="group block">
            <article>
              <p className="text-xs text-brass-500 tracking-widest uppercase mb-2">Tutorial • Data Viz</p>
              <h3 className="text-2xl font-serif text-starlight-200 group-hover:text-brass-400 transition-colors mb-3">
                Birth City to Ballpark: Mapping How Far Every MLB Player Traveled to Get to Work
              </h3>
              <p className="text-starlight-300 max-w-3xl">
                How the travel map works: a static-data pipeline over the Lahman Baseball Database, offline geocoding with a layered fallback chain, haversine distance, and d3-geo arcs &mdash; built with Claude Code.
              </p>
            </article>
          </Link>

        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24">
        <h2 className="font-serif text-3xl text-brass-400 mb-8">About</h2>
        <p className="max-w-2xl text-lg text-starlight-300 font-light leading-relaxed">
          Abscissa &amp; Ordinate pairs rigorous data modeling with a taste for
          timeless design &mdash; charting new territory the way a jazz standard
          does: structured underneath, improvised on top.
        </p>
      </section>

    </div>
  );
}
