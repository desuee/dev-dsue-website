// ============================================================
//  EINSTELLUNGEN – nur hier etwas ändern
//  GITHUB = dein GitHub-Name, REPO = das Repository mit den Releases.
//  Die Download-Links zeigen immer auf das neueste Release ("latest"),
//  darum müssen die Dateien dort immer genau so heißen wie unten.
// ============================================================
const GITHUB = 'desuee';
const REPO = 'dev-dsue-website';
const APPS = {
  mediagrab: {
    version: '1.0.1',
    win: 'MediaGrab-Setup.exe',
    macArm: 'MediaGrab-Mac-AppleSilicon.zip',
    macIntel: 'MediaGrab-Mac-Intel.zip',
    style: 'mg',
  },
  uploader: {
    version: '1.0.2',
    win: 'Workshop-Uploader-Setup.exe',
    style: 'wu',
  },
};

// Changelog: neueste Einträge oben. Neue Version = neuen Block oben einfügen.
// Jede Änderung: [Art, Deutsch, Englisch] – Art: 'new' (Neu), 'imp' (Verbessert), 'fix' (Behoben)
const CHANGELOG = [
  { app: 'mediagrab', version: '1.0.1', date: '2026-11-03', items: [
    ['new', 'SoundCloud-Links werden erkannt – Download als MP3 oder WAV', 'SoundCloud links are recognised – download as MP3 or WAV'],
    ['new', 'Ganze Sets und Playlists in einem Rutsch, durchnummeriert in einem eigenen Ordner', 'Whole sets and playlists in one go, numbered in their own folder'],
    ['imp', 'Fortschritt „Track 3/12“ beim Laden von Sets', '“Track 3/12” progress while downloading sets'],
    ['imp', 'Die App startet schneller', 'The app starts faster'],
  ] },
  { app: 'mediagrab', version: '1.0.0', date: '2026-11-03', items: [
    ['new', 'Erste Version für Windows und macOS (Apple Silicon und Intel)', 'First release for Windows and macOS (Apple Silicon and Intel)'],
    ['new', 'MP3 mit 320 kbps inklusive Cover und Titel', 'MP3 at 320 kbps with cover and title'],
    ['new', 'MP4 bis 4K, bevorzugt 1080p in H.264', 'MP4 up to 4K, prefers 1080p H.264'],
    ['new', 'WAV verlustfrei', 'Lossless WAV'],
    ['new', 'Mehrere Downloads gleichzeitig, die Engine aktualisiert sich selbst', 'Several downloads at once, the engine updates itself'],
  ] },
  { app: 'uploader', version: '1.0.2', date: '2026-11', items: [
    ['new', 'Sprachauswahl: Deutsch, Englisch, Tschechisch', 'Language picker: German, English, Czech'],
    ['fix', 'Eigene Mods laden zuverlässig, auch wenn Steam kurz nicht antwortet', 'Your mods load reliably, even when Steam briefly does not answer'],
  ] },
  { app: 'uploader', version: '1.0.0', date: '2026-11', items: [
    ['new', 'Erste Version: Mods für Puck mit Steam-Anmeldung in den Workshop hochladen', 'First release: upload Puck mods to the Workshop with your Steam sign-in'],
    ['new', 'Drag & Drop für Dateien und Ordner, neue Mods mit Titel, Bild und Sichtbarkeit', 'Drag & drop for files and folders, new mods with title, image and visibility'],
  ] },
];

