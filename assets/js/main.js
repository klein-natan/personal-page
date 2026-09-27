// Troca de idioma e menu mobile. O idioma inicial é aplicado por um script no <head> (src/layout.html).
(function () {
  var html = document.documentElement;

  function currentLang() {
    return html.lang === 'en' ? 'en' : 'pt';
  }

  function applyLang(lang) {
    html.lang = lang === 'en' ? 'en' : 'pt-BR';
    document.title = html.getAttribute(lang === 'en' ? 'data-title-en' : 'data-title-pt');
    document.querySelectorAll('[data-lang-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-label', lang === 'en' ? 'Mudar para português' : 'Switch to English');
    });
    try { localStorage.setItem('lang', lang); } catch (e) {}
  }

  document.querySelectorAll('[data-lang-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyLang(currentLang() === 'en' ? 'pt' : 'en');
    });
  });
  applyLang(currentLang());

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    }
    toggle.addEventListener('click', function () {
      setOpen(!nav.classList.contains('is-open'));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1000) setOpen(false);
    });
  }

  document.querySelectorAll('[data-print]').forEach(function (btn) {
    btn.addEventListener('click', function () { window.print(); });
  });
})();
