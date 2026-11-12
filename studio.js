// dev-dsue.de – Studio (/admin/studio): changelogs and program downloads – by Desue
//
// Everything that should survive a redeploy is written to GitHub, never to this container's disk:
//   - changelogs and app versions: committed as data/*.json to the repository (Railway then redeploys)
//   - program files: uploaded as assets to the newest GitHub release (the download links point to "latest")
// Until the redeploy is done the server already serves the new data from memory.
//
// Environment:
//   GITHUB_TOKEN    fine-grained token for the repository: Contents = Read and write (needed for both)
//   GITHUB_REPO     default desuee/dev-dsue-website
//   GITHUB_BRANCH   default main
//   GITHUB_API      default https://api.github.com          (only changed for local tests)
//   GITHUB_UPLOADS  default https://uploads.github.com
const fs = require('fs'), path = require('path'), https = require('https'), http = require('http');

const TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = process.env.GITHUB_REPO || 'desuee/dev-dsue-website';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const API = process.env.GITHUB_API || 'https://api.github.com';
const UPLOADS = process.env.GITHUB_UPLOADS || 'https://uploads.github.com';
const DATA = path.join(__dirname, 'data');
const FILES = { aera: 'data/aera-changelog.json', site: 'data/apps.json' };

// ---------------- data in memory ----------------
const load = f => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
const mem = { aera: load(FILES.aera), site: load(FILES.site) };
const js = {
  aera: () => '// AERA changelog – generated from data/aera-changelog.json (edit at /admin/studio)\nwindow.AERA_CHANGELOG = ' + JSON.stringify(mem.aera) + ';\n',
  site: () => '// dev-dsue.de apps and changelog – generated from data/apps.json (edit at /admin/studio)\nwindow.DSUE_DATA = ' + JSON.stringify(mem.site) + ';\n',
};

// ---------------- validation ----------------
const KINDS = new Set(['new', 'imp', 'fix', 'impfix', 'first']);
const str = (v, max = 2000) => String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, max);
const VER = /^\d+\.\d+(\.\d+)?([-.][0-9a-z.]+)?$/i, DATE = /^(\d{4}-\d{2}(-\d{2})?)?$/;
function bad(m) { const e = new Error(m); e.status = 400; throw e; }

function cleanAera(list) {
  if (!Array.isArray(list) || list.length > 500) bad('Ungültige Liste');
  const seen = new Set();
  return list.map(v => {
    const version = str(v.version, 40); if (!VER.test(version)) bad('Ungültige Version: ' + version);
    if (seen.has(version)) bad('Version doppelt: ' + version); seen.add(version);
    const date = str(v.date, 10); if (!DATE.test(date)) bad('Ungültiges Datum bei ' + version);
    const sections = (Array.isArray(v.sections) ? v.sections : []).map(s => {
      if (!KINDS.has(s.kind)) bad('Ungültige Art bei ' + version);
      const items = (Array.isArray(s.items) ? s.items : []).map(it => {
        const o = { de: str(it.de), en: str(it.en) };
        if (!o.de && !o.en) return null;
        const sub = (Array.isArray(it.sub) ? it.sub : []).map(x => [str(x && x[0]), str(x && x[1])]).filter(x => x[0] || x[1]);
        if (sub.length) o.sub = sub;
        return o;
      }).filter(Boolean);
      return items.length ? { kind: s.kind, items } : null;
    }).filter(Boolean);
    if (!sections.length) bad('Version ' + version + ' hat keine Einträge');
    const t = v.title || {};
    return { version, date: date || null, title: { de: str(t.de, 120), en: str(t.en, 120) }, sections };
  });
}
function cleanSite(d) {
  const apps = {};
  for (const [id, a] of Object.entries(d && d.apps || {})) {
    if (!/^[a-z0-9-]{1,40}$/.test(id)) bad('Ungültige App');
    const o = { version: str(a.version, 40) }; if (!VER.test(o.version)) bad('Ungültige Version bei ' + id);
    for (const k of ['win', 'macArm', 'macIntel']) if (a[k]) { const f = str(a[k], 120); if (!/^[A-Za-z0-9._-]+$/.test(f)) bad('Ungültiger Dateiname bei ' + id); o[k] = f; }
    if (a.style) o.style = str(a.style, 20);
    apps[id] = o;
  }
  const changelog = (Array.isArray(d && d.changelog) ? d.changelog : []).map(e => {
    const app = str(e.app, 40); if (!apps[app]) bad('Unbekannte App im Changelog: ' + app);
    const version = str(e.version, 40); if (!VER.test(version)) bad('Ungültige Version: ' + version);
    const date = str(e.date, 10); if (!DATE.test(date)) bad('Ungültiges Datum bei ' + app + ' ' + version);
    const items = (Array.isArray(e.items) ? e.items : []).map(x => {
      if (!Array.isArray(x) || !KINDS.has(x[0])) bad('Ungültiger Eintrag bei ' + app + ' ' + version);
      return [x[0], str(x[1]), str(x[2])];
    }).filter(x => x[1] || x[2]);
    if (!items.length) bad(app + ' ' + version + ' hat keine Einträge');
    return { app, version, date, items };
  });
  return { apps, changelog };
}

