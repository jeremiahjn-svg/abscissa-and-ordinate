// Regenerates app/apps/travel/travel-data.json from the Lahman Baseball
// Database CSVs in data/lahman/. Run with: npm run build:travel-data
const fs = require('fs');
const path = require('path');
const cities = require('cities.json');

const DATA_DIR = path.join(__dirname, '..', 'data', 'lahman');
const OUT_DIR = path.join(__dirname, '..', 'app', 'apps', 'travel');
const SEASON = 2025;

function readCsv(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').trim();
  const lines = text.split('\n');
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const row = {};
    header.forEach((h, i) => { row[h] = cols[i] !== undefined ? cols[i] : ''; });
    return row;
  });
}

// --- Load raw data ---
const teamsAll = readCsv(path.join(DATA_DIR, 'Teams.csv'));
const parksAll = readCsv(path.join(DATA_DIR, 'Parks.csv'));
const peopleAll = readCsv(path.join(DATA_DIR, 'People.csv'));
const appearancesAll = readCsv(path.join(DATA_DIR, 'Appearances.csv'));

const teams2025 = teamsAll.filter((t) => Number(t.yearID) === SEASON);
console.log('teams2025', teams2025.length);

const parkByName = new Map();
for (const p of parksAll) {
  parkByName.set(p.parkname, p);
}

// Teams.csv park names that don't exactly match Parks.csv (renames / trailing whitespace)
const PARK_NAME_ALIASES = {
  'Sutter Health Park': 'Sutter Health Field',
  'Oracle Park': 'AT&T Park',
  'Steinbrenner Field': 'George M. Steinbrenner Field',
};

const peopleById = new Map();
for (const p of peopleAll) {
  peopleById.set(p.playerID, p);
}

const appearances2025 = appearancesAll.filter((a) => Number(a.yearID) === SEASON);
console.log('appearances2025 rows', appearances2025.length);

// team -> map(playerID -> total G_all)
const rosterByTeam = new Map();
for (const a of appearances2025) {
  if (!rosterByTeam.has(a.teamID)) rosterByTeam.set(a.teamID, new Map());
  const m = rosterByTeam.get(a.teamID);
  const g = Number(a.G_all) || 0;
  m.set(a.playerID, (m.get(a.playerID) || 0) + g);
}

// --- country name normalization -> ISO 3166-1 alpha-2 ---
const COUNTRY_TO_ISO = {
  'USA': 'US',
  'D.R.': 'DO',
  'Venezuela': 'VE',
  'Cuba': 'CU',
  'P.R.': 'PR',
  'CAN': 'CA',
  'México': 'MX',
  'Mexico': 'MX',
  'Japan': 'JP',
  'Panama': 'PA',
  'Ireland': 'IE',
  'England': 'GB',
  'Australia': 'AU',
  'Germany': 'DE',
  'Colombia': 'CO',
  'South Korea': 'KR',
  'Taiwan': 'TW',
  'Curaçao': 'CW',
  'Nicaragua': 'NI',
  'U.S. Virgin Islands': 'VI',
  'West Germany': 'DE',
  'Netherlands': 'NL',
  'Italy': 'IT',
  'Bahamas': 'BS',
  'Scotland': 'GB',
  'Russia': 'RU',
  'France': 'FR',
  'Aruba': 'AW',
  'Sweden': 'SE',
  'Jamaica': 'JM',
  'Honduras': 'HN',
  'Brazil': 'BR',
  'Belgium': 'BE',
  'Spain': 'ES',
  'China': 'CN',
  'Singapore': 'SG',
  'At Sea': null,
  'Czech Republic': 'CZ',
  'Guam': 'GU',
  'Poland': 'PL',
  'Slovakia': 'SK',
  'Wales': 'GB',
  'Northern Ireland': 'GB',
  'Philippines': 'PH',
  'Vietnam': 'VN',
  'Norway': 'NO',
  'Indonesia': 'ID',
  'Saudi Arabia': 'SA',
  'Guatemala': 'GT',
  'South Africa': 'ZA',
  'Portugal': 'PT',
  'Peru': 'PE',
};

// city-name normalization helper: strip accents/diacritics + lowercase, so
// "Mayagüez" and "Mayaguez" (or "San Cristóbal" / "San Cristobal") match.
const DIACRITICS = /[̀-ͯ]/g;
function foldName(s) {
  return s.normalize('NFD').replace(DIACRITICS, '').toLowerCase().trim();
}
function normalizeName(s) {
  return s
    .replace(/^St\.?\s/i, 'Saint ')
    .replace(/^Mt\.?\s/i, 'Mount ')
    .trim();
}

