const REFRESH_MS = 60000;
const view = document.getElementById('view'), status = document.getElementById('status');
let data = null, failed = false, day = null, query = '';

// All text goes in as text, never as HTML.
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== '') e.append(kid);
  return e;
}
const num = x => { const n = parseFloat(x); return isNaN(n) ? Infinity : n; };
const ordinal = p => ({ 1: '1st', 2: '2nd', 3: '3rd' }[p] || p);
const minutes = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? m[1] * 60 + +m[2] : 9999; };
const dayKey = d => { const t = Date.parse(d + ' UTC'); return isNaN(t) ? Infinity : t; };
const dayName = d => isNaN(Date.parse(d + ' UTC')) ? d : new Date(d + ' UTC').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const indiaDay = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const groupBy = (list, key) => { const m = new Map(); for (const x of list) { if (!m.has(x[key])) m.set(x[key], []); m.get(x[key]).push(x); } return m; };
const empty = (title, text) => h('div', { class: 'card empty' }, h('b', {}, title), text);

function resultList() {
  const q = query.trim().toLowerCase();
  const out = [];
  for (const [event, all] of groupBy(data.results, 'event')) {
    // A match on the event shows the whole event; otherwise only the matching rows.
    const rows = !q || event.toLowerCase().includes(q) ? all : all.filter(r => (r.name + ' ' + r.school).toLowerCase().includes(q));
    if (!rows.length) continue;
    rows.sort((a, b) => num(a.position) - num(b.position));
    out.push(h('section', { class: 'card' }, h('h2', {}, event), h('ol', {}, rows.map(r =>
      h('li', { class: 'place' },
        h('div', { class: 'n p' + r.position }, ordinal(r.position)),
        h('div', {}, h('b', {}, r.name), r.school && h('span', {}, r.school)),
        h('div', { class: 'perf' }, r.performance))))));
  }
  return out.length ? out : [empty('Nothing found', 'Try a school, event or name.')];
}

function results() {
  if (!data.results.length) return [empty('No results yet', 'Each result appears here once it has been checked.')];
  const list = h('div', {}, resultList());
  return [h('input', { type: 'search', placeholder: 'Search school, event or name', 'aria-label': 'Search results', value: query,
    oninput: e => { query = e.target.value; list.replaceChildren(...resultList()); } }), list];
}

function schedule() {
  if (!data.schedule.length) return [empty('No schedule yet', 'Match and race times will appear here.')];
  const days = [...groupBy(data.schedule, 'date').keys()].sort((a, b) => dayKey(a) - dayKey(b));
  if (!days.includes(day)) day = days.find(d => dayKey(d) === dayKey(indiaDay())) || days[0];
  const rows = data.schedule.filter(s => s.date === day).sort((a, b) => minutes(a.start) - minutes(b.start));
  return [
    h('div', { class: 'days', role: 'group', 'aria-label': 'Day' }, days.map(d =>
      h('button', { type: 'button', 'aria-pressed': String(d === day), onclick: () => { day = d; render(); view.querySelector('[aria-pressed=true]').focus(); } }, dayName(d)))),
    h('div', { class: 'card' }, rows.map(s => h('div', { class: 'slot' },
      h('time', {}, s.start || '–', s.end && h('small', {}, 'to ' + s.end)),
      h('div', {},
        h('h3', {}, s.event),
        s.teamA && s.teamB && h('p', { class: 'match' }, s.teamA + ' v ' + s.teamB + ' ', s.score && h('em', {}, s.score)),
        h('p', {}, [s.round, s.venue].filter(Boolean).join(', ')),
        s.status && s.status !== 'Scheduled' && h('span', { class: 'tag' + (s.status === 'In progress' ? ' live' : /cancel|postpon/i.test(s.status) ? ' off' : '') }, s.status)))))
  ];
}

function points() {
  if (!data.ranking.length) return [empty('No points yet', 'The table fills in as results are published.')];
  const rows = [...data.ranking].sort((a, b) => num(a.rank) - num(b.rank));
  return [h('div', { class: 'card' }, h('table', {},
    h('thead', {}, h('tr', {}, ['Rank', 'School', '1st', '2nd', '3rd', 'Points'].map(t => h('th', { scope: 'col' }, t)))),
    h('tbody', {}, rows.map(r => h('tr', { class: r.rank === '1' ? 'lead' : null }, [r.rank, r.school, r.first, r.second, r.third, r.points].map(x => h('td', {}, x)))))))];
}

