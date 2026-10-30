// The game layer of a mission: 8-bit sounds with a switch in the top bar,
// titles that decode into place, the teacher telling the mission as a short
// story, and the victory screen with confetti, the XP counting up and a menu
// you drive with the arrow keys.
(function (root) {
  'use strict';

  var A = root.Academy || {};
  var SOUND_KEY = 'zerack.sound';
  var NEON = '#00f0ff';

  function node(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  function still() { return A.reducedMotion ? A.reducedMotion() : false; }

  // ---------- sound ----------
  // Every sound is synthesised, so there are no audio files to ship. Browsers
  // only start audio after a click or a key, so the first sounds of a page
  // that nobody has touched yet are simply skipped.

  var ctx = null;
  function soundOn() {
    try { return localStorage.getItem(SOUND_KEY) !== '0'; } catch (e) { return true; }
  }
  function audio() {
    if (!soundOn()) return null;
    var Ctx = root.AudioContext || root.webkitAudioContext;
    if (!Ctx) return null;
    if (!ctx) { try { ctx = new Ctx(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    return ctx.state === 'running' ? ctx : null;
  }

  // One note: a wave that slides from one pitch to another and fades out.
  function tone(c, at, type, from, to, ms, gain) {
    var osc = c.createOscillator(), vol = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, at + ms / 1000);
    vol.gain.setValueAtTime(gain, at);
    vol.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
    osc.connect(vol).connect(c.destination);
    osc.start(at);
    osc.stop(at + ms / 1000 + 0.02);
  }

  // Air rushing past: white noise through a filter that sweeps down.
  function whoosh(c, at, ms, gain) {
    var len = Math.floor(c.sampleRate * ms / 1000), buf = c.createBuffer(1, len, c.sampleRate), data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    var src = c.createBufferSource(), band = c.createBiquadFilter(), vol = c.createGain();
    src.buffer = buf;
    band.type = 'bandpass';
    band.Q.value = 1.2;
    band.frequency.setValueAtTime(2400, at);
    band.frequency.exponentialRampToValueAtTime(260, at + ms / 1000);
    vol.gain.setValueAtTime(0.0001, at);
    vol.gain.exponentialRampToValueAtTime(gain, at + ms / 3000);
    vol.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
    src.connect(band).connect(vol).connect(c.destination);
    src.start(at);
  }

  var SOUNDS = {
    ship: function (c, t) { whoosh(c, t, 950, 0.09); tone(c, t, 'sawtooth', 180, 70, 900, 0.025); },
    beam: function (c, t) { tone(c, t, 'sine', 220, 880, 850, 0.05); tone(c, t + 0.05, 'triangle', 440, 1320, 800, 0.02); },
    land: function (c, t) { tone(c, t, 'sine', 140, 45, 260, 0.12); whoosh(c, t, 300, 0.04); },
    glitch: function (c, t) { for (var i = 0; i < 7; i++) { var f = 300 + Math.random() * 1600; tone(c, t + i * 0.035, 'square', f, f, 30, 0.025); } },
    boot: function (c, t) { [262, 392, 523, 784].forEach(function (f, i) { tone(c, t + i * 0.06, 'square', f, f, 70, 0.03); }); },
    zap: function (c, t) { whoosh(c, t, 220, 0.14); tone(c, t, 'sawtooth', 1800, 90, 240, 0.05); },
    slam: function (c, t) { tone(c, t, 'sine', 110, 32, 420, 0.2); whoosh(c, t, 500, 0.09); },
    hiss: function (c, t) { whoosh(c, t, 600, 0.05); tone(c, t, 'square', 520, 780, 160, 0.02); },
    chime: function (c, t) { tone(c, t, 'sine', 1047, 1047, 500, 0.04); tone(c, t + 0.08, 'sine', 1568, 1568, 600, 0.025); },
    tick: function (c, t) { tone(c, t, 'square', 1300 + Math.random() * 300, 1300, 14, 0.012); },
    move: function (c, t) { tone(c, t, 'square', 620, 620, 45, 0.035); },
    select: function (c, t) { tone(c, t, 'square', 700, 1400, 90, 0.04); },
    run: function (c, t) { tone(c, t, 'triangle', 260, 640, 140, 0.06); },
    count: function (c, t) { tone(c, t, 'square', 1700, 1700, 18, 0.015); },
    pass: function (c, t) { [523, 659, 784, 1047].forEach(function (f, i) { tone(c, t + i * 0.075, 'square', f, f, 110, 0.045); }); },
    level: function (c, t) { [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(c, t + i * 0.07, 'square', f, f, 140, 0.04); }); },
    fail: function (c, t) { tone(c, t, 'sawtooth', 220, 110, 260, 0.04); tone(c, t + 0.12, 'square', 150, 90, 200, 0.03); }
  };

  function play(name) {
    var c = audio(), s = SOUNDS[name];
    if (c && s) s(c, c.currentTime + 0.005);
  }

  // The speaker button in the top bar turns every sound on or off.
  function soundButton() {
    var bar = document.querySelector('.bar-right');
    if (!bar || bar.querySelector('.sound')) return;
    var b = node('button', 'sound');
    b.type = 'button';
    function paint() {
      var on = soundOn();
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
      b.title = on ? 'Sound on' : 'Sound off';
      b.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/>' +
        (on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>' : '<path d="m16 9 5 6M21 9l-5 6"/>') + '</svg>';
    }
    b.addEventListener('click', function () {
      try { localStorage.setItem(SOUND_KEY, soundOn() ? '0' : '1'); } catch (e) {}
      paint();
      play('select');
    });
    paint();
    bar.insertBefore(b, bar.firstChild);
  }

  // ---------- titles that decode ----------
  // The letters arrive scrambled and settle into place from left to right.

  var GLYPHS = '01<>/\\{}[]#$%&*+=?!ABCDEFXZ';
  function decode(el, text, ms) {
    text = text != null ? String(text) : el.textContent;
    if (still() || !text) { el.textContent = text; return; }
    var total = ms || Math.min(900, 260 + text.length * 22), began = performance.now(), over = false;
    el.setAttribute('aria-label', text);
    function end() { over = true; el.textContent = text; el.removeAttribute('aria-label'); }
    // A hidden tab gets no animation frames, so a timer makes sure the real text always lands.
    setTimeout(end, total + 50);
    (function frame(now) {
      if (over) return;
      var done = Math.min(1, (now - began) / total), settled = Math.floor(done * text.length), out = '';
      for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        out += i < settled || ch === ' ' ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
      if (done < 1) requestAnimationFrame(frame);
      else end();
    })(began);
  }

  // ---------- the teacher tells the mission ----------
  // A short story at the top of the briefing: the teacher's face and their
  // lines, typed one after the other. A click finishes them at once.

  function briefing(host, who, lines) {
    if (!host || !who || !lines.length) return;
    var box = node('div', 'story');
    box.style.setProperty('--acc', who.accent || NEON);
    var face = node('img', 'story-face');
    face.src = who.face;
    face.alt = '';
    var words = node('div', 'story-words');
    box.appendChild(face);
    box.appendChild(words);
    host.insertBefore(box, host.firstChild);

    var finish = null, at = 0, skipping = false;
    function next() {
      if (at >= lines.length) { box.classList.add('is-done'); face.classList.remove('is-talking'); return; }
      var p = node('p', 'story-line');
      p.appendChild(node('b', null, who.name + ': '));
      var said = node('span');
      said.appendChild(A.markdown ? A.markdown(lines[at]) : document.createTextNode(lines[at]));
      // The Markdown renderer wraps text in a paragraph, which cannot sit inside this one.
      var inner = said.querySelector('p');
      if (inner) { while (inner.firstChild) said.insertBefore(inner.firstChild, inner); inner.remove(); }
      p.appendChild(said);
      words.appendChild(p);
      at++;
      face.classList.add('is-talking');
      var type = A.typewrite || function (n, s, d) { d(); return function () {}; };
      finish = type(said, skipping ? 0 : 17, function () {
        finish = null;
        face.classList.remove('is-talking');
        setTimeout(next, skipping || still() ? 0 : 380);
      });
      if (skipping && finish) finish();
    }
    box.addEventListener('click', function () {
      skipping = true;
      if (finish) finish();
    });
    setTimeout(next, still() ? 0 : 450);
  }

  // ---------- confetti ----------

  function confetti(canvas) {
    var g = canvas.getContext('2d');
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    var w = canvas.width = canvas.offsetWidth * dpr;
    var h = canvas.height = canvas.offsetHeight * dpr;
    var colors = [NEON, '#ffffff', '#7af7ff', '#0a8a94'];
    var bits = [];
    // One burst from the middle, then a slow rain from the top.
    for (var i = 0; i < 170; i++) {
      var burst = i < 90, a = Math.random() * Math.PI * 2, v = (4 + Math.random() * 9) * dpr;
      bits.push({
        x: burst ? w / 2 : Math.random() * w,
        y: burst ? h * 0.42 : -Math.random() * h * 0.6,
        vx: burst ? Math.cos(a) * v : (Math.random() - 0.5) * dpr,
        vy: burst ? Math.sin(a) * v - 4 * dpr : (1 + Math.random() * 2) * dpr,
        s: (3 + Math.random() * 5) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
        c: colors[i % colors.length]
      });
    }
    var running = true, began = performance.now();
    (function frame(now) {
      if (!running) return;
      g.clearRect(0, 0, w, h);
      var alive = 0;
      bits.forEach(function (b) {
        b.vy += 0.12 * dpr; b.vx *= 0.985; b.vy = Math.min(b.vy, 4 * dpr);
        b.x += b.vx; b.y += b.vy; b.r += b.vr;
        if (b.y < h + 20) alive++;
        g.save();
        g.translate(b.x, b.y);
        g.rotate(b.r);
        g.fillStyle = b.c;
        g.globalAlpha = Math.max(0, 1 - (now - began) / 6500);
        g.fillRect(-b.s / 2, -b.s / 3, b.s, b.s * 0.66);
        g.restore();
      });
      if (alive && now - began < 6500) requestAnimationFrame(frame);
    })(began);
    return function () { running = false; };
  }

  // ---------- the victory screen ----------
  // options:
  //   who        the teacher's card (Cast.card)
  //   title      the mission title
  //   xp         XP won now, 0 when the mission was already done
  //   before     total XP before this mission
  //   items      menu entries: [{ label, hint, run }], the first one is picked
  //   onClose    called when the screen goes away without a choice

  function victory(options) {
    var who = options.who || { name: 'Zack', accent: NEON, face: '', cheers: ['Mission complete!'] };
    var xp = Number(options.xp) || 0;
    var before = Number(options.before) || 0;
    var lvBefore = A.levelFor ? A.levelFor(before) : null;
    var lvAfter = A.levelFor ? A.levelFor(before + xp) : null;
    var levelled = lvBefore && lvAfter && lvAfter.level > lvBefore.level;

    var screen = node('div', 'win');
    screen.style.setProperty('--acc', who.accent || NEON);
    screen.setAttribute('role', 'dialog');
    screen.setAttribute('aria-modal', 'true');
    screen.setAttribute('aria-label', 'Mission complete');

    var sky = node('canvas', 'win-confetti');
    sky.setAttribute('aria-hidden', 'true');
    screen.appendChild(sky);

    var hero = node('div', 'win-hero');
    var lift = node('div', 'win-lift');
    var art = node('img', 'win-char');
    art.src = who.face;
    art.alt = who.name;
    lift.appendChild(art);
    hero.appendChild(lift);
    hero.appendChild(node('div', 'win-floor'));
    screen.appendChild(hero);

    var card = node('div', 'win-card');
    var kicker = node('p', 'win-kicker');
    card.appendChild(kicker);
    var big = node('b', 'win-xp', xp ? '+0 XP' : 'CLEARED');
    card.appendChild(big);
    card.appendChild(node('p', 'win-title', options.title || ''));

    var meter = node('div', 'win-meter');
    var lvTag = node('span', 'win-lv', lvBefore ? 'LV ' + lvBefore.level : '');
    var track = node('div', 'win-track');
    var fill = node('i', 'win-fill');
    track.appendChild(fill);
    var toNext = node('small', 'win-next');
    meter.appendChild(lvTag);
    meter.appendChild(track);
    meter.appendChild(toNext);
    if (lvBefore) card.appendChild(meter);
    // The student's own avatar stands next to their level.
    avatar().then(function (me) {
      if (!me) return;
      var mine = node('img', 'win-me');
      mine.src = me.src;
      mine.alt = me.name;
      meter.insertBefore(mine, lvTag);
      meter.classList.add('has-me');
    });

    var quip = node('p', 'win-quip');
    var cheers = who.cheers || ['Mission complete!'];
    quip.appendChild(node('b', null, who.name + ': '));
    var quipText = node('span', null, cheers[Math.floor(Math.random() * cheers.length)]);
    quip.appendChild(quipText);
    card.appendChild(quip);

    var menu = node('div', 'win-menu');
    menu.setAttribute('role', 'menu');
    card.appendChild(menu);
    screen.appendChild(card);

    function paintMeter(level, into, need) {
      lvTag.textContent = 'LV ' + level;
      fill.style.width = Math.max(2, Math.round(100 * into / need)) + '%';
      toNext.textContent = (need - into) + ' XP to LV ' + (level + 1);
    }
    if (lvBefore) paintMeter(lvBefore.level, lvBefore.into, lvBefore.toNext);

    var stopConfetti = function () {};
    var picked = 0, buttons = [], closed = false;

    function choose(k) {
      picked = k;
      buttons.forEach(function (b, j) {
        b.classList.toggle('is-on', j === k);
        b.setAttribute('tabindex', j === k ? '0' : '-1');
      });
      if (buttons[k]) buttons[k].focus({ preventScroll: true });
    }

    function close(then) {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      stopConfetti();
      screen.classList.add('is-leaving');
      document.body.classList.remove('has-win');
      setTimeout(function () { screen.remove(); if (then) then(); }, still() ? 0 : 320);
    }

    (options.items || []).forEach(function (item, k) {
      var b = node('button', 'win-item');
      b.type = 'button';
      b.setAttribute('role', 'menuitem');
      b.appendChild(node('span', 'win-cursor', '▸'));
      b.appendChild(node('span', 'win-label', item.label));
      if (item.hint) b.appendChild(node('small', 'win-hint', item.hint));
      b.addEventListener('mouseenter', function () { if (picked !== k) { play('move'); choose(k); } });
      b.addEventListener('click', function () { play('select'); close(item.run); });
      menu.appendChild(b);
      buttons.push(b);
    });

    function onKey(e) {
      if (closed) return;
      var n = buttons.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        choose((picked + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
        play('move');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close(options.onClose);
      }
    }

    document.body.appendChild(screen);
    document.body.classList.add('has-win');
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(function () { screen.classList.add('is-on'); });

    decode(kicker, levelled ? 'LEVEL UP · MISSION COMPLETE' : (xp ? 'MISSION COMPLETE' : 'MISSION CLEARED AGAIN'), 700);
    if (!still()) stopConfetti = confetti(sky);
    play(levelled ? 'level' : 'pass');
    if (A.typewrite) A.typewrite(quipText, 22);

    // The XP counts up, then the level bar fills to its new place. A level up
    // fills the old bar to the end first and starts the new one from empty.
    function settleMeter() {
      if (!lvAfter) return;
      if (!levelled) { paintMeter(lvAfter.level, lvAfter.into, lvAfter.toNext); return; }
      fill.style.width = '100%';
      setTimeout(function () {
        card.classList.add('is-levelled');
        fill.style.transition = 'none';
        paintMeter(lvAfter.level, 0, lvAfter.toNext);
        void fill.offsetWidth;
        fill.style.transition = '';
        paintMeter(lvAfter.level, lvAfter.into, lvAfter.toNext);
      }, still() ? 0 : 650);
    }

    if (!xp) { settleMeter(); }
    else if (still()) { big.textContent = '+' + xp + ' XP'; settleMeter(); }
    else {
      var began = performance.now(), ms = Math.min(1100, 400 + xp * 12), lastShown = 0, counted = false;
      function full() {
        if (counted) return;
        counted = true;
        big.textContent = '+' + xp + ' XP';
        big.classList.add('is-full');
        settleMeter();
      }
      setTimeout(full, ms + 80);
      (function count(now) {
        if (counted) return;
        var t = Math.min(1, (now - began) / ms), eased = 1 - Math.pow(1 - t, 3), shown = Math.round(xp * eased);
        if (shown !== lastShown) { lastShown = shown; play('count'); }
        big.textContent = '+' + shown + ' XP';
        if (t < 1) requestAnimationFrame(count);
        else full();
      })(began);
    }

    // The menu waits a moment so a key still held from the check does not pick for you.
    setTimeout(function () { if (!closed) { menu.classList.add('is-ready'); choose(0); } }, still() ? 0 : 500);
    return { close: close };
  }

  // ---------- your avatar ----------
  // A small, half-hidden button in the bottom-left corner opens the picker.
  // The avatars are listed in avatars/avatars.json as [{ id, name, file }];
  // until that file exists the corner stays away.

  var AVATAR_KEY = 'zerack.avatar';
  var script = document.currentScript;
  var AVATARS = script ? new URL('avatars/', script.src).href : 'avatars/';
  var avatarList = null;

  function loadAvatars() {
    if (avatarList) return Promise.resolve(avatarList);
    return fetch(AVATARS + 'avatars.json').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
      .then(function (list) {
        avatarList = (Array.isArray(list) ? list : []).filter(function (a) { return a && a.id && a.file; })
          .map(function (a) { return { id: a.id, name: a.name || a.id, src: AVATARS + a.file }; });
        return avatarList;
      });
  }

  function chosenId() { try { return localStorage.getItem(AVATAR_KEY) || ''; } catch (e) { return ''; } }

  // Resolves to the student's avatar ({ id, name, src }) or null when none is chosen.
  function avatar() {
    return loadAvatars().then(function (list) {
      var id = chosenId();
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    });
  }

  function avatarCorner() {
    if (document.querySelector('.me')) return;
    loadAvatars().then(function (list) {
      if (!list.length) return;
      var corner = node('div', 'me');
      var button = node('button', 'me-btn');
      button.type = 'button';
      button.setAttribute('aria-haspopup', 'dialog');
      var face = node('img', 'me-face');
      face.alt = '';
      button.appendChild(face);
      var panel = node('div', 'me-panel');
      panel.hidden = true;
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Choose your avatar');
      panel.appendChild(node('b', 'me-title', 'Choose your avatar'));
      var grid = node('div', 'me-grid');
      panel.appendChild(grid);
      corner.appendChild(panel);
      corner.appendChild(button);
      document.body.appendChild(corner);

      function paint() {
        var id = chosenId(), mine = null;
        list.forEach(function (a) { if (a.id === id) mine = a; });
        corner.classList.toggle('is-set', !!mine);
        face.src = mine ? mine.src : list[0].src;
        button.title = mine ? 'You are ' + mine.name + ' · change avatar' : 'Choose your avatar';
        button.setAttribute('aria-label', button.title);
        Array.prototype.forEach.call(grid.children, function (b) {
          var on = b.getAttribute('data-id') === id;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }

      list.forEach(function (a) {
        var b = node('button', 'me-pick');
        b.type = 'button';
        b.setAttribute('data-id', a.id);
        b.title = a.name;
        var img = node('img');
        img.src = a.src;
        img.alt = a.name;
        img.loading = 'lazy';
        b.appendChild(img);
        b.addEventListener('mouseenter', function () { play('move'); });
        b.addEventListener('click', function () {
          try { localStorage.setItem(AVATAR_KEY, a.id); } catch (e) {}
          play('select');
          paint();
          toggle(false);
          corner.classList.remove('is-picked');
          void corner.offsetWidth;
          corner.classList.add('is-picked');
          try { document.dispatchEvent(new CustomEvent('academy:avatar', { detail: a })); } catch (e) {}
        });
        grid.appendChild(b);
      });

      function toggle(open) {
        panel.hidden = !open;
        corner.classList.toggle('is-open', open);
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) play('select');
      }
      button.addEventListener('click', function () { toggle(panel.hidden); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) toggle(false); });
      document.addEventListener('click', function (e) { if (!panel.hidden && !corner.contains(e.target)) toggle(false); });
      paint();
    });
  }

  root.Arcade = { play: play, soundOn: soundOn, soundButton: soundButton, decode: decode, briefing: briefing, victory: victory, avatar: avatar, avatarCorner: avatarCorner };
})(window);