// Colloquial/short Lahman birth-city names -> the formal GeoNames name they
// correspond to, per country.
const CITY_ALIASES = {
  'US|new york': 'New York City',
  'US|bronx': 'The Bronx',
  'DO|santiago': 'Santiago de los Caballeros',
  'DO|villa mella': 'Mella',
  'DO|barahona': 'Santa Cruz de Barahona',
  'DO|haina': 'Bajos de Haina',
  'VE|guayana': 'Ciudad Guayana',
  'PA|panama': 'Panama City',
  'KR|bucheon': 'Bucheon-si',
  'KR|goyang': 'Goyang-si',
};

// Known MLB birth-city hometowns absent from the cities.json gazetteer
// entirely (mostly smaller Dominican/Venezuelan towns) — hand-verified
// coordinates, checked before falling back to a state/country centroid.
const CITY_OVERRIDES = {
  'DO|san pedro de macoris': [18.4539, -69.2882],
  'DO|san francisco de macoris': [19.3008, -70.2524],
  'DO|san cristobal': [18.4167, -70.1000],
  'DO|samana': [19.2058, -69.3364],
  'DO|bani': [18.2799, -70.3316],
  'DO|higuey': [18.6167, -68.7000],
  'DO|sabana grande de boya': [18.9333, -69.7500],
  'DO|monte cristi': [19.8500, -71.6500],
  'DO|yamasa': [18.8167, -70.1000],
  'VE|cumana': [10.4606, -64.1750],
  'VE|puerto ordaz': [8.3533, -62.6528],
  'VE|bolivar': [8.1222, -63.5497],
  'VE|san felix': [8.3667, -62.6167],
  'PR|rio piedras': [18.4028, -66.0489],
};

// Build lookup indexes on cities.json for speed, keyed by accent-folded name
const cityIndex = new Map(); // key: `${countryISO}|${foldedName}` -> array
for (const c of cities) {
  const key = `${c.country}|${foldName(c.name)}`;
  if (!cityIndex.has(key)) cityIndex.set(key, []);
  cityIndex.get(key).push(c);
}

const COUNTRY_CENTROIDS = {
  US: [39.8, -98.6], DO: [18.7, -70.2], VE: [8.0, -66.1], CU: [21.5, -79.5],
  PR: [18.2, -66.6], CA: [56.1, -106.3], MX: [23.6, -102.5], JP: [36.2, 138.3],
  PA: [8.5, -80.8], IE: [53.4, -8.2], GB: [55.4, -3.4], AU: [-25.3, 133.8],
  DE: [51.2, 10.4], CO: [4.6, -74.3], KR: [35.9, 127.8], TW: [23.7, 121.0],
  CW: [12.2, -69.0], NI: [12.9, -85.2], VI: [18.3, -64.9], NL: [52.1, 5.3],
  IT: [41.9, 12.6], BS: [24.3, -76.0], RU: [61.5, 105.3], FR: [46.6, 2.2],
  AW: [12.5, -69.97], SE: [60.1, 18.6], JM: [18.1, -77.3],
  ZA: [-30.6, 22.9], PT: [39.4, -8.2], PE: [-9.2, -75.0],
};

const US_STATE_CENTROIDS = {
  AL: [32.8, -86.8], AK: [64.2, -149.5], AZ: [34.0, -111.6], AR: [34.8, -92.4],
  CA: [37.2, -119.6], CO: [39.0, -105.5], CT: [41.6, -72.7], DE: [39.0, -75.5],
  FL: [27.8, -81.7], GA: [32.6, -83.4], HI: [20.3, -156.4], ID: [44.2, -114.5],
  IL: [40.3, -89.0], IN: [39.9, -86.3], IA: [42.0, -93.5], KS: [38.5, -98.4],
  KY: [37.5, -85.3], LA: [31.0, -91.8], ME: [45.4, -69.2], MD: [39.0, -76.7],
  MA: [42.3, -71.8], MI: [44.3, -85.6], MN: [46.3, -94.3], MS: [32.7, -89.7],
  MO: [38.5, -92.5], MT: [47.0, -109.6], NE: [41.5, -99.8], NV: [39.3, -116.6],
  NH: [43.7, -71.6], NJ: [40.1, -74.7], NM: [34.4, -106.1], NY: [42.9, -75.5],
  NC: [35.6, -79.4], ND: [47.5, -100.5], OH: [40.4, -82.8], OK: [35.6, -97.5],
  OR: [44.0, -120.6], PA: [40.9, -77.8], RI: [41.7, -71.5], SC: [33.9, -80.9],
  SD: [44.4, -100.2], TN: [35.9, -86.3], TX: [31.5, -99.3], UT: [40.1, -111.9],
  VT: [44.0, -72.7], VA: [37.5, -78.9], WA: [47.4, -120.5], WV: [38.6, -80.6],
  WI: [44.6, -89.9], WY: [43.0, -107.5],
};

