// AERA page – language, nav, radio log, gallery, reveal · by Desue
(function () {
  // language: shared with the main page (localStorage "lang")
  var L = (navigator.language || 'de').slice(0, 2) === 'de' ? 'de' : 'en';
  try { var s = localStorage.getItem('lang'); if (s === 'de' || s === 'en') L = s; } catch (e) {}

  function applyLang() {
    document.documentElement.lang = L;
    document.querySelectorAll('[data-de]').forEach(function (el) { el.innerHTML = el.dataset[L] || el.dataset.de; });
    document.querySelectorAll('[data-lang]').forEach(function (b) { b.classList.toggle('on', b.dataset.lang === L); });
    var lb = document.querySelector('.lb-close'); if (lb) lb.setAttribute('aria-label', L === 'de' ? 'Schließen' : 'Close');
    restartRadio();
    betaLinks();
    drawChangelog();
    drawWhatsNew();
  }

  // "Request beta": opens the visitor's mail app with a prepared mail to Desue
  var BETA = {
    de: { subject: 'AERA Beta-Anfrage', body: 'Hallo Desue,\n\nich würde gern an der AERA-Beta teilnehmen.\n\nName / Nickname: \nSystem (z. B. Windows 11): \nErfahrung mit ATC (keine / VATSIM / IVAO / andere Spiele): \nSprache im Spiel (Deutsch / Englisch): \n\nViele Grüße' },
    en: { subject: 'AERA beta request', body: 'Hi Desue,\n\nI would like to join the AERA beta.\n\nName / nickname: \nSystem (e.g. Windows 11): \nATC experience (none / VATSIM / IVAO / other games): \nIn-game language (German / English): \n\nBest regards' },
  };
  function betaLinks() {
    var m = BETA[L], href = 'mailto:kontakt@dev-dsue.de?subject=' + encodeURIComponent(m.subject) + '&body=' + encodeURIComponent(m.body);
    document.querySelectorAll('a.beta').forEach(function (a) { a.href = href; });
  }
  document.querySelector('.lang').addEventListener('click', function (e) {
    var b = e.target.closest('[data-lang]'); if (!b) return;
    L = b.dataset.lang; try { localStorage.setItem('lang', L); } catch (e) {}
    applyLang();
  });

  // nav gets a background once you scroll
  var nav = document.getElementById('nav');
  var fixedNav = document.body.classList.contains('cl-page');
  function onScroll() { nav.classList.toggle('solid', fixedNav || scrollY > 30); }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // marquee: duplicate the strip so it loops seamlessly
  var track = document.querySelector('.strip-track');
  if (track) { var sep = '<span class="sl">//</span>'; track.innerHTML = track.innerHTML + sep + track.innerHTML + sep; }

  // radio log: plays a short shift in a loop
  var RADIO = {
    de: [
      ['info', '', 'Schicht gestartet · Landebahn 31R · Live-METAR · ATIS M'],
      ['p', 'RYR5RG', 'Hello Langen Radar, Ryanair 5RG, descending FL100, KOPAG transition, information M'],
      ['me', '', '🎙 Ryanair 5RG, identified, descend 5000 feet'],
      ['p', 'EWG8JB', 'Langen Radar, moin, Eurowings 8JB, descending FL100, DEPOK transition, information M'],
      ['p', 'UPS544', 'Hello Langen Radar, UPS 544, descending FL100, DEPOK transition, information M'],
      ['me', '', '🎙 Eurowings 8JB, turn left heading 250'],
      ['p', 'EWG8JB', 'left heading 250, EWG8JB'],
      ['p', 'EWG1YF', 'end of transition, entering the hold at DK654, request vectors'],
      ['warn', '', '⚠ Staffelung: RYR5RG / EWG8JB — 3.0 NM, 0 ft (min 3 NM) −20'],
      ['me', '', '🎙 Ryanair 5RG, cleared ILS 31R'],
      ['p', 'RYR5RG', 'cleared ILS 31R, RYR5RG'],
      ['ok', '', '✓ RYR5RG an Tower übergeben (+5)'],
    ],
    en: [
      ['info', '', 'Shift started · runway 31R · live METAR · ATIS M'],
      ['p', 'RYR5RG', 'Hello Langen Radar, Ryanair 5RG, descending FL100, KOPAG transition, information M'],
      ['me', '', '🎙 Ryanair 5RG, identified, descend 5000 feet'],
      ['p', 'EWG8JB', 'Langen Radar, moin, Eurowings 8JB, descending FL100, DEPOK transition, information M'],
      ['p', 'UPS544', 'Hello Langen Radar, UPS 544, descending FL100, DEPOK transition, information M'],
      ['me', '', '🎙 Eurowings 8JB, turn left heading 250'],
      ['p', 'EWG8JB', 'left heading 250, EWG8JB'],
      ['p', 'EWG1YF', 'end of transition, entering the hold at DK654, request vectors'],
      ['warn', '', '⚠ Separation: RYR5RG / EWG8JB — 3.0 NM, 0 ft (min 3 NM) −20'],
      ['me', '', '🎙 Ryanair 5RG, cleared ILS 31R'],
      ['p', 'RYR5RG', 'cleared ILS 31R, RYR5RG'],
      ['ok', '', '✓ RYR5RG handed to tower (+5)'],
    ],
  };
  var log = document.getElementById('radio-log'), timer = null, idx = 0, clock = 10 * 3600 + 5 * 60 + 13;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hhmmss(t) { return [t / 3600 | 0, (t / 60 | 0) % 60, t % 60].map(function (n) { return ('0' + n).slice(-2); }).join(':'); }
  function addLine() {
    var lines = RADIO[L], m = lines[idx % lines.length];
    var li = document.createElement('li');
    var cls = m[0] === 'me' ? 'me' : m[0] === 'warn' ? 'warn' : (m[0] === 'info' || m[0] === 'ok') ? 'info' : '';
    li.innerHTML = '<time>' + hhmmss(clock) + '</time><span class="' + cls + '">' + (m[1] ? '<b>' + esc(m[1]) + '</b>: ' : '') + esc(m[2]) + '</span>';
    log.appendChild(li);
    while (log.children.length > 9) log.removeChild(log.firstChild);
    idx++; clock += 20 + (idx * 7) % 40;
  }
  function restartRadio() {
    if (!log) return;
    clearInterval(timer); log.innerHTML = ''; idx = 0; clock = 10 * 3600 + 5 * 60 + 13;
    for (var i = 0; i < 6; i++) addLine();
    if (!still) timer = setInterval(addLine, 2600);
  }

  // command line: types itself
  var typed = document.getElementById('typed');
  if (typed && !still) {
    var cmds = ['EWG2LL L250 A40 I31R', 'DLH626 F350 DCT KOSEK', 'UPS544 S180 A30', 'CFG648 HOLD', 'RYR5RG I31R TWR'], ci = 0, ch = 0, del = false;
    (function tick() {
      var c = cmds[ci];
      if (!del) { ch++; if (ch > c.length) { del = true; return setTimeout(tick, 1700); } }
      else { ch--; if (ch === 0) { del = false; ci = (ci + 1) % cmds.length; } }
      typed.textContent = c.slice(0, ch);
      setTimeout(tick, del ? 28 : 70 + Math.random() * 60);
    })();
  }

  // lightbox for screenshots and sector cards
  var dlg = document.getElementById('lightbox'), dimg = dlg ? dlg.querySelector('img') : null;
  function openShot(src, alt) {
    if (!dlg) return;
    dimg.src = src; dimg.alt = alt || '';
    if (dlg.showModal) dlg.showModal(); else window.open(src, '_blank');
  }
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-full]');
    if (g) return openShot(g.dataset.full, g.querySelector('img').alt);
    var s = e.target.closest('.sector[data-shot]');
    if (s) return openShot('img/aera-' + s.dataset.shot + '.webp', s.querySelector('h3').textContent);
    if (dlg && (e.target === dlg || e.target.closest('.lb-close'))) dlg.close();
  });


  // ---------------- changelog ----------------
  var CL = window.AERA_CHANGELOG || (typeof AERA_CHANGELOG !== 'undefined' ? AERA_CHANGELOG : null);
  var KIND = {
    new: { de: 'Neu', en: 'New', cls: 'new' }, imp: { de: 'Verbessert', en: 'Improved', cls: 'imp' },
    fix: { de: 'Behoben', en: 'Fixed', cls: 'fix' }, impfix: { de: 'Verbessert & behoben', en: 'Improved & fixed', cls: 'imp' },
    first: { de: 'Erste Version', en: 'First version', cls: 'first' }
  };
  var clKind = 'all', clQ = '';
  function fmtDate(d) {
    if (!d) return '';
    var p = d.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(L === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function vid(v) { return 'v' + v.replace(/\./g, '-'); }
  function kindMatch(k) { return clKind === 'all' || k === clKind || (k === 'impfix' && (clKind === 'imp' || clKind === 'fix')) || (k === 'first' && clKind === 'new'); }
  function mark(t) {
    var e = esc(t); if (!clQ) return e;
    var q = clQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return e.replace(new RegExp('(' + esc(q) + ')', 'gi'), '<mark>$1</mark>');
  }
  function drawChangelog() {
    var list = document.getElementById('cl-list'); if (!list || !CL) return;
    var stats = document.getElementById('cl-stats');
    var total = CL.reduce(function (n, v) { return n + v.sections.reduce(function (m, s) { return m + s.items.length; }, 0); }, 0);
    stats.innerHTML = '<span class="status"><i></i>' + (L === 'de' ? 'Aktuell' : 'Latest') + ': v' + esc(CL[0].version) + '</span>' +
      '<span class="cl-stat"><b>' + CL.length + '</b> ' + (L === 'de' ? 'Versionen' : 'versions') + '</span>' +
      '<span class="cl-stat"><b>' + total + '</b> ' + (L === 'de' ? 'Änderungen' : 'changes') + '</span>';
    var tabs = [['all', L === 'de' ? 'Alle' : 'All'], ['new', KIND.new[L]], ['imp', KIND.imp[L]], ['fix', KIND.fix[L]]];
    document.getElementById('cl-filter').innerHTML = tabs.map(function (t) { return '<button data-k="' + t[0] + '" class="' + (t[0] === clKind ? 'on' : '') + '">' + t[1] + '</button>'; }).join('');
    var qi = document.getElementById('cl-q'); qi.placeholder = L === 'de' ? 'Changelog durchsuchen …' : 'Search the changelog …';
    var q = clQ.toLowerCase(), html = '', toc = '', shown = 0;
    CL.forEach(function (v, vi) {
      var secs = '';
      v.sections.forEach(function (s) {
        if (!kindMatch(s.kind)) return;
        var items = s.items.filter(function (it) {
          if (!q) return true;
          var txt = (it[L] || it.de) + ' ' + (it.sub || []).map(function (x) { return x[L === 'de' ? 0 : 1]; }).join(' ');
          return txt.toLowerCase().indexOf(q) >= 0;
        });
        if (!items.length) return;
        var k = KIND[s.kind] || KIND.new;
        secs += '<div class="cl-sec"><span class="tg ' + k.cls + '">' + k[L] + '</span><ul>' + items.map(function (it) {
          var sub = it.sub ? '<ul class="cl-sub">' + it.sub.map(function (x) { return '<li>' + mark(x[L === 'de' ? 0 : 1]) + '</li>'; }).join('') + '</ul>' : '';
          return '<li>' + mark(it[L] || it.de) + sub + '</li>';
        }).join('') + '</ul></div>';
      });
      if (!secs) return;
      shown++;
      var latest = vi === 0;
      html += '<article class="cl-ver' + (latest ? ' latest' : '') + '" id="' + vid(v.version) + '">' +
        '<header><span class="cl-v">v' + esc(v.version) + '</span><div class="cl-h"><h2>' + esc(v.title ? v.title[L] : '') + '</h2>' +
        (v.date ? '<time>' + fmtDate(v.date) + '</time>' : '') + '</div>' + (latest ? '<span class="cl-latest">' + (L === 'de' ? 'Aktuell' : 'Latest') + '</span>' : '') + '</header>' + secs + '</article>';
      toc += '<a href="#' + vid(v.version) + '"><b>v' + esc(v.version) + '</b><span>' + esc(v.title ? v.title[L] : '') + '</span></a>';
    });
    list.innerHTML = html || '<p class="cl-empty">' + (L === 'de' ? 'Nichts gefunden.' : 'Nothing found.') + '</p>';
    document.getElementById('cl-toc').innerHTML = '<p>' + (L === 'de' ? 'Versionen' : 'Versions') + '</p>' + toc;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('#cl-filter [data-k]'); if (b) { clKind = b.dataset.k; drawChangelog(); }
  });
  var qEl = document.getElementById('cl-q');
  if (qEl) qEl.addEventListener('input', function () { clQ = qEl.value.trim(); drawChangelog(); });

  // "What's new" box on the AERA page
  function drawWhatsNew() {
    var box = document.getElementById('whatsnew-box'); if (!box || !CL) return;
    var v = CL[0], items = [];
    var all = [];
    v.sections.forEach(function (s) { s.items.forEach(function (it) { all.push([s.kind, it]); }); });
    // items that are complete sentences first, headings (ending with ':') after
    items = all.filter(function (x) { return !/:$/.test(x[1].de); }).concat(all.filter(function (x) { return /:$/.test(x[1].de); })).slice(0, 4);
    var h = document.getElementById('whatsnew-title');
    if (h) h.textContent = (L === 'de' ? 'Neu in v' : 'New in v') + v.version;
    box.innerHTML = '<div class="wn-head"><span class="cl-v">v' + esc(v.version) + '</span><div><b>' + esc(v.title ? v.title[L] : '') + '</b>' +
      (v.date ? '<time>' + fmtDate(v.date) + '</time>' : '') + '</div></div><ul>' + items.map(function (x) {
        var k = KIND[x[0]] || KIND.new;
        return '<li><span class="tg ' + k.cls + '">' + k[L] + '</span><span>' + esc((x[1][L] || x[1].de).replace(/:$/, '')) + '</span></li>';
      }).join('') + '</ul><a class="btn ghost" href="/aera/changelog">' + (L === 'de' ? 'Kompletter Changelog' : 'Full changelog') + ' <span>→</span></a>';
  }

  // reveal on scroll
  var els = document.querySelectorAll('.sec h2, .sec > .sub, .sector, .b, .road > li, .ea, .radio, details, .g, .wn');
  if ('IntersectionObserver' in window && !still) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('on'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el, i) { el.classList.add('rv'); el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });
  }

  applyLang();
})();
