// Bends what is behind the menu bar at its edges, like thick glass.
// Only Chromium browsers can do this; others keep the plain blur from styles.css.
const nav = document.querySelector('nav');
const NS = 'http://www.w3.org/2000/svg';
if (navigator.userAgentData && !matchMedia('(prefers-contrast: more)').matches) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'defs'); svg.setAttribute('aria-hidden', 'true');
  const filter = document.createElementNS(NS, 'filter');
  const set = (n, o) => { for (const k in o) n.setAttribute(k, o[k]); return n; };
  set(filter, { id: 'liquid', 'color-interpolation-filters': 'sRGB', x: '0', y: '0', width: '100%', height: '100%' });
  const img = document.createElementNS(NS, 'feImage');
  const bend = document.createElementNS(NS, 'feDisplacementMap');
  set(bend, { in: 'SourceGraphic', in2: 'map', scale: '-46', xChannelSelector: 'R', yChannelSelector: 'B' });
  filter.append(img, bend); svg.append(filter); document.body.append(svg);
  const build = () => {
    const w = nav.offsetWidth, h = nav.offsetHeight, r = 34, m = 7;
    const map = `<svg xmlns="${NS}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="r" x1="1" x2="0"><stop stop-color="#000"/><stop offset="1" stop-color="red"/></linearGradient><linearGradient id="b" x2="0" y2="1"><stop stop-color="#000"/><stop offset="1" stop-color="blue"/></linearGradient></defs><rect width="${w}" height="${h}"/><rect width="${w}" height="${h}" rx="${r}" fill="url(#r)"/><rect width="${w}" height="${h}" rx="${r}" fill="url(#b)" style="mix-blend-mode:difference"/><rect x="${m}" y="${m}" width="${w - 2 * m}" height="${h - 2 * m}" rx="${r - m}" fill="rgb(128 128 128 / .94)" style="filter:blur(9px)"/></svg>`;
    set(img, { href: 'data:image/svg+xml,' + encodeURIComponent(map), x: 0, y: 0, width: w, height: h, result: 'map', preserveAspectRatio: 'none' });
    nav.style.backdropFilter = 'url(#liquid) blur(5px) saturate(1.7)';
  };
  build();
  new ResizeObserver(build).observe(nav);
}