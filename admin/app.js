// dev-dsue Mail (renderer)
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICON = {
  inbox: '<svg viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/></svg>',
  sent: '<svg viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>',
  drafts: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  junk: '<svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  archive: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  clip: '<svg viewBox="0 0 24 24"><path d="m21 11-9.2 9.2a5.5 5.5 0 0 1-7.8-7.8l9.2-9.2a3.7 3.7 0 0 1 5.2 5.2l-9.2 9.2a1.8 1.8 0 0 1-2.6-2.6l8.5-8.5"/></svg>',
  reply: '<svg viewBox="0 0 24 24"><path d="m9 17-5-5 5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>',
  replyAll: '<svg viewBox="0 0 24 24"><path d="m7 17-5-5 5-5"/><path d="m12 17-5-5 5-5"/><path d="M22 18v-2a4 4 0 0 0-4-4H7"/></svg>',
  forward: '<svg viewBox="0 0 24 24"><path d="m15 17 5-5-5-5"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
  unread: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
};
const NAMES = { '\\Inbox': 'Posteingang', '\\Sent': 'Gesendet', '\\Drafts': 'Entwürfe', '\\Junk': 'Spam', '\\Trash': 'Papierkorb', '\\Archive': 'Archiv' };
const ICONS = { '\\Inbox': 'inbox', '\\Sent': 'sent', '\\Drafts': 'drafts', '\\Junk': 'junk', '\\Trash': 'trash', '\\Archive': 'archive' };
const ORDER = ['\\Inbox', '\\Drafts', '\\Sent', '\\Archive', '\\Junk', '\\Trash'];

let ME = '', folders = [], folder = 'INBOX', page = 1, q = '', items = [], cur = null, timer = 0;

// ---------------- api ----------------
async function call(path, body) {
  const r = await fetch('/api/' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Dsue': '1' }, body: JSON.stringify(body) } : { headers: { 'X-Dsue': '1' } });
  let d = {}; try { d = await r.json(); } catch {}
  if (r.status === 401 && path !== 'login') { showLogin(); throw new Error('Bitte neu anmelden'); }
  if (!r.ok) throw new Error(d.error || 'Fehler ' + r.status);
  return d;
}
function toast(t, err) { const el = $('toast'); el.textContent = t; el.classList.toggle('err', !!err); el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 2600); }

// ---------------- theme ----------------
$('theme').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  if (dark) document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme;
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
});

// ---------------- sign in ----------------
function showLogin() { clearInterval(timer); $('app').classList.add('hidden'); $('login').classList.remove('hidden'); $('lPass').value = ''; setTimeout(() => ($('lUser').value ? $('lPass') : $('lUser')).focus(), 50); }
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault(); $('lErr').textContent = ''; $('lBtn').disabled = true; $('lBtn').textContent = 'Anmelden …';
  try { const r = await call('login', { user: $('lUser').value, pass: $('lPass').value }); $('lPass').value = ''; ME = r.user; startApp(); }
  catch (err) { $('lErr').textContent = err.message; }
  $('lBtn').disabled = false; $('lBtn').textContent = 'Anmelden';
});
$('logoutBtn').addEventListener('click', async () => { try { await call('logout', {}); } catch {} ME = ''; showLogin(); });

// ---------------- folders ----------------
async function loadFolders() {
  folders = await call('folders');
  folders.sort((a, b) => { const ia = ORDER.indexOf(a.special), ib = ORDER.indexOf(b.special); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.path.localeCompare(b.path); });
  if (!folders.some(f => f.path === folder)) folder = (folders.find(f => f.special === '\\Inbox') || folders[0] || {}).path || 'INBOX';
  drawFolders();
}
const fname = f => NAMES[f.special] || (f.path === 'INBOX' ? 'Posteingang' : f.name);
function drawFolders() {
  $('folders').innerHTML = folders.map(f => `<button class="folder${f.path === folder ? ' on' : ''}" data-f="${esc(f.path)}">${ICON[ICONS[f.special] || (f.path === 'INBOX' ? 'inbox' : 'folder')]}<span>${esc(fname(f))}</span>${f.unseen && f.special !== '\\Trash' && f.special !== '\\Sent' ? `<i>${f.unseen}</i>` : ''}</button>`).join('');
  const f = folders.find(x => x.path === folder); $('folderTitle').textContent = f ? fname(f) : folder;
  const unread = (folders.find(x => x.special === '\\Inbox' || x.path === 'INBOX') || {}).unseen || 0;
  document.title = (unread ? `(${unread}) ` : '') + 'Mail – dev-dsue';
}
$('folders').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; folder = b.dataset.f; page = 1; cur = null; drawFolders(); loadList(); clearReader(); $('panes').classList.remove('menu-open'); });
$('menuBtn').addEventListener('click', () => $('panes').classList.toggle('menu-open'));

