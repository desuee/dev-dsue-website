// dev-dsue Studio – changelogs and program downloads
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const clone = o => JSON.parse(JSON.stringify(o));

const KIND = { new: 'Neu', imp: 'Verbessert', fix: 'Behoben', impfix: 'Verbessert & behoben', first: 'Erste Version' };
const APP_NAMES = { aera: 'AERA', mediagrab: 'MediaGrab', uploader: 'Steam Workshop Uploader' };
const SLOTS = [['win', 'Windows', '.exe'], ['macArm', 'macOS · Apple Silicon', '.zip / .dmg'], ['macIntel', 'macOS · Intel', '.zip / .dmg']];

let ST = null;              // { github, repo, aera, site }
let product = 'aera';       // 'aera' or an app id
let draft = null;           // version being edited (editor model)
let draftOrig = null;       // version string it replaces (null = new)
let dirty = false, preview = false;

// ---------------- api ----------------
async function call(path, body) {
  const r = await fetch('/api/' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Dsue': '1' }, body: JSON.stringify(body) } : { headers: { 'X-Dsue': '1' } });
  let d = {}; try { d = await r.json(); } catch {}
  if (r.status === 401) { location.href = '/admin/?next=studio'; throw new Error('Bitte anmelden'); }
  if (!r.ok) throw new Error(d.error || 'Fehler ' + r.status);
  return d;
}
function toast(t, err) { const el = $('toast'); el.textContent = t; el.classList.toggle('err', !!err); el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), err ? 6000 : 3500); }

// ---------------- model ----------------
// editor model for every product: { version, date, title:{de,en}, sections:[{kind, items:[{de,en,sub:[[de,en]]}]}] }
function fromAera(v) { return { version: v.version, date: v.date || '', title: { de: v.title?.de || '', en: v.title?.en || '' }, sections: v.sections.map(s => ({ kind: s.kind, items: s.items.map(i => ({ de: i.de, en: i.en, sub: (i.sub || []).map(x => [x[0], x[1]]) })) })) }; }
function toAera(m) { return { version: m.version.trim(), date: m.date || null, title: m.title, sections: m.sections.map(s => ({ kind: s.kind, items: s.items.map(i => ({ de: i.de, en: i.en, ...(i.sub.length ? { sub: i.sub } : {}) })) })) }; }
function fromSite(e) {
  const sections = [];
  for (const [k, de, en] of e.items) { let s = sections[sections.length - 1]; if (!s || s.kind !== k) sections.push(s = { kind: k, items: [] }); s.items.push({ de, en, sub: [] }); }
  return { version: e.version, date: e.date || '', title: { de: '', en: '' }, sections };
}
function toSite(m) {
  const items = [];
  for (const s of m.sections) for (const i of s.items) {
    // the main page shows one line per change: sub-points are joined into it
    const join = (t, n) => i.sub.length ? t.replace(/:\s*$/, '') + ': ' + i.sub.map(x => x[n]).filter(Boolean).join(', ') : t;
    items.push([s.kind === 'impfix' ? 'imp' : s.kind === 'first' ? 'new' : s.kind, join(i.de, 0), join(i.en, 1)]);
  }
  return { app: product, version: m.version.trim(), date: m.date || '', items };
}
function listFor(p) {
  if (p === 'aera') return ST.aera.map(fromAera);
  return ST.site.changelog.filter(e => e.app === p).map(fromSite);
}
const isAera = () => product === 'aera';