// Projekte: Reihenfolge = Reihenfolge auf der Seite
const PROJECTS = [
  { id: 'mediagrab', kind: 'app', img: 'img/proj-mediagrab.webp', name: 'MediaGrab', link: '#mediagrab',
    de: 'Desktop-App: YouTube und SoundCloud als MP3, MP4 oder WAV speichern. Windows und macOS.', en: 'Desktop app: save YouTube and SoundCloud as MP3, MP4 or WAV. Windows and macOS.', tags: ['Electron', 'yt-dlp', 'FFmpeg'] },
  { id: 'uploader', kind: 'app', img: 'img/proj-uploader.webp', name: 'Steam Workshop Uploader', link: '#uploader',
    de: 'Mods für Puck mit Steam-Anmeldung in den Steam Workshop hochladen – ohne Konsole.', en: 'Upload Puck mods to the Steam Workshop with your Steam sign-in – no console.', tags: ['Electron', 'Steamworks'] },
  { id: 'broadcast', kind: 'mod', img: 'img/proj-broadcast.webp', name: 'EPS Broadcast', link: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3832358279',
    de: 'TV-Grafiken für Puck: Scorebug, Tor-Animation, LED-Show, Replay-Kameras, Torhymnen, Trikots und Stadionsprecher.', en: 'TV graphics for Puck: score bug, goal animation, LED show, replay cameras, goal horns, jerseys and stadium announcer.', tags: ['C#', 'Unity', 'Mod'] },
  { id: 'overlay', kind: 'mod', img: 'img/proj-overlay.webp', name: 'EPS Overlay', link: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3828433090',
    de: 'Live-Shotmap und Schussstatistik für Puck, einstellbar pro Spieler und Team.', en: 'Live shot map and shot stats for Puck, configurable per player and team.', tags: ['C#', 'Unity', 'Mod'] },
  { id: 'admin', kind: 'mod', img: 'img/proj-admin.webp', name: 'EPS Admin', link: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3832677288',
    de: 'Admin-Menü für Puck-Server: Spieler verwalten, Bans, Spielsteuerung und Admin-Tools.', en: 'Admin menu for Puck servers: manage players, bans, game control and admin tools.', tags: ['C#', 'Unity', 'Server'] },
  { id: 'eps', kind: 'web', img: 'img/proj-eps-web.webp', name: 'European Puck Series', link: 'https://europeanpuckseries.com',
    de: 'Liga-Website mit Tabellen, Spielplan, Spielerstatistiken, Fantasy-Preisen und Admin-Bereich.', en: 'League website with standings, schedule, player stats, fantasy prices and an admin area.', tags: ['Node.js', 'Website', 'Railway'] },
];
// ============================================================

const url = file => `https://github.com/${GITHUB}/${REPO}/releases/latest/download/${file}`;
const T = {
  de: { for: 'für', win: 'Windows', mac: 'macOS', arm: 'Apple Silicon (M1–M4)', intel: 'Intel', dl: 'Herunterladen', also: 'Auch für:', only: 'Nur für Windows verfügbar.', copied: 'Kopiert ✓', version: 'Version' },
  en: { for: 'for', win: 'Windows', mac: 'macOS', arm: 'Apple Silicon (M1–M4)', intel: 'Intel', dl: 'Download', also: 'Also for:', only: 'Windows only.', copied: 'Copied ✓', version: 'Version' },
};
let L = (navigator.language || 'de').slice(0, 2) === 'de' ? 'de' : 'en';
try { const saved = localStorage.getItem('lang'); if (saved === 'de' || saved === 'en') L = saved; } catch {}

// which computer is this?
const UA = navigator.userAgent + ' ' + (navigator.platform || '');
let OS = /Macintosh|Mac OS X|MacIntel/.test(UA) && !/iPhone|iPad/.test(UA) ? 'mac' : /Windows|Win32|Win64/.test(UA) ? 'win' : 'other';
let ARM = null;   // null = unknown (Safari does not tell), true/false = known
(async () => {
  try {
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      const v = await navigator.userAgentData.getHighEntropyValues(['architecture', 'platform']);
      if (v.platform === 'macOS') ARM = v.architecture === 'arm';
      drawDownloads();
    }
  } catch {}
})();
if (OS === 'mac' && ARM === null) {
  // WebGL renderer names give Apple Silicon away in most browsers
  try { const g = document.createElement('canvas').getContext('webgl'); const r = g && g.getParameter(g.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); if (/Apple M\d|Apple GPU/i.test(r || '')) ARM = true; else if (/Intel|AMD|Radeon/i.test(r || '')) ARM = false; } catch {}
}