// ---------------- list ----------------
const when = d => { const t = new Date(d), n = new Date(); if (t.toDateString() === n.toDateString()) return t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); if (n - t < 6 * 864e5) return t.toLocaleDateString('de-DE', { weekday: 'short' }); return t.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: n.getFullYear() === t.getFullYear() ? undefined : '2-digit' }); };
const who = a => a ? (a.name || a.address || '') : '';
async function loadList(quiet) {
  try {
    const r = await call(`list?folder=${encodeURIComponent(folder)}&page=${page}&q=${encodeURIComponent(q)}`);
    items = r.items; drawList();
    const pages = Math.max(1, Math.ceil(r.total / r.per));
    $('pager').innerHTML = pages > 1 ? `<button class="icon-btn" data-pg="-1" ${page <= 1 ? 'disabled' : ''}>‹</button><span>Seite ${page} von ${pages} · ${r.total} E-Mails</span><button class="icon-btn" data-pg="1" ${page >= pages ? 'disabled' : ''}>›</button>` : '';
  } catch (e) { if (!quiet) toast(e.message, true); }
}
function drawList() {
  const sentLike = /\\Sent|\\Drafts/.test((folders.find(f => f.path === folder) || {}).special || '');
  $('items').innerHTML = items.length ? items.map(m => `<button class="item${m.seen ? '' : ' unread'}${cur && cur.uid === m.uid ? ' on' : ''}" data-uid="${m.uid}">
    <div class="r1"><span class="who">${esc(sentLike ? 'An: ' + (m.to || []).map(who).join(', ') : who(m.from))}</span><time>${esc(when(m.date))}</time></div>
    <div class="subj"><span>${esc(m.subject || '(kein Betreff)')}</span>${m.att ? ICON.clip : ''}${m.flagged ? `<span class="star" style="flex:none">${ICON.star}</span>` : ''}</div></button>`).join('')
    : `<div class="noitems">${q ? 'Nichts gefunden.' : 'Keine E-Mails in diesem Ordner.'}</div>`;
}
$('items').addEventListener('click', e => { const b = e.target.closest('[data-uid]'); if (b) openMsg(+b.dataset.uid); });
$('pager').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b) { page += +b.dataset.pg; loadList(); } });
$('refreshBtn').addEventListener('click', () => { loadFolders(); loadList(); });
let qt = 0; $('q').addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { q = $('q').value.trim(); page = 1; loadList(); }, 350); });

