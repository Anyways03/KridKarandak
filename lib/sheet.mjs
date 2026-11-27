// Reads the PUBLIC results Sheet only. Never put the Master Sheet's ID here.
export const SHEET_ID = '1QT6TCoH_Oo9_rmM3DgXtjfls6Hnu7jp5HDfWh5IqDZo';

// Only these columns are ever passed on, whatever else the Sheet contains.
export const TABS = {
  results: { tab: 'Results', cols: { Event: 'event', Position: 'position', Name: 'name', School: 'school', Performance: 'performance' } },
  schedule: { tab: 'Schedule', cols: { Date: 'date', Start: 'start', End: 'end', Venue: 'venue', Event: 'event', Round: 'round', TeamA: 'teamA', TeamB: 'teamB', Score: 'score', Status: 'status' } },
  ranking: { tab: 'Ranking', cols: { Rank: 'rank', School: 'school', First: 'first', Second: 'second', Third: 'third', Points: 'points' } }
};

export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function toRecords(text, def) {
  const rows = parseCsv(text).map(r => r.map(x => x.trim())).filter(r => r.some(x => x !== ''));
  if (!rows.length) return [];
  const head = rows[0], at = {};
  for (const name of Object.keys(def.cols)) {
    at[name] = head.indexOf(name);
    if (at[name] < 0) throw new Error(`${def.tab}: column "${name}" is missing`);
  }
  return rows.slice(1).map(r => {
    const o = {};
    for (const [name, key] of Object.entries(def.cols)) o[key] = r[at[name]] || '';
    return o;
  }).filter(o => Object.values(o)[0] !== '');
}

async function readTab(def, fetchFn) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(def.tab)}`;
  const res = await fetchFn(url, { signal: AbortSignal.timeout(8000) });
  // A Sheet that is not shared answers with a sign-in page instead of CSV.
  if (!res.ok || !(res.headers.get('content-type') || '').includes('text/csv')) throw new Error(`${def.tab}: the Sheet is not available`);
  return toRecords(await res.text(), def);
}

export async function readSheet(fetchFn = fetch) {
  const keys = Object.keys(TABS);
  const lists = await Promise.all(keys.map(k => readTab(TABS[k], fetchFn)));
  const out = { fetchedAt: new Date().toISOString() };
  keys.forEach((k, i) => { out[k] = lists[i]; });
  return out;
}