const icon = {
  win: '<svg viewBox="0 0 24 24"><path d="M3 5.5 10.5 4.5v7H3zM11.5 4.4 21 3v8.5h-9.5zM3 12.5h7.5v7L3 18.5zM11.5 12.5H21V21l-9.5-1.4z"/></svg>',
  mac: '<svg viewBox="0 0 24 24"><path d="M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.9-3-.8C6.9 7.3 5.5 8.2 4.7 9.6c-1.6 2.8-.4 6.9 1.2 9.1.8 1.1 1.7 2.3 2.8 2.3s1.6-.7 3-.7 1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.4-.9-2.4-3.6zM14.2 5.6c.6-.8 1.1-1.8 1-2.9-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3z"/></svg>',
  dl: '<svg viewBox="0 0 24 24"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>',
};

function drawDownloads() {
  const t = T[L];
  for (const box of document.querySelectorAll('.dl[data-app]')) {
    const a = APPS[box.dataset.app]; if (!a) continue;
    const opts = [];
    if (a.win) opts.push({ k: 'win', label: t.win, file: a.win });
    if (a.macArm) opts.push({ k: 'macArm', label: t.mac + ' · ' + t.arm, file: a.macArm });
    if (a.macIntel) opts.push({ k: 'macIntel', label: t.mac + ' · ' + t.intel, file: a.macIntel });
    let main = opts[0];
    if (OS === 'mac') main = opts.find(o => o.k === (ARM === false ? 'macIntel' : 'macArm')) || main;
    const isMac = main.k !== 'win';
    let html = `<a class="btn ${a.style}" href="${url(main.file)}">${isMac ? icon.mac : icon.win}<span>${t.dl} ${t.for} ${isMac ? t.mac : t.win}<small>${isMac ? (main.k === 'macArm' ? t.arm : t.intel) + ' · ' : ''}${t.version} ${a.version}</small></span></a>`;
    const rest = opts.filter(o => o !== main);
    if (rest.length) html += `<div class="others"><span>${t.also}</span>${rest.map(o => `<a href="${url(o.file)}">${o.label}</a>`).join('')}</div>`;
    if (OS === 'mac' && !a.macArm) html += `<div class="na">${t.only}</div>`;
    box.innerHTML = html;
  }
  const v = (id, app) => { const el = document.getElementById(id); if (el) el.textContent = T[L].version + ' ' + APPS[app].version + ' · ' + [APPS[app].win && 'Windows', APPS[app].macArm && 'macOS'].filter(Boolean).join(' · '); };
  v('mg-ver', 'mediagrab'); v('wu-ver', 'uploader');
}

let pjFilter = 'all';
function drawProjects() {
  const grid = document.getElementById('pj-grid'); if (!grid) return;
  const K = { all: L === 'de' ? 'Alle' : 'All', app: 'Apps', mod: L === 'de' ? 'Puck-Mods' : 'Puck mods', web: 'Websites' };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  document.getElementById('pj-tabs').innerHTML = ['all', 'app', 'mod', 'web'].map(k => `<button data-pj="${k}" class="${k === pjFilter ? 'on' : ''}">${K[k]}</button>`).join('');
  const more = { app: L === 'de' ? 'Zur App' : 'View app', mod: L === 'de' ? 'Im Steam Workshop' : 'On Steam Workshop', web: L === 'de' ? 'Website öffnen' : 'Open website' };
  grid.innerHTML = PROJECTS.filter(p => pjFilter === 'all' || p.kind === pjFilter).map(p => {
    const ext = /^https?:/.test(p.link);
    return `<a class="pj ${p.kind}" href="${esc(p.link)}"${ext ? ' target="_blank" rel="noopener"' : ''}>
      <div class="pj-img"><img src="${esc(p.img)}" alt="" loading="lazy"><span class="pj-kind">${K[p.kind]}</span></div>
      <div class="pj-body"><h3>${esc(p.name)}</h3><p>${esc(L === 'de' ? p.de : p.en)}</p>
      <div class="pj-foot"><div class="pj-tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div><span class="pj-go">${more[p.kind]} ${ext ? '↗' : '→'}</span></div></div></a>`;
  }).join('');
}
document.addEventListener('click', e => { const b = e.target.closest('[data-pj]'); if (b) { pjFilter = b.dataset.pj; drawProjects(); } });