// ---------------- reading ----------------
function clearReader() { $('reader').innerHTML = '<div class="empty-reader">' + ICON.unread + '<p>Wähle eine E-Mail aus</p></div>'; $('panes').classList.remove('reading'); }
const linkify = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
function frameDoc(m, images) {
  let html = m.html || `<div style="white-space:pre-wrap;font-family:inherit">${linkify(m.text)}</div>`;
  for (const [cid, data] of Object.entries(m.inline || {})) html = html.split('cid:' + cid).join(data);
  const csp = `default-src 'none'; img-src data:${images ? ' https: http:' : ''}; style-src 'unsafe-inline'; font-src data:`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><base target="_blank"><style>body{margin:0;padding:4px;font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#1d2133;word-wrap:break-word}img{max-width:100%;height:auto}a{color:#4a5cff}blockquote{margin:0 0 0 .6em;padding-left:.8em;border-left:3px solid #d5d8e3;color:#5b6176}</style></head><body>${html}</body></html>`;
}
const hasRemote = m => !!m.html && /(<img[^>]+src=["']?https?:|url\(\s*["']?https?:|background=["']?https?:)/i.test(m.html);
async function openMsg(uid) {
  try {
    const m = await call(`message?folder=${encodeURIComponent(folder)}&uid=${uid}`);
    cur = m;
    const it = items.find(x => x.uid === uid); if (it && !it.seen) { it.seen = true; const f = folders.find(x => x.path === folder); if (f && f.unseen) f.unseen--; drawFolders(); }
    drawList(); drawReader(false);
    $('panes').classList.add('reading');
  } catch (e) { toast(e.message, true); }
}
function drawReader(images) {
  const m = cur, f = (m.from || [])[0] || {};
  const moveOpts = folders.filter(x => x.path !== folder).map(x => `<option value="${esc(x.path)}">${esc(fname(x))}</option>`).join('');
  $('reader').innerHTML = `
    <div class="rbar">
      <button class="icon-btn rback" id="rBack" title="Zurück">${ICON.back}</button>
      <button class="icon-btn" data-act="reply" title="Antworten">${ICON.reply}</button>
      <button class="icon-btn" data-act="replyAll" title="Allen antworten">${ICON.replyAll}</button>
      <button class="icon-btn" data-act="forward" title="Weiterleiten">${ICON.forward}</button>
      <span class="sp"></span>
      <button class="icon-btn" data-act="star" title="Markieren" style="${m.flagged ? 'color:#f5a623' : ''}">${ICON.star}</button>
      <button class="icon-btn" data-act="unread" title="Als ungelesen markieren">${ICON.unread}</button>
      <select id="moveSel" title="Verschieben"><option value="">Verschieben …</option>${moveOpts}</select>
      <button class="icon-btn" data-act="delete" title="Löschen">${ICON.trash}</button>
    </div>
    <div class="rhead">
      <h2>${esc(m.subject || '(kein Betreff)')}</h2>
      <div class="from"><div class="avatar">${esc((f.name || f.address || '?').trim().charAt(0).toUpperCase())}</div>
        <div style="min-width:0"><b>${esc(f.name || f.address)}</b><div class="addr">${esc(f.address)}</div></div>
        <time>${esc(new Date(m.date).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }))}</time></div>
      <div class="to">An: ${esc((m.to || []).map(a => a.name ? `${a.name} <${a.address}>` : a.address).join(', '))}${(m.cc || []).length ? ' · Cc: ' + esc(m.cc.map(a => a.address).join(', ')) : ''}</div>
    </div>
    ${!images && hasRemote(m) ? '<div class="blocked">Externe Bilder wurden zu deinem Schutz blockiert. <button id="loadImgs">Bilder laden</button></div>' : ''}
    ${(m.attachments || []).filter(a => !a.cid).length ? `<div class="atts">${m.attachments.filter(a => !a.cid).map(a => `<a class="att" href="/api/attachment?folder=${encodeURIComponent(folder)}&uid=${m.uid}&i=${a.i}">${ICON.file}<span>${esc(a.name)}</span><small>${(a.size / 1024).toFixed(0)} KB</small></a>`).join('')}</div>` : ''}
    <div class="body"><iframe id="frame" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer"></iframe></div>`;
  const fr = $('frame');
  fr.srcdoc = frameDoc(m, images);
  fr.onload = () => { try { fr.style.height = (fr.contentDocument.documentElement.scrollHeight + 10) + 'px'; } catch {} };
  const li = $('loadImgs'); if (li) li.onclick = () => drawReader(true);
  $('rBack').onclick = () => $('panes').classList.remove('reading');
  $('moveSel').onchange = async e => { const to = e.target.value; if (!to) return; try { await call('move', { folder, uid: m.uid, to }); toast('Verschoben'); afterRemove(); } catch (er) { toast(er.message, true); } };
}
$('reader').addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b || !cur) return;
  const a = b.dataset.act, m = cur;
  try {
    if (a === 'reply' || a === 'replyAll' || a === 'forward') return openCompose(a, m);
    if (a === 'star') { await call('flag', { folder, uid: m.uid, flag: 'flagged', on: !m.flagged }); m.flagged = !m.flagged; const it = items.find(x => x.uid === m.uid); if (it) it.flagged = m.flagged; drawList(); drawReader(false); }
    if (a === 'unread') { await call('flag', { folder, uid: m.uid, flag: 'seen', on: false }); const it = items.find(x => x.uid === m.uid); if (it) it.seen = false; cur = null; drawList(); clearReader(); loadFolders(); }
    if (a === 'delete') { await call('delete', { folder, uid: m.uid }); toast('Gelöscht'); afterRemove(); }
  } catch (er) { toast(er.message, true); }
});
function afterRemove() { items = items.filter(x => x.uid !== cur.uid); cur = null; drawList(); clearReader(); loadFolders(); }

