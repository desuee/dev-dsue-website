// AERA beta page – Discord sign-in state, newest build, older builds · by Desue
(function () {
  var L = (navigator.language || 'de').slice(0, 2) === 'de' ? 'de' : 'en';
  try { var s = localStorage.getItem('lang'); if (s === 'de' || s === 'en') L = s; } catch (e) {}
  var T = {
    de: { login: 'Mit Discord anmelden', logout: 'Abmelden', hi: 'Angemeldet als', latest: 'Neuester Build', dl: 'Herunterladen',
      older: 'Ältere Builds', notes: 'Was ist neu', none: 'Noch kein Beta-Build veröffentlicht.', loading: 'Lade …',
      outT: 'Melde dich an', outP: 'Du brauchst ein Discord-Konto, bist auf dem AERA-Server und hast dort die Rolle <b>Beta Tester</b>.',
      steps: ['Klick auf „Mit Discord anmelden“', 'Discord fragt einmal, ob AERA deinen Namen und deine Server-Rollen sehen darf', 'Fertig – hier steht immer die neueste Version'],
      e: { norole: 'Du bist auf dem Server, hast aber (noch) keine Beta-Tester-Rolle. Frag im Discord nach einem Platz.',
        notmember: 'Du bist nicht auf dem AERA-Discord-Server. Tritt zuerst bei und frag nach der Beta-Tester-Rolle.',
        discord: 'Discord-Anmeldung hat nicht geklappt – bitte nochmal versuchen.', state: 'Die Anmeldung ist abgelaufen – bitte nochmal versuchen.',
        setup: 'Der Beta-Login ist noch nicht eingerichtet.' }, fail: 'Builds konnten nicht geladen werden: ' },
    en: { login: 'Sign in with Discord', logout: 'Sign out', hi: 'Signed in as', latest: 'Newest build', dl: 'Download',
      older: 'Older builds', notes: "What's new", none: 'No beta build published yet.', loading: 'Loading …',
      outT: 'Sign in', outP: 'You need a Discord account, be on the AERA server and have the <b>Beta Tester</b> role there.',
      steps: ['Click “Sign in with Discord”', 'Discord asks once whether AERA may see your name and your server roles', 'Done – the newest version is always here'],
      e: { norole: "You're on the server but don't have the Beta Tester role (yet). Ask for a spot on Discord.",
        notmember: "You're not on the AERA Discord server. Join first and ask for the Beta Tester role.",
        discord: "Discord sign-in didn't work – please try again.", state: 'The sign-in expired – please try again.',
        setup: 'The beta sign-in is not set up yet.' }, fail: 'Could not load the builds: ' }
  };
  var card = document.getElementById('card'), me = null, rel = null, err = new URLSearchParams(location.search).get('e');
  var esc = function (t) { return String(t || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  // tiny markdown for the release notes: headings, lists, bold, italics, code, links, rules
  var md = function (t) {
    var inl = function (x) { return esc(x).replace(/\*\*(.+?)\*\*/g, '<b style="color:#fff">$1</b>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener" target="_blank">$1</a>'); };
    var out = [], list = null;
    String(t || '').replace(/\r/g, '').split('\n').forEach(function (l) {
      var m = l.match(/^\s*[-*•]\s+(.*)/), sub = /^\s{2,}[-*•]/.test(l);
      if (m) { if (!list) { out.push('<ul>'); list = 1; } out.push('<li' + (sub ? ' class="sub"' : '') + '>' + inl(m[1]) + '</li>'); return; }
      if (list) { out.push('</ul>'); list = null; }
      if (/^\s*(---|___|\*\*\*)\s*$/.test(l)) out.push('<hr>');
      else if (m = l.match(/^(#{1,4})\s+(.*)/)) out.push('<h' + (m[1].length + 2) + '>' + inl(m[2]) + '</h' + (m[1].length + 2) + '>');
      else if (l.trim()) out.push('<p>' + inl(l) + '</p>');
    });
    if (list) out.push('</ul>');
    return out.join('');
  };
  var mb = function (b) { return (b / 1048576).toFixed(b > 1e8 ? 0 : 1) + ' MB'; };
  var day = function (d) { try { return new Date(d).toLocaleDateString(L === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
  var dIco = '<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0-5-5m5 5 5-5M4 19h16"/></svg>';
  var discIco = '<svg viewBox="0 0 24 24" style="fill:currentColor;stroke:none"><path d="M19.6 5.3A17 17 0 0 0 15.4 4l-.5 1a15.7 15.7 0 0 0-5.8 0L8.6 4a17 17 0 0 0-4.2 1.3C1.7 9.3 1 13.2 1.3 17a17 17 0 0 0 5.2 2.6l1.1-1.8a11 11 0 0 1-1.7-.8l.4-.3a12.2 12.2 0 0 0 11.4 0l.4.3-1.7.8 1.1 1.8a17 17 0 0 0 5.2-2.6c.4-4.4-.7-8.3-3.1-11.7ZM8.5 14.7c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Zm7 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Z"/></svg>';

  function draw() {
    var t = T[L];
    document.documentElement.lang = L;
    document.querySelectorAll('[data-de]').forEach(function (el) { el.innerHTML = el.dataset[L] || el.dataset.de; });
    document.querySelectorAll('[data-lang]').forEach(function (b) { b.classList.toggle('on', b.dataset.lang === L); });
    if (!me) { card.innerHTML = '<p class="bt-meta">' + t.loading + '</p>'; return; }
    if (!me.user) {
      card.innerHTML = '<h2>' + t.outT + '</h2><p>' + t.outP + '</p><ol class="bt-steps">' + t.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' +
        '<div class="cta left" style="margin-top:24px"><a class="btn primary bt-discord" href="/beta/login">' + discIco + '<span>' + t.login + '</span></a></div>' +
        (err && t.e[err] ? '<div class="bt-err">' + t.e[err] + '</div>' : (!me.ready ? '<div class="bt-err">' + t.e.setup + '</div>' : ''));
      return;
    }
    var head = '<div class="bt-user">' + (me.user.avatar ? '<img src="' + esc(me.user.avatar) + '" alt="">' : '') + '<span>' + t.hi + ' <b style="color:#fff">' + esc(me.user.name) + '</b></span><a href="/beta/logout">' + t.logout + '</a></div>';
    if (!rel) { card.innerHTML = head + '<p class="bt-meta">' + t.loading + '</p>'; return; }
    if (rel.error) { card.innerHTML = head + '<div class="bt-err">' + t.fail + esc(rel.error) + '</div>'; return; }
    if (!rel.releases.length) { card.innerHTML = head + '<p>' + t.none + '</p>'; return; }
    var r = rel.releases[0];
    var files = r.assets.map(function (a) { return '<a class="btn primary" href="/beta/download/' + a.id + '"><span style="display:inline-flex;gap:10px;align-items:center">' + dIco + esc(a.name) + '</span><small>' + mb(a.size) + '</small></a>'; }).join('');
    var old = rel.releases.slice(1).map(function (o) {
      return '<li><b style="color:#fff;font-family:var(--mono)">' + esc(o.tag) + '</b><span>' + day(o.date) + '</span>' + o.assets.map(function (a) { return '<a href="/beta/download/' + a.id + '">' + esc(a.name) + '</a>'; }).join(' ') + '</li>';
    }).join('');
    card.innerHTML = head + '<p class="bt-meta">' + t.latest + '</p><div class="bt-ver"><b>' + esc(r.tag) + '</b>' + (r.name && r.name !== r.tag ? '<span style="font-size:18px;color:#fff">' + esc(r.name) + '</span>' : '') +
      '<span class="bt-pill">BETA</span><span class="bt-meta">' + day(r.date) + '</span></div>' +
      '<div class="bt-files">' + (files || '<p>' + t.none + '</p>') + '</div>' +
      (r.notes ? '<div class="bt-notes">' + md(r.notes) + '</div>' : '') +
      (old ? '<details class="bt-older"><summary>' + t.older + '</summary><ul>' + old + '</ul></details>' : '');
  }

  document.querySelector('.lang').addEventListener('click', function (e) {
    var b = e.target.closest('[data-lang]'); if (!b) return;
    L = b.dataset.lang; try { localStorage.setItem('lang', L); } catch (x) {} draw();
  });
  if (err) history.replaceState(null, '', '/beta');
  draw();
  fetch('/api/beta/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
    me = j; draw();
    if (j.user) return fetch('/api/beta/releases', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (k) { rel = k.releases ? k : { error: k.error || 'error' }; draw(); });
  }).catch(function (e) { me = { user: null, ready: true }; draw(); });
})();
