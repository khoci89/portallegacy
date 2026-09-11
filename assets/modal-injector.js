// modal-injector.js — Loads shared modals HTML into #modal-root.
// Extracted from index.html & admin.html inline scripts to avoid duplication.
(function () {
  var url = '/assets/modals-shared.html';
  var inject = function () {
    try {
      var root = document.getElementById('modal-root');
      if (root && root.childElementCount > 0) return true;
      var x = new XMLHttpRequest();
      x.open('GET', url, false);
      x.send();
      if (x.status === 200 && x.responseText) {
        var r = document.getElementById('modal-root');
        if (!r) {
          r = document.createElement('div');
          r.id = 'modal-root';
          document.body.appendChild(r);
        }
        r.innerHTML = x.responseText;
        return true;
      }
    } catch (e) {}
    return false;
  };
  if (!inject()) {
    setTimeout(function () {
      if (!inject()) console.warn('[modal-root] Gagal memuat ' + url);
    }, 800);
  }
  document.addEventListener('pointerdown', function () {
    var root = document.getElementById('modal-root');
    if (!root || root.childElementCount === 0) inject();
  });
})();
