// The entrance scene. When you walk into a course, its character flies in
// through a portal, introduces itself and talks you through what is coming,
// one line at a time. When the talk ends the character flies to its place on
// the page, so the scene and the page are one movement.
(function (root) {
  'use strict';

  var A = root.Academy || {};

  function node(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  function still() { return A.reducedMotion ? A.reducedMotion() : false; }

  function sound(name) { if (root.Arcade) root.Arcade.play(name); }

  // The ship that brings the teacher: a dropship seen from the side, black
  // hull, white trim and cyan lights, with the emitter of the beam underneath.
  var SHIP = '<svg viewBox="0 0 320 120" aria-hidden="true">' +
    '<defs>' +
      '<linearGradient id="stHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2430"/><stop offset=".55" stop-color="#0a0e14"/><stop offset="1" stop-color="#05070a"/></linearGradient>' +
      '<linearGradient id="stGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bffcff"/><stop offset=".45" stop-color="#00f0ff" stop-opacity=".75"/><stop offset="1" stop-color="#003a40" stop-opacity=".9"/></linearGradient>' +
      '<radialGradient id="stGlow"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#00f0ff"/><stop offset="1" stop-color="#00f0ff" stop-opacity="0"/></radialGradient>' +
    '</defs>' +
    // Engine glow behind the pods.
    '<ellipse class="st-flame" cx="34" cy="74" rx="30" ry="9" fill="url(#stGlow)"/>' +
    '<ellipse class="st-flame" cx="286" cy="74" rx="30" ry="9" fill="url(#stGlow)"/>' +
    // Side pods.
    '<path d="M18 66 Q20 58 44 58 L84 60 L84 86 L44 88 Q20 88 18 80 Z" fill="url(#stHull)" stroke="#e9fbff" stroke-opacity=".55" stroke-width="1.4"/>' +
    '<path d="M302 66 Q300 58 276 58 L236 60 L236 86 L276 88 Q300 88 302 80 Z" fill="url(#stHull)" stroke="#e9fbff" stroke-opacity=".55" stroke-width="1.4"/>' +
    // Main hull.
    '<path d="M60 70 Q92 42 160 40 Q228 42 260 70 Q240 92 160 94 Q80 92 60 70 Z" fill="url(#stHull)" stroke="#e9fbff" stroke-opacity=".75" stroke-width="1.6"/>' +
    // Cockpit dome.
    '<path d="M118 48 Q160 8 202 48 Q160 40 118 48 Z" fill="url(#stGlass)" stroke="#e9fbff" stroke-opacity=".8" stroke-width="1.2"/>' +
    '<path d="M134 38 Q150 24 166 22" fill="none" stroke="#ffffff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>' +
    // Cyan trim along the hull and the pods.
    '<path d="M74 70 Q160 58 246 70" fill="none" stroke="#00f0ff" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M30 73 H80 M240 73 H290" stroke="#00f0ff" stroke-width="2" stroke-linecap="round"/>' +
    // Belly lights that run in sequence.
    '<g class="st-lights" fill="#00f0ff"><circle cx="104" cy="82" r="2.6"/><circle cx="128" cy="86" r="2.6"/><circle cx="192" cy="86" r="2.6"/><circle cx="216" cy="82" r="2.6"/></g>' +
    // The emitter the beam comes out of.
    '<ellipse class="st-emitter" cx="160" cy="93" rx="22" ry="5" fill="url(#stGlow)"/>' +
  '</svg>';

  // ---------- entrances ----------
  // Each one adds its own pieces to the hero and returns its sound cues as
  // [ms, sound]. The CSS for each lives under .stage.is-<kind>.

  var ENTRANCES = { byte: 'code', voltio: 'bolt', chispa: 'pod', mate: 'grid', neura: 'mind' };

  function svg(markup) { var d = node('div'); d.innerHTML = markup; return d.firstChild; }

  var BUILD = {
    // A dropship swoops in, beams the teacher down and leaves.
    ship: function (hero) {
      var ship = node('div', 'stage-ship');
      ship.innerHTML = SHIP;
      hero.appendChild(ship);
      hero.appendChild(node('div', 'stage-beam'));
      return [[120, 'ship'], [1150, 'beam'], [2050, 'land']];
    },

    // Code rains down and the teacher loads in line by line, with a glitch.
    code: function (hero) {
      var rain = node('div', 'stage-rain');
      var glyphs = '01{}<>/=;()[]#$';
      for (var c = 0; c < 16; c++) {
        var col = node('i');
        var text = '';
        for (var k = 0; k < 18; k++) text += glyphs[Math.floor(Math.random() * glyphs.length)] + '\n';
        col.textContent = text;
        col.style.left = (c / 16 * 100 + Math.random() * 3).toFixed(1) + '%';
        col.style.animationDelay = (Math.random() * 0.6).toFixed(2) + 's';
        col.style.animationDuration = (1.2 + Math.random() * 0.7).toFixed(2) + 's';
        rain.appendChild(col);
      }
      hero.appendChild(rain);
      hero.appendChild(node('div', 'stage-scan'));
      return [[150, 'glitch'], [900, 'glitch'], [1500, 'boot'], [2050, 'land']];
    },

    // A bolt of lightning strikes the ring and the teacher comes out of the flash.
    bolt: function (hero, scene) {
      hero.appendChild(svg('<svg class="stage-bolt" viewBox="0 0 100 400" preserveAspectRatio="none" aria-hidden="true">' +
        '<path d="M58 0 L40 120 L62 128 L34 250 L58 258 L44 400" fill="none" stroke="#ffffff" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M58 0 L40 120 L62 128 L34 250 L58 258 L44 400" fill="none" stroke="#00f0ff" stroke-width="14" stroke-opacity=".45" stroke-linejoin="round"/></svg>'));
      var burst = node('div', 'stage-burst');
      for (var i = 0; i < 18; i++) {
        var s = node('i');
        s.style.setProperty('--a', (i / 18 * 360 + Math.random() * 12).toFixed(0) + 'deg');
        s.style.setProperty('--d', (90 + Math.random() * 110).toFixed(0) + 'px');
        burst.appendChild(s);
      }
      hero.appendChild(burst);
      scene.appendChild(node('div', 'stage-flash'));
      return [[300, 'beam'], [950, 'zap'], [1100, 'zap'], [2050, 'land']];
    },

    // A drop pod falls, slams into the ring, opens and the teacher steps out.
    pod: function (hero) {
      var pod = node('div', 'stage-pod');
      var half = '<svg viewBox="0 0 60 160" aria-hidden="true"><path d="M60 4 Q14 8 6 60 L6 132 Q8 150 60 156 Z" fill="#0b0f15" stroke="#e9fbff" stroke-opacity=".7" stroke-width="2"/>' +
        '<path d="M60 30 Q26 34 20 70 L20 120" fill="none" stroke="#00f0ff" stroke-width="2.5" stroke-linecap="round"/>' +
        '<circle cx="34" cy="96" r="4" fill="#00f0ff"/></svg>';
      var left = node('div', 'stage-pod-half is-left');
      left.innerHTML = half;
      var right = node('div', 'stage-pod-half is-right');
      right.innerHTML = half;
      pod.appendChild(left);
      pod.appendChild(right);
      pod.appendChild(node('div', 'stage-pod-fire'));
      hero.appendChild(pod);
      hero.appendChild(node('div', 'stage-dust'));
      return [[100, 'ship'], [950, 'slam'], [1350, 'hiss'], [2050, 'land']];
    },

    // A wireframe solid draws itself, spins, shrinks and becomes the teacher.
    grid: function (hero) {
      var pts = [[50, 6], [88, 30], [88, 74], [50, 96], [12, 74], [12, 30], [50, 50]];
      var edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6], [2, 6], [4, 6], [1, 3], [3, 5], [5, 1]];
      var lines = edges.map(function (e, i) {
        var a = pts[e[0]], b = pts[e[1]];
        return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" pathLength="1" style="animation-delay:' + (0.1 + i * 0.06).toFixed(2) + 's"/>';
      }).join('');
      var dots = pts.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.2"/>'; }).join('');
      hero.appendChild(svg('<svg class="stage-solid" viewBox="0 0 100 100" aria-hidden="true"><g class="stage-solid-lines">' + lines + '</g><g class="stage-solid-dots">' + dots + '</g></svg>'));
      return [[150, 'chime'], [700, 'chime'], [1350, 'beam'], [2050, 'land']];
    },

    // A neural network lights up node by node, then collapses into the teacher.
    mind: function (hero) {
      var nodes = [];
      for (var i = 0; i < 16; i++) {
        var a = i / 16 * Math.PI * 2 + Math.random() * 0.3, r = 30 + Math.random() * 16;
        nodes.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r * 1.2]);
      }
      var links = '';
      nodes.forEach(function (p, i) {
        [1, 3, 7].forEach(function (step) {
          var q = nodes[(i + step) % nodes.length];
          links += '<line x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '" pathLength="1" style="animation-delay:' + (0.3 + Math.random() * 0.6).toFixed(2) + 's"/>';
        });
      });
      var dots = nodes.map(function (p, i) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.4" style="animation-delay:' + (0.05 + i * 0.04).toFixed(2) + 's"/>'; }).join('');
      hero.appendChild(svg('<svg class="stage-net" viewBox="0 0 100 100" aria-hidden="true"><g class="stage-net-links">' + links + '</g><g class="stage-net-dots">' + dots + '</g></svg>'));
      return [[100, 'chime'], [500, 'glitch'], [1400, 'beam'], [2050, 'land']];
    }
  };

  // options:
  //   who      a card from Cast.card (name, role, accent, face)
  //   kicker   small text above the name, like the world of the course
  //   lines    what the character says, in Markdown, one bubble each
  //   actions  buttons for the last line: [{ label, main, run }]
  //   target   function returning the rect the character flies to at the end
  //   done     called once the scene is gone
  function play(options) {
    var who = options.who;
    var lines = options.lines || [];
    var scene = node('div', 'stage');
    scene.style.setProperty('--acc', who.accent);
    scene.setAttribute('role', 'dialog');
    scene.setAttribute('aria-modal', 'true');
    scene.setAttribute('aria-label', who.name + ' welcomes you');

    var sky = node('div', 'stage-sky');
    for (var i = 0; i < 26; i++) {
      var spark = node('i');
      spark.style.left = (Math.random() * 100).toFixed(1) + '%';
      spark.style.animationDelay = (-Math.random() * 6).toFixed(2) + 's';
      spark.style.animationDuration = (4 + Math.random() * 5).toFixed(2) + 's';
      spark.style.setProperty('--s', (0.4 + Math.random()).toFixed(2));
      sky.appendChild(spark);
    }
    scene.appendChild(sky);

    // Every teacher has an entrance of their own (see ENTRANCES). They all
    // land on the same ring about two seconds in, and the talk starts then.
    var kind = ENTRANCES[who.id] || 'ship';
    scene.classList.add('is-arrival', 'is-' + kind);
    var hero = node('div', 'stage-hero');
    var cues = BUILD[kind](hero, scene);
    hero.appendChild(node('div', 'stage-portal'));
    var lift = node('div', 'stage-lift');
    var art = node('img', 'stage-char');
    art.src = who.face;
    art.alt = who.name;
    lift.appendChild(art);
    hero.appendChild(lift);
    hero.appendChild(node('div', 'stage-floor'));
    scene.appendChild(hero);

    var plate = node('div', 'stage-plate');
    if (options.kicker) plate.appendChild(node('small', null, options.kicker));
    plate.appendChild(node('b', null, who.name));
    plate.appendChild(node('span', null, who.role));
    scene.appendChild(plate);

    var skip = node('button', 'stage-skip', 'Skip ›');
    skip.type = 'button';
    scene.appendChild(skip);

    var box = node('div', 'stage-dialog');
    var name = node('b', 'stage-name', who.name);
    var text = node('div', 'stage-text');
    var more = node('span', 'stage-more');
    more.setAttribute('aria-hidden', 'true');
    var dots = node('div', 'stage-dots');
    var actions = node('div', 'stage-actions');
    box.appendChild(name);
    box.appendChild(text);
    box.appendChild(more);
    box.appendChild(dots);
    box.appendChild(actions);
    scene.appendChild(box);
    lines.forEach(function () { dots.appendChild(node('i')); });

    document.body.appendChild(scene);
    document.body.classList.add('has-stage');
    requestAnimationFrame(function () { scene.classList.add('is-on'); });

    var at = -1, finishTyping = null, typing = false, closing = false;

    function showLine(k) {
      at = k;
      Array.prototype.forEach.call(dots.children, function (d, j) { d.classList.toggle('is-on', j <= k); });
      A.clear ? A.clear(text) : (text.innerHTML = '');
      text.appendChild(A.markdown ? A.markdown(lines[k]) : document.createTextNode(lines[k]));
      box.classList.remove('is-last', 'is-waiting');
      typing = true;
      text.classList.remove('is-in');
      void text.offsetWidth;
      text.classList.add('is-in');
      lift.classList.remove('is-talking');
      void lift.offsetWidth;
      lift.classList.add('is-talking');
      finishTyping = A.typewrite ? A.typewrite(text, 20, ended) : (ended(), null);
    }

    function ended() {
      typing = false;
      finishTyping = null;
      lift.classList.remove('is-talking');
      if (at < lines.length - 1) { box.classList.add('is-waiting'); return; }
      box.classList.add('is-last');
      if (actions.children.length) return;
      (options.actions || []).forEach(function (a) {
        var b = node('button', a.main ? 'stage-btn is-main' : 'stage-btn', a.label);
        b.type = 'button';
        b.addEventListener('click', function (e) { e.stopPropagation(); a.run(close); });
        actions.appendChild(b);
      });
      var first = actions.querySelector('.is-main') || actions.firstChild;
      if (first) first.focus();
    }

    function advance() {
      if (closing) return;
      if (typing) { if (finishTyping) finishTyping(); return; }
      if (at < lines.length - 1) showLine(at + 1);
    }

    // The character flies from the middle of the scene to its place on the
    // page while the scene fades, then the page takes over.
    function close(then) {
      if (closing) return;
      closing = true;
      if (finishTyping) finishTyping();
      document.removeEventListener('keydown', onKey);
      var to = options.target ? options.target() : null;
      var from = art.getBoundingClientRect();
      scene.classList.add('is-leaving');
      function gone() {
        scene.remove();
        document.body.classList.remove('has-stage');
        if (options.done) options.done();
        if (then) then();
      }
      if (still() || !to || !from.width || !to.width) { setTimeout(gone, still() ? 0 : 320); return; }
      var flyer = art.cloneNode();
      flyer.className = 'stage-flyer';
      flyer.style.cssText = 'left:' + from.left + 'px;top:' + from.top + 'px;width:' + from.width + 'px;height:' + from.height + 'px;--acc:' + who.accent;
      document.body.appendChild(flyer);
      lift.style.visibility = 'hidden';
      var dx = to.left + to.width / 2 - (from.left + from.width / 2);
      var dy = to.top + to.height / 2 - (from.top + from.height / 2);
      var scale = to.height / from.height;
      var anim = flyer.animate([
        { transform: 'translate(0, 0) scale(1) rotate(0)' },
        { transform: 'translate(' + dx * 0.45 + 'px,' + (dy * 0.45 - 90) + 'px) scale(' + (1 + scale) / 2 + ') rotate(-10deg)', offset: 0.5 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ') rotate(0)' }
      ], { duration: 780, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
      anim.onfinish = function () {
        gone();
        flyer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).onfinish = function () { flyer.remove(); };
      };
    }

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if ((e.key === 'Enter' || e.key === ' ') && !box.classList.contains('is-last')) { e.preventDefault(); advance(); }
    }

    skip.addEventListener('click', function (e) { e.stopPropagation(); close(); });
    box.addEventListener('click', advance);
    hero.addEventListener('click', advance);
    document.addEventListener('keydown', onKey);

    // The first line waits for the character to land.
    if (!still()) cues.forEach(function (c) { setTimeout(function () { sound(c[1]); }, c[0]); });
    setTimeout(function () { showLine(0); }, still() ? 0 : 2300);
    return { close: close };
  }

  root.Stage = { play: play };
})(window);