// INFO TILES. Paste the Google Form or PDF link in `url` when it is ready.
// An empty url shows the tile as "Link coming soon". A url starting with # opens a tab on this site.
const LINKS = [
  { label: 'Registration', icon: 'clipboard', url: '' },
  { label: 'Event Schedule', icon: 'calendar', url: '#schedule' },
  { label: 'Results & Winners', icon: 'trophy', url: '#results' },
  { label: 'Campus Guide', icon: 'map', url: '' },
  { label: 'Accommodation', icon: 'bed', url: '' },
  { label: 'Food Information', icon: 'food', url: '' },
  { label: 'Help Desk', icon: 'phone', url: '' },
];
const ICONS = {
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
  map: '<path d="M14.1 5.9 9.9 3.8a2 2 0 0 0-1.8 0L3.6 6.1A1 1 0 0 0 3 7v13a1 1 0 0 0 1.4.9l3.7-1.8a2 2 0 0 1 1.8 0l4.2 2.1a2 2 0 0 0 1.8 0l4.5-2.3A1 1 0 0 0 21 18V5a1 1 0 0 0-1.4-.9l-3.7 1.8a2 2 0 0 1-1.8 0zM9 3.2v15M15 5.8v15"/>',
  bed: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
  food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
};
function icon(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: 26, height: 26, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) s.setAttribute(k, v);
  s.innerHTML = ICONS[name]; // fixed strings from this file only
  return s;
}

function info() {
  return [h('section', { class: 'card welcome' },
    h('h2', {}, 'Welcome to Krida Karandak 2026–27'),
    h('p', {}, 'Three days of sportsmanship, teamwork, fitness and environmental responsibility.')),
    h('div', { class: 'tiles' }, LINKS.map(l => l.url
      ? h('a', { class: 'tile card', href: l.url, ...(l.url.startsWith('#') ? {} : { target: '_blank', rel: 'noopener' }) }, icon(l.icon), h('b', {}, l.label))
      : h('div', { class: 'tile card soon', 'aria-disabled': 'true' }, icon(l.icon), h('b', {}, l.label), h('small', {}, 'Link coming soon'))))];
}

const pages = { results, schedule, points, info };
function render() {
  const page = pages[location.hash.slice(1)] ? location.hash.slice(1) : 'results';
  document.querySelectorAll('nav a').forEach(a => a.getAttribute('href') === '#' + page ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  document.querySelector('nav').dataset.i = Object.keys(pages).indexOf(page);
  const at = data && new Date(data.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  status.className = failed ? 'note bad' : 'note';
  status.textContent = !data ? (failed ? 'Results are not available right now. This page will keep trying.' : 'Loading…')
    : failed ? `Could not refresh. Showing the results from ${at}.` : `Updated ${at}. Refreshes by itself.`;
  if (data || page === 'info') view.replaceChildren(...pages[page]());
}

async function getData() {
  try {
    const r = await fetch('/api/data', { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (r.ok) { const d = await r.json(); if (Array.isArray(d.results)) return d; }
  } catch (e) { /* fall through */ }
  // If our own copy is down, read the public Sheet directly.
  return (await import('./lib/sheet.mjs')).readSheet();
}

async function refresh() {
  if (refresh.busy) return;
  refresh.busy = true;
  try {
    const next = await getData();
    const changed = !data || JSON.stringify([next.results, next.schedule, next.ranking]) !== JSON.stringify([data.results, data.schedule, data.ranking]);
    const wasFailed = failed;
    data = changed ? next : { ...data, fetchedAt: next.fetchedAt };
    failed = false;
    if (changed || wasFailed || !typing()) render();
  } catch (e) { failed = true; if (!typing()) render(); }
  refresh.busy = false;
}
const typing = () => document.activeElement && document.activeElement.type === 'search';

// A logo file that is missing is hidden rather than shown as a broken picture.
for (const img of document.querySelectorAll('.top img')) {
  const hide = () => { img.hidden = true; };
  if (img.complete && !img.naturalWidth) hide(); else img.addEventListener('error', hide);
}
addEventListener('hashchange', () => { render(); scrollTo(0, 0); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
setInterval(() => { if (!document.hidden) refresh(); }, REFRESH_MS);
render();
refresh();
