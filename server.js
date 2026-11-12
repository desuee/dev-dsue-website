// dev-dsue.de – website + webmail (/admin) – by Desue
// The website files are served as they are (same files GitHub Pages used). /admin is a small webmail for kontakt@dev-dsue.de.
// Signs in with the mailbox's own address + password (checked by the mail server over IMAP).
// The password is never written anywhere: it lives only in this process's memory, encrypted, for the session.
//
// Environment:
//   PORT            port to listen on (Railway sets it)
//   ALLOWED_USERS   comma separated mail addresses that may sign in (required), e.g. kontakt@dev-dsue.de
//   IMAP_HOST       default dmail01.bero-host.de      IMAP_PORT  default 993 (TLS)
//   SMTP_HOST       default = IMAP_HOST               SMTP_PORT  default 465 (TLS)
//   SESSION_MINUTES idle timeout, default 60
//   MOCK=1          demo mailbox without a mail server (for testing the page)
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');

const PORT = +process.env.PORT || 8080;
const ALLOWED = (process.env.ALLOWED_USERS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const IMAP_HOST = process.env.IMAP_HOST || 'dmail01.bero-host.de';
const IMAP_PORT = +process.env.IMAP_PORT || 993;
const SMTP_HOST = process.env.SMTP_HOST || IMAP_HOST;
const SMTP_PORT = +process.env.SMTP_PORT || 465;
const IDLE_MS = (+process.env.SESSION_MINUTES || 60) * 60000;
const MOCK = process.env.MOCK === '1';
const ROOT = __dirname, ADMIN = path.join(__dirname, 'admin');

if (!ALLOWED.length && !MOCK) console.warn('ALLOWED_USERS is not set – nobody can sign in.');

// ---------------- sessions (memory only) ----------------
const KEY = crypto.randomBytes(32);   // new on every start: a restart signs everybody out
const seal = s => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', KEY, iv); const e = Buffer.concat([c.update(s, 'utf8'), c.final()]); return Buffer.concat([iv, c.getAuthTag(), e]); };
const open = b => { const d = crypto.createDecipheriv('aes-256-gcm', KEY, b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'); };
const sessions = new Map();   // token -> { user, pass(sealed), last, client }
setInterval(() => { const now = Date.now(); for (const [t, s] of sessions) if (now - s.last > IDLE_MS) endSession(t); }, 60000).unref();
function endSession(t) { const s = sessions.get(t); if (!s) return; sessions.delete(t); try { s.client && s.client.logout().catch(() => {}); } catch {} }

// sign-in protection: 5 wrong tries per address per 15 minutes, 20 overall per hour
const fails = new Map(); let globalFails = [];
function blocked(ip) {
  const now = Date.now(); globalFails = globalFails.filter(t => now - t < 3600000);
  const f = (fails.get(ip) || []).filter(t => now - t < 900000); fails.set(ip, f);
  return f.length >= 5 || globalFails.length >= 20;
}
function failed(ip) { const f = fails.get(ip) || []; f.push(Date.now()); fails.set(ip, f); globalFails.push(Date.now()); }

// ---------------- mail backend ----------------
const { ImapFlow } = MOCK ? {} : require('imapflow');
const { simpleParser } = require('mailparser');
const nodemailer = MOCK ? null : require('nodemailer');

async function imapFor(s) {
  if (MOCK) return null;
  if (s.client && s.client.usable) return s.client;
  const c = new ImapFlow({ host: IMAP_HOST, port: IMAP_PORT, secure: IMAP_PORT === 993, auth: { user: s.user, pass: open(s.pass) }, logger: false, emitLogs: false });
  c.on('error', () => {});
  await c.connect();
  s.client = c;
  return c;
}
async function withBox(s, folder, fn) {
  const c = await imapFor(s);
  const lock = await c.getMailboxLock(folder);
  try { return await fn(c); } finally { lock.release(); }
}

const mock = MOCK ? require('./mock') : null;

const api = {
  async folders(s) {
    if (MOCK) return mock.folders();
    const c = await imapFor(s);
    const list = await c.list({ statusQuery: { unseen: true, messages: true } });
    return list.filter(f => !f.flags || !f.flags.has('\\Noselect')).map(f => ({ path: f.path, name: f.name, special: f.specialUse || '', unseen: f.status ? f.status.unseen : 0, total: f.status ? f.status.messages : 0 }));
  },
  async list(s, folder, page, q) {
    if (MOCK) return mock.list(folder, page, q);
    return withBox(s, folder, async c => {
      const per = 50;
      let uids = await c.search(q ? { or: [{ subject: q }, { from: q }, { to: q }, { body: q }] } : { all: true }, { uid: true });
      uids = (uids || []).sort((a, b) => b - a);
      const total = uids.length, pick = uids.slice((page - 1) * per, page * per);
      const out = [];
      if (pick.length) for await (const m of c.fetch(pick.join(','), { uid: true, envelope: true, flags: true, size: true, bodyStructure: true }, { uid: true })) {
        const e = m.envelope || {};
        out.push({ uid: m.uid, subject: e.subject || '', from: (e.from || [])[0] || {}, to: e.to || [], date: e.date, seen: m.flags.has('\\Seen'), flagged: m.flags.has('\\Flagged'), answered: m.flags.has('\\Answered'), size: m.size, att: hasAtt(m.bodyStructure) });
      }
      out.sort((a, b) => b.uid - a.uid);
      return { total, page, per, items: out };
    });
  },
  async message(s, folder, uid) {
    if (MOCK) return mock.message(folder, uid);
    return withBox(s, folder, async c => {
      const m = await c.fetchOne(String(uid), { source: true, flags: true }, { uid: true });
      if (!m) throw new Error('Message not found');
      const p = await simpleParser(m.source);
      c.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true }).catch(() => {});
      return shape(p, uid, m.flags);
    });
  },
  async attachment(s, folder, uid, idx) {
    if (MOCK) return mock.attachment(folder, uid, idx);
    return withBox(s, folder, async c => {
      const m = await c.fetchOne(String(uid), { source: true }, { uid: true });
      const p = await simpleParser(m.source);
      const a = (p.attachments || [])[idx]; if (!a) throw new Error('Attachment not found');
      return { name: a.filename || 'attachment', type: a.contentType || 'application/octet-stream', data: a.content };
    });
  },
  async flag(s, folder, uid, flag, on) {
    if (MOCK) return mock.flag(folder, uid, flag, on);
    return withBox(s, folder, c => on ? c.messageFlagsAdd(String(uid), [flag], { uid: true }) : c.messageFlagsRemove(String(uid), [flag], { uid: true }));
  },
  async move(s, folder, uid, to) {
    if (MOCK) return mock.move(folder, uid, to);
    return withBox(s, folder, c => c.messageMove(String(uid), to, { uid: true }));
  },
  async remove(s, folder, uid) {
    if (MOCK) return mock.remove(folder, uid);
    const fl = await api.folders(s), trash = (fl.find(f => f.special === '\\Trash') || {}).path;
    if (trash && trash !== folder) return api.move(s, folder, uid, trash);
    return withBox(s, folder, c => c.messageDelete(String(uid), { uid: true }));   // already in the bin: delete for good
  },
  async send(s, msg) {
    if (MOCK) return mock.send(msg);
    const pass = open(s.pass);
    const t = nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465, auth: { user: s.user, pass } });
    const mail = { from: msg.fromName ? { name: msg.fromName, address: s.user } : s.user, to: msg.to, cc: msg.cc || undefined, subject: msg.subject, text: msg.text, inReplyTo: msg.inReplyTo || undefined, references: msg.references || undefined };
    const info = await t.sendMail(mail);
    // keep a copy in "Sent"
    try {
      const raw = await new Promise((res, rej) => nodemailer.createTransport({ streamTransport: true, buffer: true }).sendMail({ ...mail, messageId: info.messageId, date: new Date() }, (e, r) => e ? rej(e) : res(r.message)));
      const fl = await api.folders(s), sent = (fl.find(f => f.special === '\\Sent') || fl.find(f => /^(sent|gesendet)/i.test(f.name)) || {}).path;
      if (sent) { const c = await imapFor(s); await c.append(sent, raw, ['\\Seen']); }
    } catch {}
    if (msg.replyFolder && msg.replyUid) api.flag(s, msg.replyFolder, msg.replyUid, '\\Answered', true).catch(() => {});
    return { ok: true };
  },
};
function hasAtt(bs) { if (!bs) return false; if (bs.disposition === 'attachment') return true; return (bs.childNodes || []).some(hasAtt); }
function addr(a) { return a && a.value ? a.value.map(v => ({ name: v.name || '', address: v.address || '' })) : []; }
function shape(p, uid, flags) {
  return {
    uid, subject: p.subject || '', date: p.date, from: addr(p.from), to: addr(p.to), cc: addr(p.cc), replyTo: addr(p.replyTo),
    messageId: p.messageId || '', references: [].concat(p.references || []).join(' '),
    html: p.html || '', text: p.text || '', flagged: flags ? flags.has('\\Flagged') : false,
    attachments: (p.attachments || []).map((a, i) => ({ i, name: a.filename || 'attachment', size: a.size, type: a.contentType, cid: a.contentDisposition === 'inline' && a.cid ? a.cid : '' })),
    inline: Object.fromEntries((p.attachments || []).filter(a => a.cid && /^image\//.test(a.contentType) && a.size < 3e6).map(a => [a.cid, `data:${a.contentType};base64,${a.content.toString('base64')}`])),
  };
}

// ---------------- http ----------------
// /admin: e-mails are shown in a sandboxed iframe (no scripts); it inherits this policy, so inline styles and https images
// are allowed here – the iframe adds its own stricter rule that blocks remote images until "Load images" is clicked
const CSP = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'";
function send(res, code, body, type = 'application/json', extra = {}) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow', 'Content-Security-Policy': CSP, 'Strict-Transport-Security': 'max-age=15552000', ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
const readJson = req => new Promise((resolve, reject) => {
  let size = 0; const chunks = [];
  req.on('data', c => { size += c.length; if (size > 30e6) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch { reject(new Error('bad json')); } });
  req.on('error', reject);
});
const cookie = (req, n) => { const m = (req.headers.cookie || '').match(new RegExp('(?:^|; )' + n + '=([^;]+)')); return m ? m[1] : ''; };
const ipOf = req => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',').pop().trim();
const secure = req => req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'application/javascript; charset=utf-8', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', svg: 'image/svg+xml', ico: 'image/x-icon', txt: 'text/plain; charset=utf-8' };
// public website: only these files / the img folder (never server code or package files)
const SITE = new Set(['index.html', 'impressum.html', 'datenschutz.html', 'style.css', 'app.js', 'theme.js', 'robots.txt', 'aera.html', 'aera.css', 'aera.js']);
const SITE_CSP = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'";
function serveFile(res, file, cache, csp) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, notFound(), TYPES.html);
  const ext = path.extname(file).slice(1).toLowerCase();
  send(res, 200, fs.readFileSync(file), TYPES[ext] || 'application/octet-stream', { 'Cache-Control': cache, 'Content-Security-Policy': csp, 'X-Robots-Tag': csp === SITE_CSP ? 'all' : 'noindex, nofollow' });
}
const notFound = () => '<!doctype html><meta charset="utf-8"><title>404</title><link rel="stylesheet" href="/style.css"><main class="legal"><h1>404</h1><p>Diese Seite gibt es nicht. <a href="/">Zur Startseite</a></p></main>';
const errText = e => {
  const m = String(e && (e.responseText || e.message) || e);
  if (/auth|login|credentials|password/i.test(m)) return 'Anmeldung beim Mailserver fehlgeschlagen';
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|timeout/i.test(m)) return 'Mailserver nicht erreichbar';
  return m.slice(0, 200);
};

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), p = u.pathname;
  try {
    if (p === '/healthz') return send(res, 200, 'ok', 'text/plain');
    // dev-dsue.de is the main address (www.dev-dsue.de is forwarded there by the DNS provider)
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (p === '/admin') { res.writeHead(301, { Location: '/admin/' }); return res.end(); }
      if (p === '/admin/' || /^\/admin\/(app\.js|style\.css)$/.test(p)) return serveFile(res, path.join(ADMIN, p === '/admin/' ? 'index.html' : p.slice(7)), 'no-cache', CSP);
      if (p === '/') return serveFile(res, path.join(ROOT, 'index.html'), 'no-cache', SITE_CSP);
      if (p === '/aera' || p === '/aera/') return serveFile(res, path.join(ROOT, 'aera.html'), 'no-cache', SITE_CSP);
      const name = decodeURIComponent(p.slice(1));
      if (SITE.has(name)) return serveFile(res, path.join(ROOT, name), /\.html$/.test(name) ? 'no-cache' : 'public, max-age=3600', SITE_CSP);
      if (/^img\/[a-z0-9._-]+\.(png|webp|jpg|svg|ico)$/i.test(name)) return serveFile(res, path.join(ROOT, name), 'public, max-age=86400', SITE_CSP);
    }
    if (!p.startsWith('/api/')) return send(res, 404, notFound(), TYPES.html);
    // every change needs this header: a plain form or link from another site cannot set it
    if (req.method === 'POST' && req.headers['x-dsue'] !== '1') return send(res, 403, { error: 'Forbidden' });

    if (p === '/api/login' && req.method === 'POST') {
      const ip = ipOf(req);
      if (blocked(ip)) return send(res, 429, { error: 'Zu viele Versuche – bitte in 15 Minuten nochmal.' });
      const b = await readJson(req);
      const user = String(b.user || '').trim().toLowerCase(), pass = String(b.pass || '');
      if (!user || !pass) return send(res, 400, { error: 'E-Mail und Passwort eingeben' });
      if (!MOCK && !ALLOWED.includes(user)) { failed(ip); await new Promise(r => setTimeout(r, 800)); return send(res, 401, { error: 'Anmeldung fehlgeschlagen' }); }
      const s = { user, pass: seal(pass), last: Date.now(), client: null };
      if (MOCK) { if (pass !== 'demo') { failed(ip); return send(res, 401, { error: 'Anmeldung fehlgeschlagen (Demo-Passwort: demo)' }); } }
      else { try { await imapFor(s); } catch (e) { failed(ip); await new Promise(r => setTimeout(r, 800)); return send(res, 401, { error: 'Anmeldung fehlgeschlagen' }); } }
      const t = crypto.randomBytes(32).toString('hex');
      sessions.set(t, s);
      return send(res, 200, { ok: true, user }, 'application/json', { 'Set-Cookie': `dm_s=${t}; HttpOnly; SameSite=Strict; Path=/${secure(req)}` });
    }

    const t = cookie(req, 'dm_s'), s = t && sessions.get(t);
    if (p === '/api/me') return send(res, 200, s ? { user: s.user } : { user: null });
    if (!s) return send(res, 401, { error: 'Nicht angemeldet' });
    s.last = Date.now();

    if (p === '/api/logout' && req.method === 'POST') { endSession(t); return send(res, 200, { ok: true }, 'application/json', { 'Set-Cookie': 'dm_s=; Max-Age=0; Path=/' }); }
    if (p === '/api/folders') return send(res, 200, await api.folders(s));
    const folder = u.searchParams.get('folder') || 'INBOX', uid = +u.searchParams.get('uid') || 0;
    if (p === '/api/list') return send(res, 200, await api.list(s, folder, Math.max(1, +u.searchParams.get('page') || 1), (u.searchParams.get('q') || '').slice(0, 100)));
    if (p === '/api/message') return send(res, 200, await api.message(s, folder, uid));
    if (p === '/api/attachment') {
      const a = await api.attachment(s, folder, uid, +u.searchParams.get('i') || 0);
      return send(res, 200, a.data, 'application/octet-stream', { 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(a.name)}` });
    }
    if (req.method === 'POST') {
      const b = await readJson(req);
      const f = String(b.folder || 'INBOX'), id = +b.uid || 0;
      if (p === '/api/flag') { const fl = { seen: '\\Seen', flagged: '\\Flagged' }[b.flag]; if (!fl) return send(res, 400, { error: 'bad flag' }); await api.flag(s, f, id, fl, !!b.on); return send(res, 200, { ok: true }); }
      if (p === '/api/move') { await api.move(s, f, id, String(b.to || '')); return send(res, 200, { ok: true }); }
      if (p === '/api/delete') { await api.remove(s, f, id); return send(res, 200, { ok: true }); }
      if (p === '/api/send') {
        const to = String(b.to || '').trim(); if (!to) return send(res, 400, { error: 'Empfänger fehlt' });
        await api.send(s, { to, cc: String(b.cc || '').trim(), subject: String(b.subject || '').slice(0, 500), text: String(b.text || ''), fromName: String(b.fromName || '').slice(0, 80), inReplyTo: String(b.inReplyTo || ''), references: String(b.references || ''), replyFolder: b.replyFolder, replyUid: +b.replyUid || 0 });
        return send(res, 200, { ok: true });
      }
    }
    send(res, 404, { error: 'Not found' });
  } catch (e) {
    send(res, 500, { error: errText(e) });
  }
}).listen(PORT, () => console.log(`dsue Mail on :${PORT}${MOCK ? ' (MOCK)' : ''} – IMAP ${IMAP_HOST}:${IMAP_PORT}, SMTP ${SMTP_HOST}:${SMTP_PORT}`));
