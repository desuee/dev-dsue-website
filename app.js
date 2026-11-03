// ============================================================
//  EINSTELLUNGEN – nur hier etwas ändern
//  GITHUB = dein GitHub-Name, REPO = das Repository mit den Releases.
//  Die Download-Links zeigen immer auf das neueste Release ("latest"),
//  darum müssen die Dateien dort immer genau so heißen wie unten.
// ============================================================
const GITHUB = 'desuee';
const REPO = 'dsue-ebsite';
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

function applyLang() {
  document.documentElement.lang = L;
  for (const el of document.querySelectorAll('[data-de]')) el.innerHTML = el.dataset[L] || el.dataset.de;
  for (const b of document.querySelectorAll('[data-lang]')) b.classList.toggle('on', b.dataset.lang === L);
  drawDownloads();
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
