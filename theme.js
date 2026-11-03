// dark / light mode: follows the system until the visitor picks one
(function () {
  var b = document.getElementById('theme'); if (!b) return;
  b.addEventListener('click', function () {
    var dark = document.documentElement.dataset.theme !== 'dark';
    if (dark) document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
  });
})();
