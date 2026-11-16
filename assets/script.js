(function () {
  'use strict';

  /* Мобильное меню */
  var toggle = document.querySelector('.top__toggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Закрыть' : 'Меню';
    };
    toggle.addEventListener('click', function () {
      setOpen(!nav.classList.contains('is-open'));
    });
    nav.addEventListener('click', function (event) {
      if (event.target.tagName === 'A') setOpen(false);
    });
  }
})();

/* Конверт: открывается при прокрутке, записка выезжает наружу */
(function () {
  'use strict';
  var section = document.querySelector('.letter');
  if (!section) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var env = section.querySelector('.env');
  section.classList.add('is-anim');

  function clamp(v) { return Math.min(1, Math.max(0, v)); }
  var ticking = false;
  function update() {
    ticking = false;
    var sticky = section.querySelector('.letter__sticky');
    var top = parseFloat(getComputedStyle(sticky).top) || 0;
    var rect = section.getBoundingClientRect();
    var range = section.offsetHeight - sticky.offsetHeight;
    var p = range > 0 ? clamp((top - rect.top) / range) : 1;
    var flap = clamp(p / 0.35);
    var rise = clamp((p - 0.3) / 0.5);
    env.style.setProperty('--flap', flap.toFixed(3));
    env.style.setProperty('--rise', rise.toFixed(3));
    env.classList.toggle('is-flap-open', flap > 0.5);
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

/* Запросы на компьютере: лента едет влево при обычной прокрутке вниз.
   Колесо не перехватываем. На телефоне и планшете остаётся свайп. */
(function () {
  'use strict';
  var section = document.querySelector('.requests');
  if (!section) return;
  var scroller = section.querySelector('.requests__scroller');
  var pin = section.querySelector('.requests__pin');
  var list = section.querySelector('.reqs');
  var wide = window.matchMedia('(min-width: 1100px) and (pointer: fine)');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var active = false;
  var distance = 0;
  var ticking = false;

  function paint() {
    ticking = false;
    if (!active) return;
    var top = parseFloat(getComputedStyle(pin).top) || 0;
    var x = Math.min(distance, Math.max(0, top - scroller.getBoundingClientRect().top));
    list.style.transform = 'translate3d(' + (-x) + 'px, 0, 0)';
  }
  function sync() {
    var should = wide.matches && !calm.matches;
    if (should !== active) {
      active = should;
      section.classList.toggle('is-track', active);
      if (!active) {
        scroller.style.height = '';
        list.style.transform = '';
      }
    }
    if (!active) return;
    scroller.style.height = '';
    distance = Math.max(0, list.offsetWidth - pin.clientWidth);
    scroller.style.height = (pin.offsetHeight + distance) + 'px';
    paint();
  }
  function onScroll() {
    if (active && !ticking) { ticking = true; requestAnimationFrame(paint); }
  }

  /* Клавиатура: стрелки влево и вправо двигают ленту через прокрутку страницы */
  list.addEventListener('keydown', function (event) {
    if (!active || (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')) return;
    event.preventDefault();
    var step = list.firstElementChild.offsetWidth + 20;
    window.scrollBy(0, event.key === 'ArrowRight' ? step : -step);
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', sync);
  window.addEventListener('load', sync);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
  if (wide.addEventListener) { wide.addEventListener('change', sync); calm.addEventListener('change', sync); }
  sync();
})();

/* Записка в конверте: при каждом открытии новая цитата.
   Повторов нет, пока посетитель не увидит все. */
(function () {
  'use strict';
  var note = document.querySelector('.env__text');
  if (!note) return;
  var quotes = [
    'Можно бояться и\u00a0всё равно идти.',
    'С\u00a0собой можно договариваться, а\u00a0не\u00a0воевать.',
    'Чувствовать\u00a0— это не\u00a0слабость.',
    'Маленький шаг\u00a0— тоже шаг.',
    'Плакать и\u00a0смеяться можно в\u00a0один день. Иногда даже в\u00a0одну минуту.',
    'Отдых не\u00a0нужно заслуживать.',
    'Иногда «что-то не\u00a0так»\u00a0— самое честное начало.'
  ];
  var KEY = 'note-quotes-seen';
  var seen = [];
  try {
    seen = JSON.parse(localStorage.getItem(KEY)) || [];
    if (!Array.isArray(seen)) seen = [];
  } catch (e) { seen = []; }

  var last = seen[seen.length - 1];
  var left = quotes.map(function (q, i) { return i; }).filter(function (i) { return seen.indexOf(i) === -1; });
  if (!left.length) {
    /* Круг закончен: начинаем заново, но не с той же цитаты */
    seen = [];
    left = quotes.map(function (q, i) { return i; }).filter(function (i) { return i !== last; });
  }
  /* Первый визит: всегда основная записка */
  var pick = seen.length ? left[Math.floor(Math.random() * left.length)] : left[0];
  note.textContent = quotes[pick];
  seen.push(pick);
  try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) { /* без памяти просто случайная */ }
})();

/* Анимации: сборка первого экрана, реакция цитаты на прокрутку, дыхание в блоке записи */
(function () {
  'use strict';
  var root = document.documentElement, raf = window.requestAnimationFrame.bind(window);
  var hero = document.querySelector('.hero'), stage = document.querySelector('.hero__stage');
  var booking = document.querySelector('.booking'), glow = document.querySelector('.glow');
  var contacts = document.getElementById('contacts');

  /* Границы маски: свет не заходит под контакты */
  function fit() {
    var b = booking.getBoundingClientRect(), c = contacts.getBoundingClientRect();
    glow.style.setProperty('--contacts-top', Math.round(c.top - b.top) + 'px');
    glow.style.setProperty('--contacts-free', Math.round(b.bottom - c.bottom) + 'px');
  }
  fit();
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* 1. Старт сборки: шрифты и первое фото готовы. Запасной старт через 1,2 с — в <head> */
  var go = function () { root.classList.add('hero-go'); };
  var faces = ['400 1em Literata', 'italic 400 1em Literata', '500 1em Literata', '700 1em "Sofia Sans Extra Condensed"'];
  Promise.all(faces.map(function (f) { return document.fonts.load(f, 'я'); }).concat(hero.querySelector('.p-face').decode())).then(go, function () {});

  /* 2. Прогресс --p: от 0 до ухода низа экрана на 60% высоты. Только после сборки */
  var ready = false, p = 0, target = 0, queued = 0;
  function frame() {
    queued = 0;
    p += (target - p) * 0.22;
    if (Math.abs(target - p) < 0.001) p = target;
    hero.style.setProperty('--p', p.toFixed(4));
    hero.classList.toggle('is-p', p > 0);
    hero.classList.toggle('is-live', p > 0 && p < 1);
    if (p !== target) queued = raf(frame);
  }
  function onScroll() {
    if (!ready) return;
    target = Math.min(1, Math.max(0, window.scrollY / (stage.offsetHeight * 0.6)));
    if (p !== target && !queued) queued = raf(frame);
  }
  hero.querySelector('.hero__btn').addEventListener('animationend', function () {
    root.classList.add('hero-done');
    ready = true;
    onScroll();
  }, { once: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* 3. Дыхание идёт, только пока блок на экране */
  new IntersectionObserver(function (e) {
    booking.classList.toggle('is-on', e[0].isIntersecting);
  }).observe(booking);

  /* Свет тянется за курсором, ±40 px. Только мышь на компьютере */
  if (!window.matchMedia('(min-width: 1100px) and (pointer: fine)').matches) return;
  var a = glow.querySelector('.glow__a'), tx = 0, ty = 0, x = 0, y = 0, run = 0;
  function tick() {
    x += (tx - x) * 0.06; y += (ty - y) * 0.06;
    a.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
    run = Math.abs(tx - x) + Math.abs(ty - y) > 0.2 ? raf(tick) : 0;
  }
  booking.addEventListener('pointermove', function (e) {
    var r = booking.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 80;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 80;
    if (!run) run = raf(tick);
  });
  booking.addEventListener('pointerleave', function () { tx = ty = 0; if (!run) run = raf(tick); });
})();

/* Документы об образовании: окно открывается кнопкой, закрывается крестиком, Esc или щелчком мимо */
(function () {
  'use strict';
  var dlg = document.getElementById('docs');
  var btn = document.querySelector('.docs-open');
  if (!dlg || !btn || typeof dlg.showModal !== 'function') return;
  btn.addEventListener('click', function () { dlg.showModal(); dlg.scrollTop = 0; });
  dlg.querySelector('.docs__close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () { btn.focus(); });
})();

/* Линия под фразой рисуется, только пока блок «Кому помогаю» на экране */
(function () {
  'use strict';
  var who = document.querySelector('.who');
  if (!who || !('IntersectionObserver' in window)) { if (who) who.classList.add('is-on'); return; }
  new IntersectionObserver(function (e) {
    who.classList.toggle('is-on', e[0].isIntersecting);
  }, { threshold: 0.35 }).observe(who);
})();

/* Маршрут: самолётик ведёт пунктир за собой, шаги появляются, когда он до них долетает */
(function () {
  'use strict';
  var route = document.querySelector('.route');
  if (!route || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var svg = route.querySelector('.route__curve'), dash = route.querySelector('.route__dash');
  var plane = route.querySelector('.route__plane'), steps = route.querySelectorAll('.steps li');
  var wide = window.matchMedia('(min-width: 1100px)');
  var p = 0, t = 0, done = 0, queued = 0;
  route.classList.add('is-anim');
  route.style.setProperty('--rp', 0);

  function target() {
    var r = route.getBoundingClientRect(), vh = window.innerHeight;
    t = wide.matches ? (vh * 0.8 - r.top) / (r.height + vh * 0.3) : (vh * 0.72 - r.top) / (r.height - 40);
    t = Math.max(done, Math.min(1, Math.max(0, t)));
    done = t; /* только вперёд: пролетел — остаётся */
  }
  function paint() {
    queued = 0;
    p += (t - p) * 0.12;
    if (Math.abs(t - p) < 0.001) p = t;
    route.style.setProperty('--rp', p.toFixed(4));
    plane.style.opacity = p > 0.01 ? 1 : 0;
    if (wide.matches) {
      var L = dash.getTotalLength(), s = Math.min(L * p, L - 2);
      var a = dash.getPointAtLength(s), b = dash.getPointAtLength(s + 2);
      var m = svg.getScreenCTM(), rr = route.getBoundingClientRect();
      var ax = a.x * m.a + m.e - rr.left, ay = a.y * m.d + m.f - rr.top;
      var ang = Math.atan2((b.y - a.y) * m.d, (b.x - a.x) * m.a) * 180 / Math.PI + 23;
      plane.style.transform = 'translate(' + ax.toFixed(1) + 'px,' + ay.toFixed(1) + 'px) translate(-50%,-50%) rotate(' + ang.toFixed(1) + 'deg)';
      steps.forEach(function (li) { li.classList.toggle('is-shown', ax >= li.offsetLeft + 8); });
    } else {
      var H = route.offsetHeight, end = 40 + p * (H - 80);
      plane.style.transform = 'translateY(' + (end - (H - 40)).toFixed(1) + 'px) rotate(113deg)';
      steps.forEach(function (li) { li.classList.toggle('is-shown', end >= li.offsetTop + 8 || p >= 1); });
    }
    if (p !== t) queued = window.requestAnimationFrame(paint);
    if (p >= 1) window.removeEventListener('scroll', update);
  }
  function update() { target(); if (!queued) queued = window.requestAnimationFrame(paint); }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', function () { if (!queued) queued = window.requestAnimationFrame(paint); });
  update();
})();
