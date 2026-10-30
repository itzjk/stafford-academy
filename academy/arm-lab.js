// Arm Lab: a two-link planar arm. In forward mode you set the joint angles
// and Servo shows where the tool ends up and why; in inverse mode you pick a
// point and the arm works out the angles that reach it, with every step of
// the maths using the live numbers.
(function () {
  'use strict';

  var A = window.Academy;
  if (!A) return;
  A.stars();
  if (window.Arcade) { window.Arcade.soundButton(); window.Arcade.avatarCorner(); }

  var SVG = 'http://www.w3.org/2000/svg';
  var BASE = [340, 330], SCALE = 11;   // px per cm
  var DEG = Math.PI / 180;
  function play(name) { if (window.Arcade) window.Arcade.play(name); }
  function fmt(x, d) { var r = Number(x.toFixed(d == null ? 2 : d)); return (Object.is(r, -0) ? 0 : r).toString(); }

  var state = { mode: 'forward', t1: 40, t2: 60, l1: 12, l2: 9, target: null, elbowUp: true, trail: [], shown: { t1: 40, t2: 60 } };

  function el(tag, attrs, parent) {
    var n = document.createElementNS(SVG, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }
  function toScreen(x, y) { return [BASE[0] + x * SCALE, BASE[1] - y * SCALE]; }
  function toWorld(px, py) { return [(px - BASE[0]) / SCALE, (BASE[1] - py) / SCALE]; }

  function forward(t1, t2) {
    var a = t1 * DEG, b = (t1 + t2) * DEG;
    var ex = state.l1 * Math.cos(a), ey = state.l1 * Math.sin(a);
    return { elbow: [ex, ey], tool: [ex + state.l2 * Math.cos(b), ey + state.l2 * Math.sin(b)] };
  }

  // Both solutions of the inverse problem; null when the point is out of reach.
  function inverse(x, y, up) {
    var c2 = (x * x + y * y - state.l1 * state.l1 - state.l2 * state.l2) / (2 * state.l1 * state.l2);
    if (c2 > 1 || c2 < -1) return { reach: false, c2: c2 };
    var t2 = Math.acos(c2) * (up ? -1 : 1);
    var t1 = Math.atan2(y, x) - Math.atan2(state.l2 * Math.sin(t2), state.l1 + state.l2 * Math.cos(t2));
    return { reach: true, c2: c2, t1: t1 / DEG, t2: t2 / DEG };
  }

  function arc(parent, cx, cy, r, from, to, cls) {
    var a0 = -from * DEG, a1 = -to * DEG;
    var large = Math.abs(to - from) > 180 ? 1 : 0, sweep = to > from ? 0 : 1;
    el('path', { d: 'M' + (cx + r * Math.cos(a0)) + ' ' + (cy + r * Math.sin(a0)) + ' A' + r + ' ' + r + ' 0 ' + large + ' ' + sweep + ' ' + (cx + r * Math.cos(a1)) + ' ' + (cy + r * Math.sin(a1)), class: cls }, parent);
  }

  function draw() {
    var svg = A.el('arm');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var outer = (state.l1 + state.l2) * SCALE, inner = Math.abs(state.l1 - state.l2) * SCALE;
    el('path', { d: 'M' + (BASE[0] - outer) + ' ' + BASE[1] + ' A' + outer + ' ' + outer + ' 0 1 1 ' + (BASE[0] + outer) + ' ' + BASE[1] + ' L' + (BASE[0] + inner) + ' ' + BASE[1] + ' A' + inner + ' ' + inner + ' 0 1 0 ' + (BASE[0] - inner) + ' ' + BASE[1] + ' Z', class: 'arm-reach' }, svg);
    el('line', { x1: 20, y1: BASE[1], x2: 660, y2: BASE[1], class: 'arm-axis' }, svg);
    el('line', { x1: BASE[0], y1: 20, x2: BASE[0], y2: 400, class: 'arm-axis' }, svg);
    var xl = el('text', { x: 650, y: BASE[1] + 18, class: 'arm-text', 'text-anchor': 'end' }, svg); xl.textContent = 'x';
    var yl = el('text', { x: BASE[0] + 10, y: 34, class: 'arm-text' }, svg); yl.textContent = 'y';

    if (state.trail.length > 1) el('polyline', { points: state.trail.map(function (p) { var s = toScreen(p[0], p[1]); return s[0] + ',' + s[1]; }).join(' '), class: 'arm-trail' }, svg);

    if (state.mode === 'inverse' && state.target) {
      var t = toScreen(state.target[0], state.target[1]);
      var ok = inverse(state.target[0], state.target[1], state.elbowUp).reach;
      el('circle', { cx: t[0], cy: t[1], r: 13, class: 'arm-target' + (ok ? '' : ' is-out') }, svg);
      el('line', { x1: t[0] - 20, y1: t[1], x2: t[0] + 20, y2: t[1], class: 'arm-target' + (ok ? '' : ' is-out') }, svg);
      el('line', { x1: t[0], y1: t[1] - 20, x2: t[0], y2: t[1] + 20, class: 'arm-target' + (ok ? '' : ' is-out') }, svg);
    }

    var f = forward(state.shown.t1, state.shown.t2);
    var e = toScreen(f.elbow[0], f.elbow[1]), w = toScreen(f.tool[0], f.tool[1]);
    arc(svg, BASE[0], BASE[1], 46, 0, state.shown.t1, 'arm-angle');
    var a1 = el('text', { x: BASE[0] + 56 * Math.cos(-state.shown.t1 / 2 * DEG) + 4, y: BASE[1] + 56 * Math.sin(-state.shown.t1 / 2 * DEG) + 4, class: 'arm-text' }, svg);
    a1.textContent = 'θ1';
    arc(svg, e[0], e[1], 34, state.shown.t1, state.shown.t1 + state.shown.t2, 'arm-angle');
    var mid = (state.shown.t1 + state.shown.t2 / 2) * DEG;
    var a2 = el('text', { x: e[0] + 46 * Math.cos(-mid) - 6, y: e[1] + 46 * Math.sin(-mid) + 4, class: 'arm-text' }, svg);
    a2.textContent = 'θ2';
    el('rect', { x: BASE[0] - 34, y: BASE[1] - 4, width: 68, height: 26, rx: 6, class: 'arm-base' }, svg);
    el('line', { x1: BASE[0], y1: BASE[1], x2: e[0], y2: e[1], class: 'arm-link' }, svg);
    el('line', { x1: e[0], y1: e[1], x2: w[0], y2: w[1], class: 'arm-link is-two' }, svg);
    el('circle', { cx: BASE[0], cy: BASE[1], r: 11, class: 'arm-joint' }, svg);
    el('circle', { cx: e[0], cy: e[1], r: 9, class: 'arm-joint' }, svg);
    el('circle', { cx: w[0], cy: w[1], r: 7, class: 'arm-tool' }, svg);
    var pt = el('text', { x: w[0] + 14, y: w[1] - 12, class: 'arm-text' }, svg);
    pt.textContent = '(' + fmt(f.tool[0], 1) + ', ' + fmt(f.tool[1], 1) + ')';
  }

  // ---------- the explanation ----------

  var servo = window.Cast ? window.Cast.card('chispa') : { name: 'Servo', face: 'cast/chispa.webp' };
  A.el('face').src = servo.face;
  var TEXT = {
    forward: { title: 'Where does the tool end up?', say: 'You choose the joint angles and I add the two links like arrows: the first one from the base, the second one from the elbow, turned by **both** angles. That gives the tool position.' },
    inverse: { title: 'Which angles reach this point?', say: 'Click or drag anywhere. First the elbow angle, from the law of cosines; then the shoulder angle, from where the point is minus the bend the elbow adds. Two answers exist: elbow up and elbow down.' }
  };
  var finish = null;
  function narrate() {
    var t = TEXT[state.mode];
    if (window.Arcade) window.Arcade.decode(A.el('title'), t.title); else A.el('title').textContent = t.title;
    var say = A.el('say');
    A.clear(say);
    var b = document.createElement('b'); b.textContent = servo.name + ': '; say.appendChild(b);
    var words = document.createElement('span'); A.inline(words, t.say); say.appendChild(words);
    if (finish) finish();
    finish = A.typewrite ? A.typewrite(words, 12, function () { finish = null; }) : null;
  }

  function math() {
    var l1 = state.l1, l2 = state.l2, out = '';
    if (state.mode === 'forward') {
      var f = forward(state.t1, state.t2);
      out += '<p class="eq">x <i>=</i> L1·cos θ1 + L2·cos(θ1+θ2)</p>';
      out += '<p class="eq dim">  <i>=</i> ' + fmt(l1, 1) + '·cos ' + fmt(state.t1, 0) + '° + ' + fmt(l2, 1) + '·cos ' + fmt(state.t1 + state.t2, 0) + '° <i>=</i> <b>' + fmt(f.tool[0], 2) + ' cm</b></p>';
      out += '<p class="eq">y <i>=</i> L1·sin θ1 + L2·sin(θ1+θ2)</p>';
      out += '<p class="eq dim">  <i>=</i> ' + fmt(l1, 1) + '·sin ' + fmt(state.t1, 0) + '° + ' + fmt(l2, 1) + '·sin ' + fmt(state.t1 + state.t2, 0) + '° <i>=</i> <b>' + fmt(f.tool[1], 2) + ' cm</b></p>';
    } else if (!state.target) {
      out = '<p class="dim">Pick a point in the workspace.</p>';
    } else {
      var x = state.target[0], y = state.target[1], s = inverse(x, y, state.elbowUp);
      out += '<p class="eq">target <i>=</i> (' + fmt(x, 2) + ', ' + fmt(y, 2) + ') cm</p>';
      out += '<p class="eq">cos θ2 <i>=</i> (x² + y² − L1² − L2²) / (2·L1·L2) <i>=</i> <b>' + fmt(s.c2, 3) + '</b></p>';
      if (!s.reach) {
        out += '<p>|cos θ2| is bigger than 1, so no angle gives it: the point is <b>out of reach</b>. The dashed ring is everything this arm can touch.</p>';
      } else {
        out += '<p class="eq">θ2 <i>=</i> ' + (state.elbowUp ? '−' : '+') + 'acos(' + fmt(s.c2, 3) + ') <i>=</i> <b>' + fmt(s.t2, 1) + '°</b></p>';
        out += '<p class="eq wrap">θ1 <i>=</i> atan2(y, x) − atan2(L2·sin θ2, L1 + L2·cos θ2) <i>=</i> <b>' + fmt(s.t1, 1) + '°</b></p>';
      }
    }
    A.el('math').innerHTML = out;
  }

  function sliders() {
    A.el('t1').value = state.t1; A.el('t2').value = state.t2;
    A.el('t1Out').textContent = fmt(state.t1, 0) + '°';
    A.el('t2Out').textContent = fmt(state.t2, 0) + '°';
    A.el('l1Out').textContent = fmt(state.l1, 1) + ' cm';
    A.el('l2Out').textContent = fmt(state.l2, 1) + ' cm';
    var inv = state.mode === 'inverse';
    A.el('t1').disabled = A.el('t2').disabled = inv;
    A.el('rowT1').style.opacity = A.el('rowT2').style.opacity = inv ? '.55' : '';
  }

  // The drawn arm glides to the new angles instead of jumping.
  var anim = null;
  function glide() {
    if (anim) return;
    var still = A.reducedMotion();
    (function step() {
      var dt1 = state.t1 - state.shown.t1, dt2 = state.t2 - state.shown.t2;
      if (still || (Math.abs(dt1) < 0.2 && Math.abs(dt2) < 0.2)) { state.shown.t1 = state.t1; state.shown.t2 = state.t2; anim = null; record(); draw(); return; }
      state.shown.t1 += dt1 * 0.2; state.shown.t2 += dt2 * 0.2;
      record();
      draw();
      anim = requestAnimationFrame(step);
    })();
  }
  function record() {
    var tool = forward(state.shown.t1, state.shown.t2).tool;
    state.trail.push(tool);
    if (state.trail.length > 90) state.trail.shift();
  }

  function refresh(animate) { sliders(); math(); if (animate) glide(); else { state.shown.t1 = state.t1; state.shown.t2 = state.t2; draw(); } }

  function solveTarget() {
    if (!state.target) return;
    var s = inverse(state.target[0], state.target[1], state.elbowUp);
    if (s.reach) { state.t1 = s.t1; state.t2 = s.t2; }
    refresh(true);
  }

  function setMode(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    play('select');
    A.el('modeForward').setAttribute('aria-selected', mode === 'forward' ? 'true' : 'false');
    A.el('modeInverse').setAttribute('aria-selected', mode === 'inverse' ? 'true' : 'false');
    A.el('modeKicker').textContent = mode === 'forward' ? 'Forward kinematics' : 'Inverse kinematics';
    A.el('hint').textContent = mode === 'forward' ? 'Move the angles with the sliders.' : 'Click or drag anywhere in the workspace.';
    A.el('elbow').hidden = mode !== 'inverse';
    if (mode === 'inverse' && !state.target) state.target = forward(state.t1, state.t2).tool;
    narrate();
    refresh(false);
  }

  A.el('modeForward').addEventListener('click', function () { setMode('forward'); });
  A.el('modeInverse').addEventListener('click', function () { setMode('inverse'); });
  A.el('elbow').addEventListener('click', function () {
    state.elbowUp = !state.elbowUp;
    A.el('elbow').textContent = state.elbowUp ? 'Switch to elbow down' : 'Switch to elbow up';
    play('move');
    solveTarget();
  });
  ['t1', 't2'].forEach(function (k) {
    A.el(k).addEventListener('input', function () { state[k] = Number(A.el(k).value); refresh(false); record(); });
  });
  ['l1', 'l2'].forEach(function (k) {
    A.el(k).addEventListener('input', function () {
      state[k] = Number(A.el(k).value);
      state.trail = [];
      if (state.mode === 'inverse') solveTarget(); else refresh(false);
    });
  });

  // Picking a point: click or drag in inverse mode.
  var svg = A.el('arm'), dragging = false;
  function pointFrom(e) {
    var r = svg.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width * 680, py = (e.clientY - r.top) / r.height * 420;
    return toWorld(px, py);
  }
  svg.addEventListener('pointerdown', function (e) {
    if (state.mode !== 'inverse') setMode('inverse');
    dragging = true;
    svg.setPointerCapture(e.pointerId);
    state.target = pointFrom(e);
    play('move');
    solveTarget();
  });
  svg.addEventListener('pointermove', function (e) { if (!dragging) return; state.target = pointFrom(e); solveTarget(); });
  svg.addEventListener('pointerup', function () { dragging = false; });

  narrate();
  refresh(false);
})();
