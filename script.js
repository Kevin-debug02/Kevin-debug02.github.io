(function () {
  'use strict';

  /* Mobile menu */
  var btn = document.querySelector('.menu-btn');
  var links = document.getElementById('links');
  btn.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      links.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  /* Highlight the current section in the nav */
  var navLinks = links.querySelectorAll('a');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id);
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { io.observe(s); });
  }

  /* Profile pictures: show initials or a note if the file is missing */
  [['.brand', '.brand img'], ['.avatar', '.avatar img']].forEach(function (pair) {
    var box = document.querySelector(pair[0]), im = document.querySelector(pair[1]);
    function miss() { box.classList.add('missing'); }
    im.addEventListener('error', miss);
    if (im.complete && im.naturalWidth === 0) { miss(); }
  });

  /* Click the portrait for a little burst */
  var av = document.getElementById('avatar');
  av.addEventListener('click', function (e) {
    av.classList.remove('boing'); void av.offsetWidth; av.classList.add('boing');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    var colors = ['#9be15d', '#e0a04a', '#187a4e', '#ffffff'];
    for (var i = 0; i < 14; i++) {
      var s = document.createElement('span'), a = (i / 14) * Math.PI * 2, d = 50 + Math.random() * 60;
      s.className = 'spark';
      s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px';
      s.style.background = colors[i % 4];
      s.style.setProperty('--x', Math.cos(a) * d + 'px'); s.style.setProperty('--y', Math.sin(a) * d + 'px');
      document.body.appendChild(s);
      setTimeout(function (n) { n.remove(); }, 900, s);
    }
  });

  /* Footer year */
  document.getElementById('year').textContent = new Date().getFullYear();

  /* Photos: show a labelled placeholder until the image file exists */
  document.querySelectorAll('.shot').forEach(function (shot) {
    var img = shot.querySelector('img');
    shot.dataset.file = shot.dataset.full.split('/').pop();
    function miss() { shot.classList.add('missing'); }
    img.addEventListener('error', miss);
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) { miss(); }
  });

  /* "See all" buttons for long galleries */
  document.querySelectorAll('.gallery[data-limit]').forEach(function (g, gi) {
    var shots = g.querySelectorAll('.shot'), limit = +g.dataset.limit;
    if (shots.length <= limit) { return; }
    shots.forEach(function (s, i) { if (i >= limit) { s.classList.add('extra'); s.style.setProperty('--n', i - limit); } });
    if (!g.id) { g.id = 'gallery-' + gi; }
    var more = document.createElement('button');
    more.type = 'button'; more.className = 'more';
    more.setAttribute('aria-expanded', 'false'); more.setAttribute('aria-controls', g.id);
    function label(open) {
      more.innerHTML = open ? 'Show fewer photos' : '<span class="n">' + shots.length + '</span>See all photos';
    }
    label(false);
    more.addEventListener('click', function () {
      var open = g.classList.toggle('open');
      more.setAttribute('aria-expanded', open); label(open);
    });
    g.parentNode.insertBefore(more, g.nextSibling);
  });

  /* Lightbox with previous / next */
  var box = document.getElementById('lightbox');
  var boxImg = box.querySelector('img');
  var closeBtn = box.querySelector('.close');
  var prevBtn = box.querySelector('.prev'), nextBtn = box.querySelector('.next'), count = box.querySelector('.count');
  var group = [], idx = 0, lastFocus = null, touchX = null;

  function show(i) {
    idx = (i + group.length) % group.length;
    boxImg.src = group[idx].dataset.full;
    boxImg.alt = group[idx].dataset.alt || '';
    count.textContent = group.length > 1 ? (idx + 1) + ' of ' + group.length : '';
  }
  function openBox(shot) {
    if (shot.classList.contains('missing')) { return; }
    lastFocus = shot;
    group = Array.prototype.filter.call(shot.closest('.gallery').querySelectorAll('.shot'), function (s) {
      return !s.classList.contains('missing');
    });
    prevBtn.hidden = nextBtn.hidden = group.length < 2;
    show(group.indexOf(shot));
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }
  function closeBox() {
    box.hidden = true;
    boxImg.src = '';
    document.body.style.overflow = '';
    if (lastFocus) { lastFocus.focus(); }
  }
  document.querySelectorAll('.shot').forEach(function (s) {
    s.addEventListener('click', function () { openBox(s); });
  });
  closeBtn.addEventListener('click', closeBox);
  prevBtn.addEventListener('click', function () { show(idx - 1); });
  nextBtn.addEventListener('click', function () { show(idx + 1); });
  box.addEventListener('click', function (e) { if (e.target === box) { closeBox(); } });
  box.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (touchX === null || group.length < 2) { return; }
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) { show(idx + (dx < 0 ? 1 : -1)); }
    touchX = null;
  });
  document.addEventListener('keydown', function (e) {
    if (box.hidden) { return; }
    if (e.key === 'Escape') { closeBox(); }
    else if (e.key === 'ArrowLeft' && group.length > 1) { show(idx - 1); }
    else if (e.key === 'ArrowRight' && group.length > 1) { show(idx + 1); }
  });

  /* Hero: animated voltage waveform, a nod to the power-quality project */
  var canvas = document.getElementById('wave');
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var w, h, dpr, t = 0;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    var layers = [
      { amp: 0.16, freq: 2.2, speed: 1.0, color: 'rgba(155,225,93,0.55)', width: 3 },
      { amp: 0.11, freq: 3.4, speed: -0.7, color: 'rgba(224,160,74,0.5)', width: 2 },
      { amp: 0.07, freq: 5.1, speed: 0.5, color: 'rgba(155,225,93,0.25)', width: 2 }
    ];
    layers.forEach(function (l, i) {
      ctx.beginPath();
      for (var x = 0; x <= w; x += 4) {
        var sag = 1 - 0.35 * Math.exp(-Math.pow((x / w - ((t * 0.04 + i * 0.3) % 1.2)) * 8, 2));
        var y = h * (0.72 + i * 0.04) + Math.sin((x / w) * l.freq * Math.PI * 2 + t * l.speed) * h * l.amp * sag;
        if (x === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
      }
      ctx.strokeStyle = l.color; ctx.lineWidth = l.width; ctx.stroke();
    });
  }
  function loop() { t += 0.02; draw(); requestAnimationFrame(loop); }

  resize();
  window.addEventListener('resize', function () { resize(); if (reduce) { draw(); } });
  if (reduce) { draw(); } else { loop(); }
  /* ---- extra animation ---- */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Scroll progress bar */
  var bar = document.querySelector('.progress');
  function progress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
  }
  window.addEventListener('scroll', progress, { passive: true });
  progress();

  /* Rotating focus words with typing effect */
  var rot = document.getElementById('rot');
  var words = ['industrial automation', 'preventive maintenance', 'embedded systems', 'energy monitoring', 'process optimization'];
  if (!reduceMotion) {
    var wi = 0, ci = words[0].length, deleting = false;
    (function type() {
      var word = words[wi];
      ci += deleting ? -1 : 1;
      rot.textContent = word.slice(0, ci);
      var delay = deleting ? 35 : 70;
      if (!deleting && ci === word.length) { deleting = true; delay = 1800; }
      else if (deleting && ci === 0) { deleting = false; wi = (wi + 1) % words.length; delay = 350; }
      setTimeout(type, delay);
    })();
  }

  if (reduceMotion || !('IntersectionObserver' in window)) { return; }
  document.documentElement.classList.add('anim');

  /* Stagger indexes */
  document.querySelectorAll('.chips').forEach(function (list) {
    list.querySelectorAll('li').forEach(function (li, i) { li.style.setProperty('--i', i); });
  });
  document.querySelectorAll('.gallery').forEach(function (g) {
    g.querySelectorAll('.shot').forEach(function (s, i) { s.style.setProperty('--i', i); });
  });

  /* Reveal on scroll, count up numbers */
  var timeline = document.querySelector('.timeline');
  var seen = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) { return; }
      en.target.classList.add('in');
      seen.unobserve(en.target);
      if (en.target === timeline) { return; }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(function (el) { seen.observe(el); });
  seen.observe(timeline);

  var counters = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) { return; }
      var el = en.target, to = +el.dataset.to, start = null;
      counters.unobserve(el);
      el.textContent = '0';
      requestAnimationFrame(function step(ts) {
        start = start || ts;
        var p = Math.min((ts - start) / 1200, 1);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) { requestAnimationFrame(step); }
      });
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-to]').forEach(function (el) { counters.observe(el); });

  /* Gentle 3D tilt on photos and video (mouse only) */
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.video').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(800px) rotateY(' + x * 6 + 'deg) rotateX(' + -y * 6 + 'deg) translateY(-6px)';
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
  }
})();