const geocodeCache = new Map();
let approxCount = 0;

function geocode(city, state, countryRaw) {
  const cacheKey = `${city}|${state}|${countryRaw}`;
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

  const iso = COUNTRY_TO_ISO[countryRaw];
  let result = null;

  if (iso && city) {
    const foldedKey = `${iso}|${foldName(city)}`;
    const override = CITY_OVERRIDES[foldedKey];
    if (override) {
      result = { lat: override[0], lon: override[1], approx: false };
    } else {
      const aliasName = CITY_ALIASES[foldedKey];
      const tryNames = aliasName ? [aliasName, city, normalizeName(city)] : [city, normalizeName(city)];
      for (const name of tryNames) {
        const key = `${iso}|${foldName(name)}`;
        const matches = cityIndex.get(key);
        if (matches && matches.length) {
          let pick = matches[0];
          if (iso === 'US' && state) {
            const withState = matches.find((m) => m.admin1 === state);
            if (withState) pick = withState;
          }
          result = { lat: Number(pick.lat), lon: Number(pick.lng), approx: false };
          break;
        }
      }
    }
  }

  if (!result && iso === 'US' && state && US_STATE_CENTROIDS[state]) {
    result = { lat: US_STATE_CENTROIDS[state][0], lon: US_STATE_CENTROIDS[state][1], approx: true };
  } else if (!result && iso && COUNTRY_CENTROIDS[iso]) {
    result = { lat: COUNTRY_CENTROIDS[iso][0], lon: COUNTRY_CENTROIDS[iso][1], approx: true };
  } else if (!result) {
    result = { lat: 0, lon: 0, approx: true };
  }

  if (result.approx) approxCount++;
  geocodeCache.set(cacheKey, result);
  return result;
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const missingCountries = new Set();
const output = { season: SEASON, teams: [] };

for (const t of teams2025) {
  const parkName = t.park.trim();
  const park = parkByName.get(parkName) || parkByName.get(PARK_NAME_ALIASES[parkName]);
  if (!park) {
    console.warn('MISSING PARK', t.teamID, JSON.stringify(t.park));
    continue;
  }
  const parkGeo = geocode(park.city, park.state, 'USA'); // all current parks are US
  const parkCountryDisplay = park.country === 'US' ? 'US' : park.country;

  const roster = rosterByTeam.get(t.teamID) || new Map();
  const players = [];
  for (const [playerID, gAll] of roster) {
    if (gAll <= 0) continue;
    const person = peopleById.get(playerID);
    if (!person || !person.birthCity) continue;
    if (!COUNTRY_TO_ISO[person.birthCountry]) missingCountries.add(person.birthCountry);
    const geo = geocode(person.birthCity, person.birthState, person.birthCountry);
    const dist = haversineMiles(geo.lat, geo.lon, parkGeo.lat, parkGeo.lon);
    players.push({
      name: `${person.nameFirst} ${person.nameLast}`,
      birthCity: person.birthCity,
      birthState: person.birthState,
      birthCountry: person.birthCountry,
      countryISO: COUNTRY_TO_ISO[person.birthCountry] || null,
      lat: Number(geo.lat.toFixed(3)),
      lon: Number(geo.lon.toFixed(3)),
      distanceMiles: Math.round(dist),
      approx: geo.approx,
    });
  }
  players.sort((a, b) => b.distanceMiles - a.distanceMiles);
  const avg = players.length
    ? Math.round(players.reduce((s, p) => s + p.distanceMiles, 0) / players.length)
    : 0;

  output.teams.push({
    teamID: t.teamID,
    name: t.name,
    park: t.park,
    parkCity: park.city,
    parkState: park.state,
    parkCountry: parkCountryDisplay,
    parkLat: Number(parkGeo.lat.toFixed(3)),
    parkLon: Number(parkGeo.lon.toFixed(3)),
    avgDistanceMiles: avg,
    players,
  });
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'travel-data.json'), JSON.stringify(output));

console.log('teams written', output.teams.length);
console.log('total players', output.teams.reduce((s, t) => s + t.players.length, 0));
console.log('approx geocodes', approxCount);
console.log('missing country mappings', [...missingCountries]);