// ---------------- text import ----------------
// Understands the way changelogs are usually written, e.g.
//   AERA 0.8.2 / Neu / - Punkt / - Unterpunkt (eingerückt) … then the same again in English (New / Improved / Fixed)
// Several versions in one text are fine; "Deutsch" / "English" lines switch the language too.
const HEAD = [
  [/^(verbessert\s*[\/&+]\s*behoben|improved\s*[\/&+]\s*fixed|improvements?\s*[\/&+]\s*fixes)$/i, 'impfix'],
  [/^(neu|new|neue features?|new features?|added|hinzugefügt)$/i, 'new'],
  [/^(verbessert|verbesserungen|improved|improvements?|geändert|changed|changes|änderungen)$/i, 'imp'],
  [/^(behoben|fehlerbehebungen|bugfixes|fixed|fixes|bug fixes)$/i, 'fix'],
  [/^(erste version|first version|first release|erstes release)$/i, 'first'],
];
const EN_HEAD = /^(new|new features?|added|improved|improvements?|changed|changes|fixed|fixes|bug ?fixes|first version|first release|improved\s*[\/&+]\s*fixed)$/i;
function parseText(txt) {
  const blocks = []; let cur = null, lang = null, sec = null, item = null;
  const start = (version, title) => { cur = { version, title, lang, sections: [] }; blocks.push(cur); sec = null; item = null; };
  for (const raw of txt.replace(/\r/g, '').split('\n')) {
    if (!raw.trim()) continue;
    const indent = raw.match(/^[ \t]*/)[0].replace(/\t/g, '    ').length;
    const line = raw.trim();
    if (/^(deutsch|german)$/i.test(line)) { lang = 'de'; cur = null; continue; }
    if (/^(english|englisch)$/i.test(line)) { lang = 'en'; cur = null; continue; }
    if (/^\d{1,2}\.\s?[A-Za-zÄÖÜäöü]+\.?\s\d{4}/.test(line) || /(^|\s)@\w+/.test(line)) continue;   // date / author line
    const bullet = line.match(/^([-–•*◦▪·]|\d+[.)])\s+(.*)$/);
    const plain = line.replace(/:$/, '').trim();
    const head = !bullet && HEAD.find(h => h[0].test(plain));
    const ver = !bullet && !head && line.match(/^(?:[A-Za-zÄÖÜäöü][\w .&-]{0,40}?\s+)?v?(\d+\.\d+(?:\.\d+)?)(?:\s*[–—:-]\s*(.+))?$/);
    if (ver && !/changelog/i.test(line)) { start(ver[1], ver[2] ? ver[2].trim() : ''); continue; }
    if (/changelog/i.test(line) && !bullet) continue;   // document title
    if (!cur) start('', '');
    if (head) {
      if (!cur.lang) cur.lang = EN_HEAD.test(plain) ? 'en' : 'de';
      sec = { kind: head[1], items: [] }; cur.sections.push(sec); item = null; continue;
    }
    if (!sec) { sec = { kind: 'new', items: [] }; cur.sections.push(sec); }
    const text = bullet ? bullet[2].trim() : line;
    const isSub = item && (line.startsWith('◦') || (bullet && indent >= 2));
    if (isSub) item.sub.push(text);
    else if (bullet || !item) { item = { text, sub: [] }; sec.items.push(item); }
    else if (item.sub.length) item.sub[item.sub.length - 1] += ' ' + text;
    else item.text += ' ' + text;
  }
  // pair the German and English block of each version
  const out = [], byVer = new Map();
  blocks.forEach((b, i) => {
    const key = b.version || '#' + i;
    if (!b.lang) b.lang = byVer.has(key) && byVer.get(key).de ? 'en' : 'de';
    if (!byVer.has(key)) { const o = { version: b.version }; byVer.set(key, o); out.push(o); }
    byVer.get(key)[b.lang] = b;
  });
  return out.map(o => {
    const de = o.de || { sections: [], title: '' }, en = o.en || { sections: [], title: '' };
    const base = de.sections.length >= en.sections.length ? de.sections : en.sections;
    return {
      version: o.version, date: today(), title: { de: de.title || '', en: en.title || '' },
      sections: base.map((s, si) => {
        const d = de.sections[si], e = en.sections[si];
        const n = Math.max(d ? d.items.length : 0, e ? e.items.length : 0);
        return { kind: s.kind, items: Array.from({ length: n }, (_, ii) => {
          const di = d && d.items[ii], ei = e && e.items[ii];
          const ns = Math.max(di ? di.sub.length : 0, ei ? ei.sub.length : 0);
          return { de: di ? di.text : '', en: ei ? ei.text : '', sub: Array.from({ length: ns }, (_, k) => [di && di.sub[k] || '', ei && ei.sub[k] || '']) };
        }) };
      }),
    };
  });
}

