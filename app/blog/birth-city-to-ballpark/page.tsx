import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Birth City to Ballpark: Mapping How Far Every MLB Player Traveled to Get to Work | Abscissa & Ordinate",
  description:
    "How Birth City to Ballpark works: a static-data pipeline over the Lahman Baseball Database, offline geocoding with a layered fallback chain, haversine distance, and d3-geo arcs — built with Claude Code.",
};

const CODE_SNIPPET = `function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}`;

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-2xl md:text-3xl text-brass-400 mt-14 mb-5">
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-starlight-300 leading-relaxed mb-5">{children}</p>
  );
}

export default function BirthCityToBallparkPost() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <Link
        href="/#blog"
        className="text-brass-400 text-sm uppercase tracking-wider hover:text-brass-500 transition-colors"
      >
        &larr; Back to Blog
      </Link>

      <article className="max-w-3xl mx-auto mt-6">
        <header className="mb-12">
          <p className="text-xs text-brass-500 tracking-widest uppercase mb-3">
            Tutorial &bull; Data Viz
          </p>
          <h1 className="font-serif text-3xl md:text-5xl font-semibold text-starlight-200 leading-tight mb-4">
            Birth City to Ballpark: Mapping How Far Every MLB Player Traveled
            to Get to Work
          </h1>
          <p className="text-starlight-400 text-sm tracking-wide">
            September 2026
          </p>
        </header>

        <P>
          Every baseball player has a starting point. For Corbin Carroll
          it&rsquo;s Seattle. For Ketel Marte it&rsquo;s Nizao, Dominican
          Republic. For Tayler Scott, it&rsquo;s Johannesburg, South Africa,
          which is 10,010 miles from Chase Field in Phoenix.
        </P>
        <P>
          I wanted to see all of those journeys at once, so I built{" "}
          <Link href="/apps/travel" className="text-brass-400 hover:text-brass-500 transition-colors">
            Birth City to Ballpark
          </Link>
          . Pick any MLB team, and the map draws an arc from every
          player&rsquo;s birthplace to the team&rsquo;s home stadium. This
          post covers how it works, including the parts that turned out
          harder than expected, and how Claude Code fit into building it.
        </P>

        <H2>The question</H2>
        <p className="font-serif text-xl md:text-2xl text-starlight-200 italic leading-relaxed mb-6 border-l-2 border-brass-400/50 pl-5">
          How far did each roster travel to get here?
        </p>
        <P>
          Baseball is unusually global, but a box score doesn&rsquo;t show
          it. A roster is a list of names. A map shows you the Venezuelan
          pipeline, the Dominican Republic cluster, and the lone arc from
          southern Africa.
        </P>
        <P>
          The 2025 Arizona Diamondbacks average 1,916 miles from birth city
          to Chase Field. That number hides a lot, and a single average
          can&rsquo;t show the spread, so I made the map.
        </P>

        <H2>The stack</H2>
        <ul className="list-disc list-outside pl-5 space-y-2 text-starlight-300 mb-5">
          <li>Next.js 16 (App Router) with React 19, TypeScript, and Tailwind v4</li>
          <li>d3-geo for the map projection (Natural Earth) and great-circle path generation</li>
          <li>topojson-client and world-atlas for the world landmass geometry, bundled as an npm package so there&rsquo;s no runtime fetch</li>
          <li>d3-zoom, d3-selection, and d3-transition for pan and zoom on the SVG map</li>
          <li>The Lahman Baseball Database (Teams, Parks, People, and Appearances CSVs) as the data source</li>
          <li>The cities.json npm package, a GeoNames-derived world city gazetteer, for offline geocoding</li>
          <li>Claude Code as my pair programmer for most of the build</li>
        </ul>

        <H2>Data first, at build time</H2>
        <P>
          The most important decision was that nothing about the data
          happens at runtime. A Node script,{" "}
          <code className="font-mono text-sm bg-space-800 border border-space-700 rounded px-1.5 py-0.5 text-brass-300">
            scripts/build-travel-data.js
          </code>
          , does all the work when the content updates, and writes a single
          static JSON file that the React component imports directly. Claude
          Code and I wrote and refined this script together.
        </P>
        <P>
          There were two reasons for that. The deploy environment
          couldn&rsquo;t reach most external network services, so live
          geocoding APIs weren&rsquo;t an option. And it turned out to be
          the better architecture anyway: the page loads fast, there are no
          API costs or rate limits, and it has no network dependency beyond
          serving static data.
        </P>
        <P>
          The raw Lahman CSVs (about 11 MB) and the build script are both
          committed to the repo, so anyone can regenerate the dataset from
          scratch.
        </P>
        <P>The script runs in six steps:</P>
        <ol className="list-decimal list-outside pl-5 space-y-2 text-starlight-300 mb-5">
          <li>
            <span className="text-starlight-200 font-medium">Build the rosters.</span>{" "}
            Filter Appearances.csv to the target season. &ldquo;Every player
            who appeared&rdquo; means exactly that, so the September call-up
            who threw two innings is included.
          </li>
          <li>
            <span className="text-starlight-200 font-medium">Join birthplaces.</span>{" "}
            Pull each player&rsquo;s birth city, state, and country from
            People.csv.
          </li>
          <li>
            <span className="text-starlight-200 font-medium">Find the home park.</span>{" "}
            Resolve each team&rsquo;s park city via Teams.csv and then
            Parks.csv, with a manual alias table for park names that
            don&rsquo;t match or have been renamed.
          </li>
          <li>
            <span className="text-starlight-200 font-medium">Geocode</span>{" "}
            every unique birth city and park (more on this below).
          </li>
          <li>
            <span className="text-starlight-200 font-medium">Compute distances.</span>{" "}
            Calculate the haversine distance in miles from birth city to
            stadium.
          </li>
          <li>
            <span className="text-starlight-200 font-medium">Write the JSON.</span>{" "}
            About 1,685 players end up geocoded, roughly 97% of them to an
            exact city.
          </li>
        </ol>

        <H2>The hard part: geocoding</H2>
        <P>
          Turning &ldquo;Bolivar, Venezuela&rdquo; into a latitude and
          longitude sounds like a solved problem. It isn&rsquo;t, once you
          start with messy real-world place names. Lahman&rsquo;s names are
          informal, while gazetteers use formal ones. &ldquo;New
          York&rdquo; needs to become &ldquo;New York City.&rdquo;
          &ldquo;Santiago&rdquo; in the Dominican Republic needs to become
          &ldquo;Santiago de los Caballeros.&rdquo; Accents don&rsquo;t line
          up either: &ldquo;Mayag&uuml;ez&rdquo; versus
          &ldquo;Mayaguez.&rdquo;
        </P>
        <P>
          This is where working with Claude Code paid off most. Rather than
          hunting for one clever algorithm, we iterated: run the script,
          look at which players failed to match, fix the cause, and run it
          again. That loop is fast when you have an assistant that can read
          the output and edit the script in the same session. It produced a
          layered fallback chain, where each layer catches what the
          previous one missed:
        </P>
        <ol className="list-decimal list-outside pl-5 space-y-2 text-starlight-300 mb-5">
          <li>Exact match against the cities.json gazetteer.</li>
          <li>Alias table for colloquial names (&ldquo;New York&rdquo; &rarr; &ldquo;New York City&rdquo;).</li>
          <li>Accent-folding, so punctuation and diacritics don&rsquo;t cause misses.</li>
          <li>Hand-verified coordinate overrides for the few hometowns, mostly small Dominican and Venezuelan towns, that are missing from the gazetteer entirely.</li>
          <li>State or country centroid for the small remainder.</li>
        </ol>
        <P>
          That last layer matters for honesty. Any player who falls back to
          a centroid is flagged{" "}
          <code className="font-mono text-sm bg-space-800 border border-space-700 rounded px-1.5 py-0.5 text-brass-300">
            approx: true
          </code>
          , and the UI shows a{" "}
          <span className="text-brass-400">~</span> in front of their
          distance (Connor Kaiser&rsquo;s ~839 miles, for example). I would
          rather show a fuzzy point that&rsquo;s labeled as fuzzy than
          quietly drop a player or pretend precision I don&rsquo;t have.
        </P>

        <H2>Measuring distance</H2>
        <P>
          Distances are great-circle miles, the shortest path over the
          Earth&rsquo;s surface, calculated with the haversine formula.
          Given a birth city at latitude &phi;&#8321; and longitude
          &lambda;&#8321;, and a stadium at &phi;&#8322; and
          &lambda;&#8322; (all in radians):
        </P>
        <div className="bg-space-800 border border-space-700 rounded-lg px-5 py-4 mb-5 font-mono text-sm text-starlight-200 space-y-1 overflow-x-auto">
          <div>a = sin&sup2;(&Delta;&phi; / 2) + cos(&phi;&#8321;) &middot; cos(&phi;&#8322;) &middot; sin&sup2;(&Delta;&lambda; / 2)</div>
          <div>d = 2R &middot; arcsin(&radic;a)</div>
        </div>
        <p className="text-starlight-300 mb-2">where:</p>
        <ul className="list-disc list-outside pl-5 space-y-1 text-starlight-300 mb-5">
          <li>&Delta;&phi; = &phi;&#8322; &minus; &phi;&#8321; (difference in latitude)</li>
          <li>&Delta;&lambda; = &lambda;&#8322; &minus; &lambda;&#8321; (difference in longitude)</li>
          <li>R = Earth&rsquo;s radius, about 3,959 miles</li>
        </ul>
        <P>In JavaScript, the whole thing is only a few lines:</P>
        <div className="relative bg-space-950 border border-space-700 rounded-lg mb-5 overflow-hidden">
          <span className="absolute top-2 right-3 text-[11px] uppercase tracking-widest text-starlight-500">
            JavaScript
          </span>
          <pre className="overflow-x-auto p-5 pt-8 text-sm font-mono text-starlight-200 leading-relaxed">
            <code>{CODE_SNIPPET}</code>
          </pre>
        </div>
        <P>
          Run it on Johannesburg and Phoenix and you get Tayler
          Scott&rsquo;s 10,010 miles. A team&rsquo;s average is just the
          mean of these distances across its roster.
        </P>
        <P>
          A plain straight-line formula would be wrong here, because the
          Earth is a sphere and lines of longitude converge toward the
          poles. Haversine accounts for that curvature, and it&rsquo;s also
          the same idea behind the arcs on the map: d3-geo draws the path
          along the sphere first and projects it second.
        </P>
        <P>
          These aren&rsquo;t travel distances, since nobody flew
          Johannesburg to Phoenix through the planet in a straight line. The
          number measures how far apart two places are, which makes players
          comparable.
        </P>

        <H2>Drawing the map</H2>
        <P>
          The world landmass topology is converted to GeoJSON once at
          module load, not on every render, and projected with{" "}
          <code className="font-mono text-sm bg-space-800 border border-space-700 rounded px-1.5 py-0.5 text-brass-300">
            geoNaturalEarth1()
          </code>
          .
        </P>
        <P>
          The arcs were the most satisfying part. I feed each
          birth-city-to-stadium pair through d3-geo&rsquo;s{" "}
          <code className="font-mono text-sm bg-space-800 border border-space-700 rounded px-1.5 py-0.5 text-brass-300">
            geoPath()
          </code>{" "}
          as a LineString. d3 adaptively resamples the line along the sphere
          before projecting it, which gives arcs their curved, flight-path
          look. If you drew a straight line between two already-projected
          points, you&rsquo;d get something flat and wrong. The curve comes
          from doing the math on the globe first and the projection second.
        </P>
        <P>
          For pan and zoom, d3-zoom drives a transform on an SVG{" "}
          <code className="font-mono text-sm bg-space-800 border border-space-700 rounded px-1.5 py-0.5 text-brass-300">
            {"<g>"}
          </code>{" "}
          that wraps the map. Stroked elements use{" "}
          <code className="font-mono text-sm bg-space-800 border border-space-700 rounded px-1.5 py-0.5 text-brass-300">
            vector-effect=&quot;non-scaling-stroke&quot;
          </code>
          , so borders and arcs stay crisp at any zoom level instead of
          getting chunky when you zoom in on the Caribbean. The +/&minus;
          and reset (&#8635;) buttons call the zoom behavior
          programmatically, while wheel-zoom and drag-to-pan work natively
          through d3-zoom&rsquo;s pointer handling.
        </P>
        <P>
          Claude Code was also a big help here. Wiring d3&rsquo;s
          imperative zoom behavior into a React component is fiddly, and
          having it draft that integration and then tune it against the
          running page saved a lot of trial and error.
        </P>

        <H2>The interface</H2>
        <ul className="list-disc list-outside pl-5 space-y-2 text-starlight-300 mb-5">
          <li>A team selector with all 30 clubs, color-coded in real team colors. Click one and the roster swaps.</li>
          <li>The map, with one arc per player.</li>
          <li>A headline sentence stating the team&rsquo;s average travel distance in plain English.</li>
          <li>
            A lollipop chart below the map. Instead of a plain ranked list,
            each player gets a stem and a dot, scaled to that team&rsquo;s
            longest trip. Click a player and their arc highlights on the
            map, with a detail callout: &ldquo;Tayler Scott was born in
            Johannesburg, South Africa, which is 10,010 miles from Chase
            Field in Phoenix, AZ.&rdquo;
          </li>
        </ul>
        <P>
          The map and the chart do different jobs. The map shows patterns,
          and the chart puts a name and an exact number on each arc. The
          page is fully responsive, and tap-to-select works the same as
          click on mobile.
        </P>

        <figure className="my-10">
          <Link href="/apps/travel" className="block group">
            <div className="rounded-lg overflow-hidden border border-space-700 group-hover:border-brass-400/50 transition-colors">
              <Image
                src="/blog/birth-city-to-ballpark-diamondbacks.png"
                alt="Birth City to Ballpark map and travel chart for the Arizona Diamondbacks, showing an arc from Johannesburg, South Africa to Chase Field in Phoenix"
                width={1116}
                height={612}
                className="w-full h-auto"
              />
            </div>
          </Link>
          <figcaption className="text-sm text-starlight-400 mt-3">
            <Link href="/apps/travel" className="text-brass-400 hover:text-brass-500 transition-colors">
              Click through to try it yourself
            </Link>
            : the Diamondbacks&rsquo; roster, from Tayler Scott&rsquo;s
            10,010-mile trip from Johannesburg down to Ryne Nelson&rsquo;s
            244 miles.
          </figcaption>
        </figure>

        <H2>Building it with Claude Code</H2>
        <P>
          Since this site is about how I make things, here&rsquo;s what
          working with Claude Code was actually like on this project.
        </P>
        <ul className="list-disc list-outside pl-5 space-y-2 text-starlight-300 mb-5">
          <li>
            <span className="text-starlight-200 font-medium">It handled the tedious parts.</span>{" "}
            Parsing four large CSVs, joining them, and writing the alias and
            override tables are exactly the kind of work I&rsquo;d rather
            not hand-write.
          </li>
          <li>
            <span className="text-starlight-200 font-medium">It shortened the debug loop.</span>{" "}
            When the geocoder missed a player, we could look at the
            failures, decide on a fix, and re-run in minutes.
          </li>
          <li>
            <span className="text-starlight-200 font-medium">I stayed in charge of the decisions.</span>{" "}
            Choosing static precomputed data over live APIs, flagging
            approximations with a ~ instead of hiding them, and deciding
            what the visual should say were mine. Claude Code made those
            choices cheap to implement and easy to change my mind about.
          </li>
        </ul>
        <P>
          If you&rsquo;re building a data visual like this, I&rsquo;d
          recommend the approach. Write down what you want the reader to
          see, then use the tool to get there faster.
        </P>

        <H2>Caveats</H2>
        <ul className="list-disc list-outside pl-5 space-y-2 text-starlight-300 mb-5">
          <li>Birthplace isn&rsquo;t where a player grew up, trained, or signed.</li>
          <li>About 3% of players are approximated to a state or country centroid (marked ~).</li>
          <li>Distances are straight-line, not travel routes.</li>
          <li>It only covers the 2025 season.</li>
        </ul>

        <H2>Try it</H2>
        <P>
          Pick your team and see where everyone came from:{" "}
          <Link href="/apps/travel" className="text-brass-400 hover:text-brass-500 transition-colors">
            Birth City to Ballpark &rarr;
          </Link>
        </P>

        <p className="text-xs text-starlight-500 mt-14 pt-6 border-t border-space-700/50">
          Roster, birthplace, and park data from the Lahman Baseball
          Database (Chadwick Bureau / seanlahman.com).
        </p>
      </article>
    </div>
  );
}