let clFilter = 'all', clMore = false;
function drawChangelog() {
  const box = document.getElementById('cl-list'); if (!box) return;
  const name = { mediagrab: 'MediaGrab', uploader: 'Steam Workshop Uploader' };
  const icon = { mediagrab: 'img/mediagrab-icon.png', uploader: 'img/uploader-icon.png' };
  const tag = { new: [L === 'de' ? 'Neu' : 'New', 'new'], imp: [L === 'de' ? 'Verbessert' : 'Improved', 'imp'], fix: [L === 'de' ? 'Behoben' : 'Fixed', 'fix'] };
  const fmt = d => { const p = d.split('-'); return p.length < 3 ? new Date(+p[0], +p[1] - 1).toLocaleDateString(L, { month: 'short', year: 'numeric' }) : new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(L, { day: 'numeric', month: 'short', year: 'numeric' }); };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const list = CHANGELOG.filter(e => clFilter === 'all' || e.app === clFilter);
  const seen = {};
  const shown = clMore ? list : list.slice(0, 3);
  box.innerHTML = shown.map(e => {
    const latest = !seen[e.app]; seen[e.app] = true;
    const items = e.items.map(([k, de, en]) => `<li><span class="tg ${tag[k][1]}">${tag[k][0]}</span><span>${esc(L === 'de' ? de : en)}</span></li>`).join('');
    return `<article class="tl ${e.app}${latest ? ' latest' : ''}">
      <div class="tl-when"><time>${fmt(e.date)}</time></div>
      <div class="tl-dot"></div>
      <div class="tl-card"><header><img src="${icon[e.app]}" alt=""><div><span class="tl-app">${name[e.app]}</span><b>v${esc(e.version)}</b></div>${latest ? `<span class="tl-latest">${L === 'de' ? 'Aktuell' : 'Latest'}</span>` : ''}</header><ul>${items}</ul></div>
    </article>`;
  }).join('') + (list.length > 3 ? `<button class="tl-more" id="cl-more">${clMore ? (L === 'de' ? 'Weniger anzeigen' : 'Show less') : (L === 'de' ? `Ältere Versionen anzeigen (${list.length - 3})` : `Show older versions (${list.length - 3})`)}</button>` : '');
  for (const b of document.querySelectorAll('[data-cl]')) b.classList.toggle('on', b.dataset.cl === clFilter);
}
document.addEventListener('click', e => { if (e.target.closest('#cl-more')) { clMore = !clMore; drawChangelog(); } });
document.addEventListener('click', e => { const b = e.target.closest('[data-cl]'); if (b) { clFilter = b.dataset.cl; drawChangelog(); } });

function applyLang() {
  document.documentElement.lang = L;
  for (const el of document.querySelectorAll('[data-de]')) el.innerHTML = el.dataset[L] || el.dataset.de;
  for (const b of document.querySelectorAll('[data-lang]')) b.classList.toggle('on', b.dataset.lang === L);
  drawDownloads();
  drawChangelog();
  drawProjects();
}
document.querySelector('.lang')?.addEventListener('click', e => {
  const b = e.target.closest('[data-lang]'); if (!b) return;
  L = b.dataset.lang; try { localStorage.setItem('lang', L); } catch {}
  applyLang();
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  try { await navigator.clipboard.writeText(document.getElementById(b.dataset.copy).textContent); const o = b.textContent; b.textContent = T[L].copied; setTimeout(() => b.textContent = o, 1600); } catch {}
});
const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
applyLang();