// ---------------- side: products + versions ----------------
function products() { return ['aera', ...Object.keys(ST.site.apps)]; }
function drawSide() {
  $('products').innerHTML = products().map(p => `<button data-p="${p}" class="${p === product ? 'on' : ''}">${esc(APP_NAMES[p] || p)}</button>`).join('');
  const list = listFor(product);
  $('versions').innerHTML = list.map((v, i) => {
    const n = v.sections.reduce((a, s) => a + s.items.length, 0);
    const on = draft && draftOrig === v.version;
    return `<button class="st-v ${on ? 'on' : ''}" data-v="${esc(v.version)}"><b>v${esc(v.version)}</b>${i === 0 ? '<i>Aktuell</i>' : ''}<span>${esc(v.title.de || (v.date || ''))}</span><small>${n} ${n === 1 ? 'Eintrag' : 'Einträge'}${v.date && v.title.de ? ' · ' + esc(v.date) : ''}</small></button>`;
  }).join('') || '<p class="muted small">Noch keine Versionen.</p>';
}
$('products').addEventListener('click', e => {
  const b = e.target.closest('[data-p]'); if (!b || b.dataset.p === product) return;
  if (dirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
  product = b.dataset.p; draft = null; dirty = false; drawSide(); drawEditor();
});
$('versions').addEventListener('click', e => {
  const b = e.target.closest('[data-v]'); if (!b) return;
  if (dirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
  const v = listFor(product).find(x => x.version === b.dataset.v);
  draft = clone(v); draftOrig = v.version; dirty = false; preview = false; drawSide(); drawEditor();
});
$('newVersion').addEventListener('click', () => newDraft());
function newDraft(version) {
  if (dirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
  const last = listFor(product)[0];
  const next = version || (last ? last.version.replace(/(\d+)$/, n => +n + 1) : '1.0.0');
  draft = { version: next, date: today(), title: { de: '', en: '' }, sections: [{ kind: 'new', items: [{ de: '', en: '', sub: [] }] }] };
  draftOrig = null; dirty = false; preview = false; drawSide(); drawEditor(true);
}

// ---------------- editor ----------------
const KIND_OPTS = k => Object.entries(KIND).map(([v, t]) => `<option value="${v}" ${v === k ? 'selected' : ''}>${t}</option>`).join('');
function drawEditor(showImport) {
  const ed = $('editor');
  if (!draft) {
    ed.innerHTML = `<div class="st-empty"><svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
      <p>Wähle links eine Version zum Bearbeiten<br>oder lege eine <b>neue Version</b> an.</p></div>`;
    return;
  }
  const a = isAera();
  ed.innerHTML = `
  <div class="st-ed-head">
    <div><span class="st-eyebrow">${esc(APP_NAMES[product] || product)}</span><h1>${draftOrig ? 'v' + esc(draftOrig) + ' bearbeiten' : 'Neue Version'}</h1></div>
    <div class="st-seg"><button data-pv="0" class="${preview ? '' : 'on'}">Bearbeiten</button><button data-pv="1" class="${preview ? 'on' : ''}">Vorschau</button></div>
  </div>
  ${preview ? previewHtml() : `
  <div class="st-grid ${a ? '' : 'two'}">
    <label>Version<input data-f="version" value="${esc(draft.version)}" placeholder="0.8.3"></label>
    <label>Datum<input data-f="date" type="date" value="${esc(draft.date)}"></label>
    ${a ? `<label>Titel (Deutsch)<input data-f="title.de" value="${esc(draft.title.de)}" placeholder="z. B. Schichtende & Auswertung"></label>
    <label>Titel (English)<input data-f="title.en" value="${esc(draft.title.en)}" placeholder="e.g. End of shift & debrief"></label>` : ''}
  </div>
  <details class="st-import" ${showImport ? 'open' : ''}>
    <summary><svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>Text einfügen <span class="muted small">– Changelog so reinkopieren, wie du ihn schreibst</span></summary>
    <textarea id="impText" placeholder="AERA 0.8.3&#10;&#10;Neu&#10;- Erster Punkt&#10;  - Unterpunkt&#10;Behoben&#10;- …&#10;&#10;AERA 0.8.3&#10;&#10;New&#10;- First point&#10;  - Sub-point&#10;Fixed&#10;- …"></textarea>
    <div class="st-row"><span class="muted small">Erkennt Neu/New, Verbessert/Improved, Behoben/Fixed, Aufzählungen mit - • * und eingerückte Unterpunkte. Deutsch und Englisch nacheinander.</span><button class="btn" id="impBtn">Übernehmen</button></div>
  </details>
  <div id="secs">${draft.sections.map(secHtml).join('')}</div>
  <button class="btn st-add" data-act="addSec"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Abschnitt</button>`}
  <footer class="st-ed-foot">
    ${draftOrig ? '<button class="btn st-danger" data-act="del"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>Version löschen</button>' : ''}
    <span class="sp"></span>
    <span class="muted small" id="dirtyNote">${dirty ? 'Nicht gespeichert' : ''}</span>
    <button class="btn" data-act="cancel">Verwerfen</button>
    <button class="btn primary" data-act="save" ${ST.github ? '' : 'disabled title="GITHUB_TOKEN fehlt"'}><svg viewBox="0 0 24 24"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>Veröffentlichen</button>
  </footer>`;
}
function secHtml(s, si) {
  return `<div class="st-sec" data-si="${si}">
    <div class="st-sec-head"><select data-f="kind" class="k-${s.kind}">${KIND_OPTS(s.kind)}</select>
      <span class="sp"></span>
      <button class="icon-btn" data-act="secUp" title="Nach oben"><svg viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"/></svg></button>
      <button class="icon-btn" data-act="secDel" title="Abschnitt löschen"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    ${s.items.map((it, ii) => itemHtml(it, ii)).join('')}
    <button class="btn st-add small" data-act="addItem"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Eintrag</button>
  </div>`;
}
function itemHtml(it, ii) {
  const miss = (it.de && !it.en) || (!it.de && it.en);
  return `<div class="st-item ${miss ? 'miss' : ''}" data-ii="${ii}">
    <div class="st-pair">
      <label><span>DE</span><textarea data-f="de" rows="2" placeholder="Was ist neu? (Deutsch)">${esc(it.de)}</textarea></label>
      <label><span>EN</span><textarea data-f="en" rows="2" placeholder="What's new? (English)">${esc(it.en)}</textarea></label>
      <div class="st-item-act">
        <button class="icon-btn" data-act="itemUp" title="Nach oben"><svg viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"/></svg></button>
        <button class="icon-btn" data-act="addSub" title="Unterpunkt"><svg viewBox="0 0 24 24"><path d="M5 4v10a2 2 0 0 0 2 2h12"/><path d="m15 12 4 4-4 4"/></svg></button>
        <button class="icon-btn" data-act="itemDel" title="Eintrag löschen"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      </div>
    </div>
    ${it.sub.map((x, k) => `<div class="st-pair sub" data-k="${k}">
      <label><span>DE</span><input data-f="s0" value="${esc(x[0])}" placeholder="Unterpunkt"></label>
      <label><span>EN</span><input data-f="s1" value="${esc(x[1])}" placeholder="Sub-point"></label>
      <div class="st-item-act"><button class="icon-btn" data-act="subDel" title="Unterpunkt löschen"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    </div>`).join('')}
    ${miss ? '<p class="st-miss">Übersetzung fehlt – auf der Website wird dann die andere Sprache gezeigt.</p>' : ''}
  </div>`;
}
function previewHtml() {
  const lang = (l) => `<div class="st-prev"><div class="st-prev-head"><span class="st-pv">v${esc(draft.version)}</span><div><b>${esc(draft.title[l] || (APP_NAMES[product] || product))}</b><small>${esc(draft.date || '')}</small></div><em>${l.toUpperCase()}</em></div>
    ${draft.sections.map(s => `<div class="st-prev-sec"><span class="tg k-${s.kind}">${KIND[s.kind]}</span><ul>${s.items.filter(i => i.de || i.en).map(i => `<li>${esc(i[l] || i[l === 'de' ? 'en' : 'de'])}${i.sub.length ? '<ul>' + i.sub.map(x => `<li>${esc(x[l === 'de' ? 0 : 1] || x[l === 'de' ? 1 : 0])}</li>`).join('') + '</ul>' : ''}</li>`).join('')}</ul></div>`).join('')}</div>`;
  return `<div class="st-prevs">${lang('de')}${lang('en')}</div>${isAera() ? '' : '<p class="muted small">Auf der Startseite stehen Unterpunkte in derselben Zeile wie ihr Eintrag.</p>'}`;
}
function markDirty() { dirty = true; const n = $('dirtyNote'); if (n) n.textContent = 'Nicht gespeichert'; }

$('editor').addEventListener('input', e => {
  const f = e.target.dataset.f; if (!f || !draft) return;
  const sec = e.target.closest('[data-si]'), it = e.target.closest('[data-ii]'), sub = e.target.closest('[data-k]');
  if (f === 'version') draft.version = e.target.value;
  else if (f === 'date') draft.date = e.target.value;
  else if (f === 'title.de') draft.title.de = e.target.value;
  else if (f === 'title.en') draft.title.en = e.target.value;
  else if (f === 'kind') { draft.sections[+sec.dataset.si].kind = e.target.value; e.target.className = 'k-' + e.target.value; }
  else if (f === 'de' || f === 'en') draft.sections[+sec.dataset.si].items[+it.dataset.ii][f] = e.target.value;
  else if (f === 's0' || f === 's1') draft.sections[+sec.dataset.si].items[+it.dataset.ii].sub[+sub.dataset.k][+f[1]] = e.target.value;
  markDirty();
});
$('editor').addEventListener('click', async e => {
  const pv = e.target.closest('[data-pv]'); if (pv) { preview = pv.dataset.pv === '1'; drawEditor(); return; }
  if (e.target.closest('#impBtn')) return importText();
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act, sec = b.closest('[data-si]'), it = b.closest('[data-ii]'), sub = b.closest('[data-k]');
  const S = sec && draft.sections[+sec.dataset.si], I = it && S.items[+it.dataset.ii];
  const swap = (arr, i) => { if (i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; };
  switch (act) {
    case 'addSec': draft.sections.push({ kind: 'fix', items: [{ de: '', en: '', sub: [] }] }); break;
    case 'secDel': if (!S.items.some(i => i.de || i.en) || confirm('Abschnitt mit allen Einträgen löschen?')) draft.sections.splice(+sec.dataset.si, 1); break;
    case 'secUp': swap(draft.sections, +sec.dataset.si); break;
    case 'addItem': S.items.push({ de: '', en: '', sub: [] }); break;
    case 'itemDel': S.items.splice(+it.dataset.ii, 1); break;
    case 'itemUp': swap(S.items, +it.dataset.ii); break;
    case 'addSub': I.sub.push(['', '']); break;
    case 'subDel': I.sub.splice(+sub.dataset.k, 1); break;
    case 'cancel': if (!dirty || confirm('Änderungen verwerfen?')) { draft = null; dirty = false; drawSide(); drawEditor(); } return;
    case 'del': return removeVersion();
    case 'save': return save(b);
    default: return;
  }
  markDirty(); drawEditor();
});
function importText() {
  const txt = $('impText').value; if (!txt.trim()) return toast('Erst Text einfügen', true);
  const found = parseText(txt).filter(v => v.sections.length);
  if (!found.length) return toast('Im Text wurden keine Einträge gefunden', true);
  const v = found[0];
  draft.sections = v.sections;
  if (v.version) draft.version = v.version;
  if (v.title.de) draft.title.de = v.title.de;
  if (v.title.en) draft.title.en = v.title.en;
  markDirty(); drawEditor();
  const n = v.sections.reduce((a, s) => a + s.items.length, 0), miss = v.sections.some(s => s.items.some(i => !i.de || !i.en));
  toast(`${n} Einträge übernommen${found.length > 1 ? ' (nur die erste von ' + found.length + ' Versionen)' : ''}${miss ? ' – bei manchen fehlt eine Sprache' : ''}`);
}

// ---------------- save / delete ----------------
function check() {
  draft.version = draft.version.trim().replace(/^v/i, '');
  if (!/^\d+\.\d+(\.\d+)?([-.][0-9a-z.]+)?$/i.test(draft.version)) throw new Error('Version bitte wie 0.8.3 eingeben');
  draft.sections = draft.sections.map(s => ({ ...s, items: s.items.filter(i => i.de.trim() || i.en.trim()).map(i => ({ ...i, sub: i.sub.filter(x => x[0].trim() || x[1].trim()) })) })).filter(s => s.items.length);
  if (!draft.sections.length) throw new Error('Mindestens einen Eintrag schreiben');
  const clash = listFor(product).some(v => v.version === draft.version && v.version !== draftOrig);
  if (clash) throw new Error('Version ' + draft.version + ' gibt es schon');
}
function cmpVer(a, b) { const x = a.split(/[.-]/).map(n => +n || 0), y = b.split(/[.-]/).map(n => +n || 0); for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (y[i] || 0) - (x[i] || 0); return 0; }
async function publish(list, msg) {
  if (isAera()) { const r = await call('studio/aera', { list, message: msg }); ST.aera = r.aera; return r; }
  const others = ST.site.changelog.filter(e => e.app !== product);
  const changelog = [...list, ...others].sort((a, b) => (b.date || '').localeCompare(a.date || '') || cmpVer(a.version, b.version));
  const r = await call('studio/site', { data: { apps: ST.site.apps, changelog }, message: msg }); ST.site = r.site; return r;
}
async function save(btn) {
  try { check(); } catch (e) { return toast(e.message, true); }
  const name = APP_NAMES[product] || product;
  const list = listFor(product).filter(v => v.version !== draftOrig);
  list.push(clone(draft)); list.sort((a, b) => cmpVer(a.version, b.version));
  const conv = isAera() ? list.map(toAera) : list.map(toSite);
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span>Wird veröffentlicht …';
  try {
    const r = await publish(conv, `Studio: ${name} ${draft.version} ${draftOrig ? 'aktualisiert' : 'hinzugefügt'}`);
    draftOrig = draft.version; dirty = false; drawSide(); drawEditor();
    toast(`Veröffentlicht${r.commit ? ' (' + r.commit + ')' : ''} – auf der Website sofort sichtbar`);
  } catch (e) { toast(e.message, true); btn.disabled = false; btn.textContent = 'Veröffentlichen'; }
}
async function removeVersion() {
  const name = APP_NAMES[product] || product;
  if (!confirm(`${name} v${draftOrig} wirklich aus dem Changelog löschen?`)) return;
  const list = listFor(product).filter(v => v.version !== draftOrig);
  try {
    await publish(isAera() ? list.map(toAera) : list.map(toSite), `Studio: ${name} ${draftOrig} aus dem Changelog entfernt`);
    toast('Gelöscht'); draft = null; dirty = false; drawSide(); drawEditor();
  } catch (e) { toast(e.message, true); }
}

// ---------------- downloads ----------------
let REL = null; const picked = {};   // picked[app][slot] = File
const size = n => n > 1e9 ? (n / 1e9).toFixed(2) + ' GB' : n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.round(n / 1e3) + ' KB';
const when = d => d ? new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
async function loadRelease() {
  $('release').innerHTML = '<span class="muted">Lade Release von GitHub …</span>';
  if (!ST.github) { $('release').innerHTML = '<span class="muted">Ohne GitHub-Token können keine Dateien geladen werden.</span>'; REL = { assets: [] }; drawApps(); return; }
  try { REL = await call('studio/release'); }
  catch (e) { REL = { assets: [] }; $('release').innerHTML = `<span class="err">${esc(e.message)}</span>`; drawApps(); return; }
  const total = REL.assets.reduce((a, x) => a + x.downloads, 0);
  $('release').innerHTML = `<div><span class="st-eyebrow">Neuestes GitHub-Release</span><b>${esc(REL.name || REL.tag)}</b> <span class="muted small">${esc(REL.tag)} · ${when(REL.published)}</span></div>
    <div class="st-stat"><b>${total.toLocaleString('de-DE')}</b><span>Downloads gesamt</span></div>
    <a class="btn" href="${esc(REL.url)}" target="_blank" rel="noopener">Auf GitHub ansehen</a>`;
  drawApps();
}
function drawApps() {
  $('apps').innerHTML = Object.entries(ST.site.apps).map(([id, a]) => {
    const slots = SLOTS.filter(([k]) => a[k]);
    return `<article class="st-app" data-app="${id}">
      <header><div><span class="st-eyebrow">Programm</span><h2>${esc(APP_NAMES[id] || id)}</h2></div>
        <label class="st-ver">Version auf der Website<input data-f="ver" value="${esc(a.version)}"></label></header>
      ${slots.map(([k, label, hint]) => {
        const f = a[k], as = REL && REL.assets.find(x => x.name === f), p = picked[id] && picked[id][k];
        return `<div class="st-slot" data-slot="${k}">
          <div class="st-slot-info"><b>${label}</b><code>${esc(f)}</code>
            <span class="muted small">${as ? `${size(as.size)} · ${as.downloads.toLocaleString('de-DE')} Downloads · ${when(as.updated)}` : (REL && REL.tag ? '<span class="err">fehlt im Release</span>' : '')}</span></div>
          <label class="btn st-pick ${p ? 'has' : ''}"><input type="file" hidden data-f="file">${p ? esc(p.name) + ' · ' + size(p.size) : 'Neue Datei wählen'}</label>
          <div class="st-prog"><i></i></div>
        </div>`;
      }).join('')}
      <footer><span class="muted small">Die Datei wird auf GitHub unter dem Namen links abgelegt – die Download-Buttons bleiben gleich.</span><span class="sp"></span>
        <button class="btn primary" data-act="publish" ${ST.github ? '' : 'disabled'}><svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>Update veröffentlichen</button></footer>
    </article>`;
  }).join('');
}
$('apps').addEventListener('change', e => {
  if (e.target.dataset.f !== 'file') return;
  const app = e.target.closest('[data-app]').dataset.app, slot = e.target.closest('[data-slot]').dataset.slot, f = e.target.files[0];
  if (!f) return;
  (picked[app] = picked[app] || {})[slot] = f;
  const ver = e.target.closest('[data-app]').querySelector('[data-f=ver]').value;
  drawApps();
  document.querySelector(`[data-app="${app}"] [data-f=ver]`).value = ver;
});
function upload(name, file, bar) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('PUT', '/api/studio/upload?name=' + encodeURIComponent(name));
    x.setRequestHeader('X-Dsue', '1'); x.setRequestHeader('Content-Type', 'application/octet-stream');
    x.upload.onprogress = ev => { if (ev.lengthComputable) bar.style.width = (ev.loaded / ev.total * 92).toFixed(1) + '%'; };
    x.onload = () => { let d = {}; try { d = JSON.parse(x.responseText); } catch {} if (x.status === 200) { bar.style.width = '100%'; resolve(d); } else reject(new Error(d.error || 'Upload fehlgeschlagen (' + x.status + ')')); };
    x.onerror = () => reject(new Error('Verbindung abgebrochen'));
    x.send(file);
  });
}
$('apps').addEventListener('click', async e => {
  const b = e.target.closest('[data-act=publish]'); if (!b) return;
  const card = b.closest('[data-app]'), id = card.dataset.app, a = ST.site.apps[id];
  const ver = card.querySelector('[data-f=ver]').value.trim().replace(/^v/i, '');
  const files = Object.entries(picked[id] || {});
  if (!/^\d+\.\d+(\.\d+)?([-.][0-9a-z.]+)?$/i.test(ver)) return toast('Version bitte wie 1.0.3 eingeben', true);
  if (!files.length && ver === a.version) return toast('Wähle eine Datei oder ändere die Version', true);
  if (!confirm(`${APP_NAMES[id] || id} ${ver} veröffentlichen?${files.length ? '\n\n' + files.map(([k, f]) => '• ' + f.name + ' → ' + a[k]).join('\n') + '\n\nDie alten Dateien werden auf GitHub ersetzt.' : ''}`)) return;
  b.disabled = true; window.onbeforeunload = () => true;
  try {
    for (const [k, f] of files) {
      b.innerHTML = `<span class="spin"></span>Lade ${esc(f.name)} hoch …`;
      const slot = card.querySelector(`[data-slot="${k}"]`); slot.classList.add('busy');
      await upload(a[k], f, slot.querySelector('.st-prog i'));
      slot.classList.remove('busy'); slot.classList.add('done');
    }
    if (ver !== a.version) {
      b.innerHTML = '<span class="spin"></span>Version wird gespeichert …';
      const r = await call('studio/site', { data: { ...ST.site, apps: { ...ST.site.apps, [id]: { ...a, version: ver } } }, message: `Studio: ${APP_NAMES[id] || id} ${ver} veröffentlicht` });
      ST.site = r.site;
    }
    delete picked[id];
    toast(`${APP_NAMES[id] || id} ${ver} ist online`);
    await loadRelease();
    const has = ST.site.changelog.some(x => x.app === id && x.version === ver);
    if (!has && confirm(`Für ${ver} gibt es noch keinen Changelog-Eintrag. Jetzt schreiben?`)) { switchTab('changelog'); product = id; draft = null; dirty = false; newDraft(ver); }
  } catch (err) { toast(err.message, true); drawApps(); }
  finally { window.onbeforeunload = null; b.disabled = false; }
});

// ---------------- tabs, theme, start ----------------
function switchTab(t) {
  document.querySelectorAll('#tabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $('tab-changelog').classList.toggle('hidden', t !== 'changelog'); $('tab-downloads').classList.toggle('hidden', t !== 'downloads');
  if (t === 'downloads' && !REL) loadRelease();
  history.replaceState(null, '', '#' + t);
}
$('tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) switchTab(b.dataset.tab); });
$('theme').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  if (dark) document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme;
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
});
$('logoutBtn').addEventListener('click', async () => { try { await call('logout', {}); } catch {} location.href = '/admin/'; });
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

(async () => {
  try { const t = localStorage.getItem('theme'); if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.dataset.theme = 'dark'; } catch {}
  try {
    const me = await call('me'); if (!me.user) { location.href = '/admin/?next=studio'; return; }
    ST = await call('studio/state');
  } catch (e) { if (ST === null) { document.body.innerHTML = '<p style="padding:40px">' + esc(e.message) + '</p>'; return; } }
  $('app').classList.remove('hidden');
  $('tokenBanner').classList.toggle('hidden', ST.github); $('repoName').textContent = ST.repo;
  drawSide(); drawEditor();
  switchTab(location.hash === '#downloads' ? 'downloads' : 'changelog');
})();
