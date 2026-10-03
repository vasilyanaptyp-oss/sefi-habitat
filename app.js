(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.remove('no-js');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Suivi des conversions (Google Ads / GA4) :
     les évènements sont poussés dans dataLayer et transmis à gtag si la balise est installée. */
  function track(eventName, params) {
    params = params || {};
    window.dataLayer = window.dataLayer || [];
    var payload = { event: eventName };
    for (var k in params) { if (Object.prototype.hasOwnProperty.call(params, k)) payload[k] = params[k]; }
    window.dataLayer.push(payload);
    if (typeof window.gtag === 'function') window.gtag('event', eventName, params);
  }
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href^="tel:"]');
    if (link) track('clic_appel', { emplacement: link.getAttribute('data-track') || 'page' });
  });

  /* En-tête */
  var header = document.querySelector('.site-header');
  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Menu mobile */
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('mobile-menu');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    if (toggle) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    }
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); toggle.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1080) setMenu(false); });
  }

  /* Apparition au défilement */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Comparateur avant / après */
  var ba = document.querySelector('.ba');
  if (ba) {
    var range = ba.querySelector('.ba-range');
    var imgBefore = ba.querySelector('.ba-before');
    var imgAfter = ba.querySelector('.ba-after');
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.ba-tab'));
    var setPos = function (v) { ba.style.setProperty('--pos', v + '%'); };
    range.addEventListener('input', function () { setPos(range.value); });
    setPos(range.value);

    var preload = function (src) { var i = new Image(); i.src = src; };
    var selectTab = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      if (focus) tab.focus();
      var alt = tab.getAttribute('data-alt');
      imgAfter.src = tab.getAttribute('data-after');
      imgAfter.alt = 'Finitions : ' + alt;
      imgBefore.src = tab.getAttribute('data-before');
      imgBefore.alt = 'Conception : dessin au trait de la même pièce';
      ba.setAttribute('aria-labelledby', tab.id);
      range.value = 50; setPos(50);
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { selectTab(tab, false); });
      tab.addEventListener('mouseenter', function () { preload(tab.getAttribute('data-after')); preload(tab.getAttribute('data-before')); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') next = tabs[0];
        if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); selectTab(next, true); }
      });
    });

    /* petit mouvement d'invitation la première fois que le comparateur est visible */
    if ('IntersectionObserver' in window && !reduceMotion) {
      var hinted = false;
      var hio = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting || hinted) return;
        hinted = true; hio.disconnect();
        var keys = [[0, 50], [450, 32], [1050, 66], [1550, 50]];
        var start = null;
        var step = function (ts) {
          if (start === null) start = ts;
          var t = ts - start, v = 50;
          for (var k = 1; k < keys.length; k++) {
            if (t <= keys[k][0]) {
              var a = keys[k - 1], b = keys[k];
              var p = (t - a[0]) / (b[0] - a[0]);
              p = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
              v = a[1] + (b[1] - a[1]) * p;
              break;
            }
          }
          if (document.activeElement === range) return;
          setPos(v); range.value = Math.round(v);
          if (t < keys[keys.length - 1][0]) requestAnimationFrame(step);
        };
        setTimeout(function () { requestAnimationFrame(step); }, 350);
      }, { threshold: 0.6 });
      hio.observe(ba);
    }
  }

  /* Formulaire de devis : aucune donnée n'est envoyée, affichage d'un message de confirmation */
  var form = document.getElementById('devis-form');
  if (form) {
    var card = document.getElementById('form-card');
    var thanks = document.getElementById('thanks');
    var params = new URLSearchParams(window.location.search);
    var preset = params.get('projet');
    if (preset) {
      var radio = form.querySelector('input[name="projet"][value="' + preset.replace(/[^a-z-]/g, '') + '"]');
      if (radio) radio.checked = true;
    }
    var phoneOk = function (v) {
      var digits = v.replace(/[\s.\-()]/g, '');
      return /^(?:\+33|0033|0)[1-9]\d{8}$/.test(digits) || /^\+?\d{9,15}$/.test(digits);
    };
    var emailOk = function (v) { return v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };
    var setError = function (input, bad) {
      var field = input.closest('.field') || input.closest('.consent-wrap');
      if (field) field.classList.toggle('has-error', bad);
      input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    };
    var validate = function () {
      var nom = form.elements.nom, tel = form.elements.tel, email = form.elements.email, ville = form.elements.ville, consent = form.elements.consent;
      var checks = [
        [nom, nom.value.trim().length < 2],
        [tel, !phoneOk(tel.value.trim())],
        [email, !emailOk(email.value.trim())],
        [ville, ville.value.trim().length < 2],
        [consent, !consent.checked]
      ];
      var first = null;
      checks.forEach(function (c) { setError(c[0], c[1]); if (c[1] && !first) first = c[0]; });
      return first;
    };
    form.addEventListener('input', function (e) {
      var el = e.target;
      var field = el.closest('.field') || el.closest('.consent-wrap');
      if (field && field.classList.contains('has-error')) validate();
    });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'consent' && e.target.checked) setError(e.target, false);
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = validate();
      if (firstBad) { firstBad.focus(); return; }
      var name = form.elements.nom.value.trim().split(/\s+/)[0];
      var projet = (form.querySelector('input[name="projet"]:checked') || {}).value || 'non précisé';
      track('generate_lead', { formulaire: 'devis', type_travaux: projet });
      document.getElementById('thanks-title').textContent = 'Merci ' + name + ', votre demande est bien enregistrée !';
      card.classList.add('is-sent');
      thanks.focus({ preventScroll: true });
      card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    });
    document.getElementById('form-reset').addEventListener('click', function () {
      form.reset();
      card.classList.remove('is-sent');
      form.elements.nom.focus();
    });
  }

  /* Barre d'appel mobile : masquée quand le formulaire est à l'écran */
  var bar = document.getElementById('mobile-bar');
  var devis = document.getElementById('devis') || document.querySelector('.cta-band');
  if (bar && devis && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      bar.classList.toggle('is-hidden', entries[0].isIntersecting);
    }, { threshold: 0.15 }).observe(devis);
  }
})();
