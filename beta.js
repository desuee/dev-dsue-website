// dev-dsue.de – AERA beta area (/beta): sign in with Discord, download the newest beta build – by Desue
//
// Who gets in: everybody who is on the AERA Discord server and has one of the roles in BETA_ROLE_IDS.
// Take the role away and the next sign-in fails; a session lasts at most SESSION_DAYS.
// The installers live in a PRIVATE GitHub repository (releases). This server streams them to signed-in testers only,
// so the files have no public link.
//
// Environment (Railway → Variables):
//   DISCORD_CLIENT_ID      Discord application → OAuth2 → Client ID
//   DISCORD_CLIENT_SECRET  Discord application → OAuth2 → Client Secret
//   DISCORD_GUILD_ID       ID of the AERA Discord server
//   BETA_ROLE_IDS          comma separated role IDs that may download (Beta Tester, Developer, …)
//   PUBLIC_URL             default https://www.dev-dsue.de   (redirect: PUBLIC_URL/beta/callback)
//   BETA_REPO              default desuee/aera-beta          (private repository with the releases)
//   BETA_GITHUB_TOKEN      fine-grained token with Contents: Read for BETA_REPO (falls back to GITHUB_TOKEN)
//   BETA_SECRET            optional, signs the session cookie (default: derived from the client secret)
//   SESSION_DAYS           default 7
const crypto = require('crypto');
const { Readable } = require('stream');