// ---------------- GitHub ----------------
function gh(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url), mod = u.protocol === 'http:' ? http : https;
    const data = body == null ? null : Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
    const req = mod.request(u, { method, headers: { 'User-Agent': 'dsue-studio', 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', Authorization: 'Bearer ' + TOKEN,
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {}), ...headers } }, res => {
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => {
        const txt = Buffer.concat(chunks).toString(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch {}
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(j);
        else { const e = new Error(ghError(res.statusCode, j)); e.status = res.statusCode === 404 ? 404 : 502; reject(e); }
      });
    });
    req.on('error', e => reject(Object.assign(new Error('GitHub nicht erreichbar: ' + e.message), { status: 502 })));
    if (data) req.end(data); else req.end();
  });
}
function ghError(code, j) {
  if (code === 401) return 'GitHub-Token ungültig oder abgelaufen';
  if (code === 403) return 'GitHub-Token hat keine Berechtigung (Contents: Read and write nötig)';
  if (code === 409) return 'Konflikt mit einer anderen Änderung – bitte Seite neu laden';
  return 'GitHub: ' + ((j && j.message) || 'Fehler ' + code);
}
const needToken = () => { if (!TOKEN) { const e = new Error('GITHUB_TOKEN ist auf Railway nicht gesetzt'); e.status = 503; throw e; } };

async function commitJson(key, value, message) {
  needToken();
  const file = FILES[key], url = `${API}/repos/${REPO}/contents/${file}`;
  let sha;
  try { sha = (await gh('GET', `${url}?ref=${BRANCH}`)).sha; } catch (e) { if (e.status !== 404) throw e; }
  const content = Buffer.from(JSON.stringify(value, null, 1) + '\n').toString('base64');
  const r = await gh('PUT', url, { message, content, sha, branch: BRANCH });
  mem[key] = value;
  return { commit: r && r.commit && r.commit.sha ? r.commit.sha.slice(0, 7) : '' };
}

async function latestRelease() {
  needToken();
  return gh('GET', `${API}/repos/${REPO}/releases/latest`);
}
const assetInfo = a => ({ id: a.id, name: a.name, size: a.size, downloads: a.download_count, updated: a.updated_at });

// stream the request body into the newest release, then swap it in for the old file of the same name
async function uploadAsset(req, name) {
  needToken();
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(name)) bad('Ungültiger Dateiname');
  const len = +req.headers['content-length'] || 0;
  if (!len) bad('Datei fehlt');
  if (len > 2e9) bad('Datei zu groß (max. 2 GB)');
  const rel = await latestRelease();
  const tmp = 'upload-' + Date.now() + '-' + name;
  const up = new URL(`${UPLOADS}/repos/${REPO}/releases/${rel.id}/assets`); up.searchParams.set('name', tmp);
  const asset = await new Promise((resolve, reject) => {
    const mod = up.protocol === 'http:' ? http : https;
    const r = mod.request(up, { method: 'POST', headers: { 'User-Agent': 'dsue-studio', Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/octet-stream', 'Content-Length': len } }, res => {
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => {
        let j = null; try { j = JSON.parse(Buffer.concat(chunks).toString()); } catch {}
        res.statusCode < 300 ? resolve(j) : reject(Object.assign(new Error(ghError(res.statusCode, j)), { status: 502 }));
      });
    });
    r.on('error', e => reject(Object.assign(new Error('Upload zu GitHub abgebrochen: ' + e.message), { status: 502 })));
    req.on('aborted', () => r.destroy(new Error('Upload im Browser abgebrochen')));
    req.pipe(r);
  });
  // the new file is safely on GitHub: now remove the old one and give the new one its real name
  const old = (rel.assets || []).filter(a => a.name === name);
  for (const a of old) await gh('DELETE', `${API}/repos/${REPO}/releases/assets/${a.id}`);
  const fin = await gh('PATCH', `${API}/repos/${REPO}/releases/assets/${asset.id}`, { name });
  return { release: rel.tag_name, asset: assetInfo(fin), replaced: old.length > 0 };
}

// ---------------- routes ----------------
// called by server.js for /api/studio/* once the session is checked
async function handle(req, res, u, p, send, readJson) {
  const r = p.slice('/api/studio/'.length);
  if (r === 'state' && req.method === 'GET') {
    return send(res, 200, { github: !!TOKEN, repo: REPO, branch: BRANCH, aera: mem.aera, site: mem.site });
  }
  if (r === 'release' && req.method === 'GET') {
    const rel = await latestRelease();
    return send(res, 200, { tag: rel.tag_name, name: rel.name, url: rel.html_url, published: rel.published_at, assets: (rel.assets || []).map(assetInfo) });
  }
  if (r === 'aera' && req.method === 'POST') {
    const b = await readJson(req); const list = cleanAera(b.list);
    const out = await commitJson('aera', list, str(b.message, 120) || 'Studio: AERA-Changelog aktualisiert');
    return send(res, 200, { ok: true, ...out, aera: mem.aera });
  }
  if (r === 'site' && req.method === 'POST') {
    const b = await readJson(req); const data = cleanSite(b.data);
    const out = await commitJson('site', data, str(b.message, 120) || 'Studio: Apps/Changelog aktualisiert');
    return send(res, 200, { ok: true, ...out, site: mem.site });
  }
  if (r === 'upload' && req.method === 'PUT') {
    return send(res, 200, { ok: true, ...(await uploadAsset(req, String(u.searchParams.get('name') || ''))) });
  }
  send(res, 404, { error: 'Not found' });
}

module.exports = { handle, js };