// ---------------- compose ----------------
let replyCtx = null;
const quote = m => `\n\n\nAm ${new Date(m.date).toLocaleString('de-DE')} schrieb ${who((m.from || [])[0])}:\n` + (m.text || m.html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')).trim().split('\n').map(l => '> ' + l).join('\n');
function openCompose(kind, m) {
  replyCtx = null;
  $('cTo').value = ''; $('cCc').value = ''; $('cSubject').value = ''; $('cText').value = '';
  $('composeTitle').textContent = 'Neue E-Mail';
  if (m) {
    const base = (m.subject || '').replace(/^((re|aw|fwd?|wg):\s*)+/i, '');
    if (kind === 'forward') { $('composeTitle').textContent = 'Weiterleiten'; $('cSubject').value = 'Fwd: ' + base; $('cText').value = `\n\n\n---------- Weitergeleitete Nachricht ----------\nVon: ${who((m.from || [])[0])} <${((m.from || [])[0] || {}).address || ''}>\nDatum: ${new Date(m.date).toLocaleString('de-DE')}\nBetreff: ${m.subject}\n\n` + (m.text || quote(m).replace(/^> /gm, '')); }
    else {
      $('composeTitle').textContent = kind === 'replyAll' ? 'Allen antworten' : 'Antworten';
      const rt = (m.replyTo || []).length ? m.replyTo : m.from;
      $('cTo').value = (rt || []).map(a => a.address).join(', ');
      if (kind === 'replyAll') $('cCc').value = [...(m.to || []), ...(m.cc || [])].map(a => a.address).filter(a => a && a.toLowerCase() !== ME).join(', ');
      $('cSubject').value = 'Re: ' + base; $('cText').value = quote(m);
      replyCtx = { inReplyTo: m.messageId, references: (m.references ? m.references + ' ' : '') + m.messageId, replyFolder: folder, replyUid: m.uid };
    }
  }
  $('cFrom').textContent = 'Von: ' + ME;
  $('compose').classList.remove('hidden');
  setTimeout(() => { const t = $('cText'); if ($('cTo').value) { t.focus(); t.setSelectionRange(0, 0); t.scrollTop = 0; } else $('cTo').focus(); }, 30);
}
$('composeBtn').addEventListener('click', () => openCompose('new'));
$('composeClose').addEventListener('click', () => { if ($('cText').value.trim() && !confirmClose()) return; $('compose').classList.add('hidden'); });
function confirmClose() { return window.confirm('Entwurf verwerfen?'); }
$('composeForm').addEventListener('submit', async e => {
  e.preventDefault(); const btn = $('cSend'); btn.disabled = true;
  try {
    await call('send', { to: $('cTo').value, cc: $('cCc').value, subject: $('cSubject').value, text: $('cText').value, fromName: 'dev-dsue', ...(replyCtx || {}) });
    $('compose').classList.add('hidden'); toast('Gesendet ✓'); loadFolders();
  } catch (er) { toast(er.message, true); }
  btn.disabled = false;
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('compose').classList.contains('hidden')) $('composeClose').click(); });

// ---------------- start ----------------
function startApp() {
  if (/[?&]next=studio\b/.test(location.search)) { location.href = '/admin/studio'; return; }
  $('login').classList.add('hidden'); $('app').classList.remove('hidden');
  loadFolders().then(() => loadList()).catch(e => toast(e.message, true));
  clearInterval(timer); timer = setInterval(() => { if (document.visibilityState === 'visible') { loadFolders().catch(() => {}); loadList(true); } }, 60000);
}
(async () => {
  try { if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.dataset.theme = 'dark'; } catch {}
  $('lUser').value = 'kontakt@dev-dsue.de';
  try { const r = await call('me'); if (r.user) { ME = r.user; startApp(); } else showLogin(); } catch { showLogin(); }
})();