const CID = process.env.DISCORD_CLIENT_ID || '';
const CSECRET = process.env.DISCORD_CLIENT_SECRET || '';
const GUILD = process.env.DISCORD_GUILD_ID || '';
const ROLES = (process.env.BETA_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const PUBLIC_URL = (process.env.PUBLIC_URL || 'https://www.dev-dsue.de').replace(/\/$/, '');
const REPO = process.env.BETA_REPO || 'desuee/aera-beta';
const TOKEN = process.env.BETA_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';
const SECRET = crypto.createHash('sha256').update(process.env.BETA_SECRET || ('aera-beta:' + CSECRET)).digest();
const DAYS = +process.env.SESSION_DAYS || 7;
const REDIRECT = PUBLIC_URL + '/beta/callback';
const configured = () => !!(CID && CSECRET && GUILD && ROLES.length);

if (!configured()) console.warn('Beta area: DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET / DISCORD_GUILD_ID / BETA_ROLE_IDS not set – /beta sign-in is off.');

// ---------------- signed cookie (survives restarts, nothing stored on the server) ----------------
const b64 = b => Buffer.from(b).toString('base64url');
const sign = s => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
function makeToken(o) { const p = b64(JSON.stringify(o)); return p + '.' + sign(p); }
function readToken(t) {
  if (!t || t.indexOf('.') < 0) return null;
  const [p, s] = t.split('.');
  const a = Buffer.from(sign(p)), b = Buffer.from(s || '');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { const o = JSON.parse(Buffer.from(p, 'base64url').toString()); return o.exp > Date.now() ? o : null; } catch { return null; }
}
const cookie = (req, n) => { const m = (req.headers.cookie || '').match(new RegExp('(?:^|; )' + n + '=([^;]+)')); return m ? decodeURIComponent(m[1]) : ''; };
const secure = req => (req.headers['x-forwarded-proto'] === 'https' || PUBLIC_URL.startsWith('https')) ? '; Secure' : '';
const user = req => readToken(cookie(req, 'aera_beta'));

// ---------------- GitHub (private releases) ----------------
async function gh(path) {
  if (!TOKEN) { const e = new Error('Beta downloads are not set up yet (token missing)'); e.status = 503; throw e; }
  const r = await fetch('https://api.github.com' + path, { headers: { Authorization: 'Bearer ' + TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'dev-dsue-beta' } });
  if (!r.ok) { const e = new Error(r.status === 404 ? 'No beta release found' : 'GitHub error ' + r.status); e.status = r.status === 404 ? 404 : 502; throw e; }
  return r.json();
}
let cache = { t: 0, data: null };
async function releases() {
  if (cache.data && Date.now() - cache.t < 60000) return cache.data;
  const list = (await gh(`/repos/${REPO}/releases?per_page=10`)).filter(r => !r.draft);
  cache = { t: Date.now(), data: list.map(r => ({
    tag: r.tag_name, name: r.name || r.tag_name, notes: (r.body || '').slice(0, 6000), date: r.published_at, pre: r.prerelease,
    assets: (r.assets || []).map(a => ({ id: a.id, name: a.name, size: a.size })) })) };
  return cache.data;
}

// ---------------- routes ----------------
// returns true when the request was handled
async function handle(req, res, u, p, send, serveFile, pagePath) {
  if (p === '/beta/' ) { res.writeHead(301, { Location: '/beta' }); res.end(); return true; }
  if (p === '/beta') { serveFile(res, pagePath); return true; }

  if (p === '/beta/login') {
    if (!configured()) { res.writeHead(302, { Location: '/beta?e=setup' }); res.end(); return true; }
    const state = crypto.randomBytes(16).toString('hex');
    const q = new URLSearchParams({ client_id: CID, redirect_uri: REDIRECT, response_type: 'code', scope: 'identify guilds.members.read', state, prompt: 'none' });
    res.writeHead(302, { Location: 'https://discord.com/oauth2/authorize?' + q, 'Set-Cookie': `aera_state=${state}; HttpOnly; SameSite=Lax; Max-Age=600; Path=/beta${secure(req)}`, 'Cache-Control': 'no-store' });
    res.end(); return true;
  }

  if (p === '/beta/callback') {
    const fail = code => { res.writeHead(302, { Location: '/beta?e=' + code, 'Set-Cookie': `aera_state=; Max-Age=0; Path=/beta` }); res.end(); return true; };
    const code = u.searchParams.get('code'), state = u.searchParams.get('state');
    if (!code || !state || state !== cookie(req, 'aera_state')) return fail('state');
    try {
      const tok = await fetch('https://discord.com/api/v10/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: CID, client_secret: CSECRET, grant_type: 'authorization_code', code, redirect_uri: REDIRECT }) }).then(r => r.json());
      if (!tok.access_token) return fail('discord');
      const H = { Authorization: 'Bearer ' + tok.access_token };
      const mr = await fetch(`https://discord.com/api/v10/users/@me/guilds/${GUILD}/member`, { headers: H });
      if (mr.status === 404) return fail('notmember');
      if (!mr.ok) return fail('discord');
      const m = await mr.json();
      if (!(m.roles || []).some(r => ROLES.includes(r))) return fail('norole');
      const du = m.user || {};
      const t = makeToken({ id: du.id, name: m.nick || du.global_name || du.username, avatar: du.avatar ? `https://cdn.discordapp.com/avatars/${du.id}/${du.avatar}.png?size=64` : '', exp: Date.now() + DAYS * 864e5 });
      res.writeHead(302, { Location: '/beta', 'Set-Cookie': [`aera_beta=${encodeURIComponent(t)}; HttpOnly; SameSite=Lax; Max-Age=${DAYS * 86400}; Path=/${secure(req)}`, 'aera_state=; Max-Age=0; Path=/beta'], 'Cache-Control': 'no-store' });
      res.end(); console.log('beta sign-in', du.username); return true;
    } catch (e) { console.warn('beta callback', e.message); return fail('discord'); }
  }

  if (p === '/beta/logout') { res.writeHead(302, { Location: '/beta', 'Set-Cookie': 'aera_beta=; Max-Age=0; Path=/' }); res.end(); return true; }

  if (p === '/api/beta/me') { const s = user(req); send(res, 200, { user: s ? { name: s.name, avatar: s.avatar } : null, ready: configured() }); return true; }

  if (p === '/api/beta/releases') {
    if (!user(req)) { send(res, 401, { error: 'Not signed in' }); return true; }
    try { send(res, 200, { releases: await releases() }); } catch (e) { send(res, e.status || 500, { error: e.message }); }
    return true;
  }

  const m = p.match(/^\/beta\/download\/(\d+)$/);
  if (m) {
    const s = user(req);
    if (!s) { res.writeHead(302, { Location: '/beta' }); res.end(); return true; }
    try {
      const rel = await releases(), a = rel.flatMap(r => r.assets).find(x => String(x.id) === m[1]);
      if (!a) { send(res, 404, { error: 'File not found' }); return true; }
      const r = await fetch(`https://api.github.com/repos/${REPO}/releases/assets/${a.id}`, { headers: { Authorization: 'Bearer ' + TOKEN, Accept: 'application/octet-stream', 'User-Agent': 'dev-dsue-beta' }, redirect: 'follow' });
      if (!r.ok || !r.body) { send(res, 502, { error: 'Download failed (' + r.status + ')' }); return true; }
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': r.headers.get('content-length') || a.size,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(a.name)}`, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
      Readable.fromWeb(r.body).pipe(res);
      console.log('beta download', a.name, 'by', s.name);
    } catch (e) { send(res, e.status || 500, { error: e.message }); }
    return true;
  }
  return false;
}

module.exports = { handle };
