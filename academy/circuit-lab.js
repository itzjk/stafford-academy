// Circuit Lab: Ohm walks you through nodal analysis of a DC circuit, one
// step at a time, lighting up on the schematic whatever the step talks about:
// the reference node, the unknowns, every current leaving a node with its
// sign, the system of equations, the solution and the real currents.
// Any part can be clicked to change its value by hand; everything is solved
// again on the spot.
(function () {
  'use strict';

  var A = window.Academy;
  if (!A) return;
  A.stars();
  if (window.Arcade) { window.Arcade.soundButton(); window.Arcade.avatarCorner(); }

  var SVG = 'http://www.w3.org/2000/svg';
  function play(name) { if (window.Arcade) window.Arcade.play(name); }

  // ---------- circuits ----------
  // Node '0' is the reference. Every part joins n[0] to n[1] and its path is
  // drawn from n[0] to n[1]; `at` picks the segment that carries the symbol.
  // A voltage source has its + terminal on n[0] and its - terminal on '0'.
  // A current source pushes `value` mA from n[0] into n[1].
  // Resistances are in kΩ, so V / kΩ gives mA.
  var PRESETS = [
    {
      id: 'divider', name: 'Divider + load',
      nodes: { S: [80, 60], A: [320, 60], B: [560, 60] },
      rail: [[80, 300], [560, 300]], ground: [320, 300],
      parts: [
        { id: 'V1', kind: 'V', n: ['S', '0'], value: 12, path: [[80, 60], [80, 300]] },
        { id: 'R1', kind: 'R', n: ['S', 'A'], value: 2, path: [[80, 60], [320, 60]] },
        { id: 'R2', kind: 'R', n: ['A', '0'], value: 4, path: [[320, 60], [320, 300]] },
        { id: 'R3', kind: 'R', n: ['A', 'B'], value: 2, path: [[320, 60], [560, 60]] },
        { id: 'R4', kind: 'R', n: ['B', '0'], value: 4, path: [[560, 60], [560, 300]] }
      ]
    },
    {
      id: 'source', name: 'With a current source',
      nodes: { S: [70, 60], A: [280, 60], B: [490, 60] },
      rail: [[70, 300], [590, 300]], ground: [330, 300],
      parts: [
        { id: 'V1', kind: 'V', n: ['S', '0'], value: 10, path: [[70, 60], [70, 300]] },
        { id: 'R1', kind: 'R', n: ['S', 'A'], value: 1, path: [[70, 60], [280, 60]] },
        { id: 'R2', kind: 'R', n: ['A', '0'], value: 2, path: [[280, 60], [280, 300]] },
        { id: 'R3', kind: 'R', n: ['A', 'B'], value: 1, path: [[280, 60], [490, 60]] },
        { id: 'R4', kind: 'R', n: ['B', '0'], value: 2, path: [[490, 60], [490, 300]] },
        { id: 'I1', kind: 'I', n: ['0', 'B'], value: 2, path: [[590, 300], [590, 60], [490, 60]], at: 0 }
      ]
    },
    {
      id: 'bridge', name: 'Wheatstone bridge',
      nodes: { S: [340, 28], A: [140, 190], B: [540, 190] },
      rail: null, ground: [340, 326],
      parts: [
        { id: 'V1', kind: 'V', n: ['S', '0'], value: 9, path: [[340, 28], [40, 28], [40, 326], [340, 326]], at: 1 },
        { id: 'R1', kind: 'R', n: ['S', 'A'], value: 1, path: [[340, 28], [140, 190]] },
        { id: 'R2', kind: 'R', n: ['S', 'B'], value: 2, path: [[340, 28], [540, 190]] },
        { id: 'R3', kind: 'R', n: ['A', '0'], value: 2, path: [[140, 190], [340, 326]] },
        { id: 'R4', kind: 'R', n: ['B', '0'], value: 1, path: [[540, 190], [340, 326]] },
        { id: 'R5', kind: 'R', n: ['A', 'B'], value: 3, path: [[140, 190], [540, 190]] }
      ]
    }
  ];

  var UNIT = { R: 'kΩ', V: 'V', I: 'mA' };
  var state = { preset: null, parts: [], step: 0, steps: [], solved: null, edited: false };

  // ---------- numbers ----------

  function fmt(x, digits) {
    if (!isFinite(x)) return '?';
    var r = Number(x.toFixed(digits == null ? 2 : digits));
    return (Object.is(r, -0) ? 0 : r).toString();
  }
  function ohms(k) { return k >= 1 ? fmt(k, 2) + ' kΩ' : fmt(k * 1000, 0) + ' Ω'; }
  function valueText(p) { return p.kind === 'R' ? ohms(p.value) : fmt(p.value, 2) + ' ' + UNIT[p.kind]; }

  // ---------- nodal analysis ----------

  function solve(parts) {
    var fixed = { '0': 0 };
    parts.forEach(function (p) { if (p.kind === 'V' && p.n[1] === '0') fixed[p.n[0]] = p.value; });
    var names = Object.keys(state.preset.nodes).filter(function (n) { return !(n in fixed); });
    var idx = {};
    names.forEach(function (n, i) { idx[n] = i; });
    var size = names.length;
    var G = names.map(function () { var row = []; for (var i = 0; i < size; i++) row.push(0); return row; });
    var rhs = names.map(function () { return 0; });
    parts.forEach(function (p) {
      if (p.kind === 'R') {
        var g = 1 / p.value;
        [[p.n[0], p.n[1]], [p.n[1], p.n[0]]].forEach(function (pair) {
          var me = pair[0], other = pair[1];
          if (!(me in idx)) return;
          G[idx[me]][idx[me]] += g;
          if (other in idx) G[idx[me]][idx[other]] -= g;
          else rhs[idx[me]] += g * fixed[other];
        });
      } else if (p.kind === 'I') {
        if (p.n[1] in idx) rhs[idx[p.n[1]]] += p.value;
        if (p.n[0] in idx) rhs[idx[p.n[0]]] -= p.value;
      }
    });
    // Gaussian elimination with partial pivoting.
    var M = G.map(function (row, i) { return row.concat([rhs[i]]); });
    for (var c = 0; c < size; c++) {
      var best = c;
      for (var r = c + 1; r < size; r++) if (Math.abs(M[r][c]) > Math.abs(M[best][c])) best = r;
      var tmp = M[c]; M[c] = M[best]; M[best] = tmp;
      if (Math.abs(M[c][c]) < 1e-12) return null;
      for (var r2 = 0; r2 < size; r2++) {
        if (r2 === c) continue;
        var f = M[r2][c] / M[c][c];
        for (var k = c; k <= size; k++) M[r2][k] -= f * M[c][k];
      }
    }
    var V = {};
    Object.keys(fixed).forEach(function (n) { V[n] = fixed[n]; });
    names.forEach(function (n, i) { V[n] = M[i][size] / M[i][i]; });
    return { fixed: fixed, unknowns: names, G: G, rhs: rhs, V: V };
  }

  // ---------- drawing ----------

  function el(tag, attrs, parent) {
    var n = document.createElementNS(SVG, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }
  function nodeAt(name) { return name === '0' ? state.preset.ground : state.preset.nodes[name]; }
  function vName(n) { return n === '0' ? '0' : 'V<sub>' + n + '</sub>'; }

  // The segment of a part that touches `node`, pointed away from it.
  function segmentFrom(p, node) {
    var pts = p.path;
    if (p.n[0] === node) return [pts[0], pts[1]];
    return [pts[pts.length - 1], pts[pts.length - 2]];
  }

  // The side of a segment where its name and value go. Arrows go on the other side.
  function normalFor(P, Q) {
    var dx = Q[0] - P[0], dy = Q[1] - P[1], len = Math.hypot(dx, dy) || 1;
    var nx = dy / len, ny = -dx / len;
    var diagonal = Math.abs(dx) > 1 && Math.abs(dy) > 1;
    if (diagonal) {
      var c = centre(), mx = (P[0] + Q[0]) / 2, my = (P[1] + Q[1]) / 2;
      if ((mx + nx - c[0]) * nx + (my + ny - c[1]) * ny < 0) { nx = -nx; ny = -ny; }
    } else if (ny > 0.1 || (Math.abs(ny) <= 0.1 && nx < 0)) { nx = -nx; ny = -ny; }
    return [nx, ny];
  }
  function centre() {
    var pts = Object.keys(state.preset.nodes).map(function (n) { return state.preset.nodes[n]; }).concat([state.preset.ground]);
    return [pts.reduce(function (s, p) { return s + p[0]; }, 0) / pts.length, pts.reduce(function (s, p) { return s + p[1]; }, 0) / pts.length];
  }

  function arrow(parent, from, to, at, label, cls) {
    var dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy) || 1;
    var ux = dx / len, uy = dy / len;
    var cx = from[0] + ux * len * at, cy = from[1] + uy * len * at;
    var g = el('g', { class: 'lab-arrow ' + (cls || '') }, parent);
    var nrm = normalFor(from, to), side = [-nrm[0], -nrm[1]];
    var off = /is-real/.test(cls || '') ? 26 : 16;
    var ox = cx + side[0] * off, oy = cy + side[1] * off;
    el('line', { x1: ox - ux * 16, y1: oy - uy * 16, x2: ox + ux * 16, y2: oy + uy * 16 }, g);
    el('path', { d: 'M' + (ox + ux * 16) + ' ' + (oy + uy * 16) + ' l' + (-ux * 9 + side[0] * 6) + ' ' + (-uy * 9 + side[1] * 6) + ' M' + (ox + ux * 16) + ' ' + (oy + uy * 16) + ' l' + (-ux * 9 - side[0] * 6) + ' ' + (-uy * 9 - side[1] * 6) }, g);
    if (label) {
      var t = el('text', { x: ox + side[0] * 18, y: oy + side[1] * 18 + 4, 'text-anchor': 'middle' }, g);
      t.textContent = label;
    }
  }

  function drawSymbol(g, p, seg) {
    var P = seg[0], Q = seg[1];
    var dx = Q[0] - P[0], dy = Q[1] - P[1], len = Math.hypot(dx, dy);
    var mx = (P[0] + Q[0]) / 2, my = (P[1] + Q[1]) / 2;
    var half = p.kind === 'R' ? 30 : p.kind === 'V' ? 14 : 20;
    var ux = dx / len, uy = dy / len;
    el('line', { x1: P[0], y1: P[1], x2: mx - ux * half, y2: my - uy * half, class: 'lab-wire' }, g);
    el('line', { x1: mx + ux * half, y1: my + uy * half, x2: Q[0], y2: Q[1], class: 'lab-wire' }, g);
    var s = el('g', { transform: 'translate(' + mx + ' ' + my + ') rotate(' + (Math.atan2(dy, dx) * 180 / Math.PI) + ')', class: 'lab-symbol' }, g);
    if (p.kind === 'R') {
      el('polyline', { points: '-30,0 -24,-10 -14,10 -4,-10 6,10 16,-10 24,8 30,0' }, s);
    } else if (p.kind === 'V') {
      el('line', { x1: -14, y1: 0, x2: -5, y2: 0 }, s);
      el('line', { x1: 5, y1: 0, x2: 14, y2: 0 }, s);
      el('line', { x1: -5, y1: -18, x2: -5, y2: 18, class: 'lab-plate' }, s);
      el('line', { x1: 5, y1: -10, x2: 5, y2: 10, class: 'lab-plate is-short' }, s);
      var plus = el('text', { x: mx - ux * 14 + (-uy) * -26, y: my - uy * 14 + ux * -26 + 5, 'text-anchor': 'middle', class: 'lab-plus' }, g);
      plus.textContent = '+';
    } else {
      el('circle', { cx: 0, cy: 0, r: 20 }, s);
      el('line', { x1: -10, y1: 0, x2: 9, y2: 0 }, s);
      el('path', { d: 'M9 0 l-7 -6 M9 0 l-7 6' }, s);
    }
    el('line', { x1: mx - ux * half, y1: my - uy * half, x2: mx + ux * half, y2: my + uy * half, class: 'lab-hit' }, g);
    // The name and value sit beside the symbol.
    var nrm = normalFor(P, Q), nx = nrm[0], ny = nrm[1];
    var label = el('text', { x: mx + nx * 34, y: my + ny * 34 + 5, 'text-anchor': Math.abs(nx) > 0.6 ? (nx > 0 ? 'start' : 'end') : 'middle', class: 'lab-label' }, g);
    var b = document.createElementNS(SVG, 'tspan');
    b.setAttribute('class', 'lab-label-id');
    b.textContent = p.id + ' ';
    label.appendChild(b);
    label.appendChild(document.createTextNode(valueText(p)));
  }

  function draw() {
    var svg = A.el('schematic');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var step = state.steps[state.step] || {};
    var hot = step.parts || [];
    var hotNodes = step.nodes || [];
    var pre = state.preset;

    if (pre.rail) {
      el('line', { x1: pre.rail[0][0], y1: pre.rail[0][1], x2: pre.rail[1][0], y2: pre.rail[1][1], class: 'lab-wire lab-node-0' + (hotNodes.indexOf('0') >= 0 ? ' is-hot' : '') }, svg);
    }
    var gx = pre.ground[0], gy = pre.ground[1];
    var gnd = el('g', { class: 'lab-ground' + (hotNodes.indexOf('0') >= 0 ? ' is-hot' : '') }, svg);
    el('line', { x1: gx, y1: gy, x2: gx, y2: gy + 14 }, gnd);
    el('line', { x1: gx - 18, y1: gy + 14, x2: gx + 18, y2: gy + 14 }, gnd);
    el('line', { x1: gx - 11, y1: gy + 21, x2: gx + 11, y2: gy + 21 }, gnd);
    el('line', { x1: gx - 4, y1: gy + 28, x2: gx + 4, y2: gy + 28 }, gnd);
    var gl = el('text', { x: gx + 26, y: gy + 26, class: 'lab-node-label' }, gnd);
    gl.textContent = '0 V';

    state.parts.forEach(function (p) {
      var g = el('g', { class: 'lab-part' + (hot.indexOf(p.id) >= 0 ? ' is-hot' : hot.length ? ' is-dim' : ''), 'data-id': p.id, tabindex: '0', role: 'button', 'aria-label': p.id + ', ' + valueText(p) + '. Change value' }, svg);
      var at = p.at || 0;
      for (var i = 0; i < p.path.length - 1; i++) {
        if (i === at) drawSymbol(g, p, [p.path[i], p.path[i + 1]]);
        else el('line', { x1: p.path[i][0], y1: p.path[i][1], x2: p.path[i + 1][0], y2: p.path[i + 1][1], class: 'lab-wire' }, g);
      }
    });

    Object.keys(pre.nodes).forEach(function (n) {
      var at = pre.nodes[n];
      var isFixed = state.solved && n in state.solved.fixed;
      var g = el('g', { class: 'lab-node' + (hotNodes.indexOf(n) >= 0 ? ' is-hot' : '') + (isFixed ? ' is-fixed' : '') }, svg);
      el('circle', { cx: at[0], cy: at[1], r: 6 }, g);
      // A node at the very top keeps its labels beside it, inside the drawing.
      var top = at[1] < 50;
      var t = el('text', { x: at[0] + (top ? 14 : 10), y: top ? at[1] + 6 : at[1] - 14, class: 'lab-node-label' }, g);
      t.textContent = n;
      if (step.showV && state.solved) {
        var v = el('text', { x: at[0] + (top ? 32 : 10), y: top ? at[1] + 6 : at[1] - 32, class: 'lab-node-v' }, g);
        v.textContent = fmt(state.solved.V[n], 2) + ' V';
      }
    });

    (step.arrows || []).forEach(function (a) { arrow(svg, a.from, a.to, a.at || 0.3, a.label, a.cls); });
  }

  // ---------- the steps ----------

  function termFor(p, node) {
    var other = p.n[0] === node ? p.n[1] : p.n[0];
    var fixed = state.solved.fixed;
    var o = other in fixed ? fmt(fixed[other], 2) : vName(other);
    var top = other === '0' ? vName(node) : '(' + vName(node) + ' − ' + o + ')';
    return { html: '<span class="t" data-part="' + p.id + '">' + top + ' / ' + ohms(p.value).replace(' ', '&nbsp;') + '</span>', part: p.id };
  }

  function buildSteps() {
    var s = state.solved, parts = state.parts, steps = [];
    var fixedNames = Object.keys(s.fixed).filter(function (n) { return n !== '0'; });
    var sources = parts.filter(function (p) { return p.kind === 'V'; });
    steps.push({
      title: 'Pick a reference node',
      text: 'This is the reference node: **0 V**. Every voltage in the circuit is measured against it. Pick the node that most parts touch, usually the bottom rail.',
      nodes: ['0'], parts: []
    });
    steps.push({
      title: 'Name the node voltages',
      text: (fixedNames.length ? 'Node ' + fixedNames.join(', ') + ' is held at ' + fixedNames.map(function (n) { return fmt(s.fixed[n], 2) + ' V'; }).join(', ') + ' by the source, so it is not an unknown. ' : '') +
        'That leaves **' + s.unknowns.map(function (n) { return 'V' + n; }).join('** and **') + '**. One unknown, one equation: we need ' + s.unknowns.length + '.',
      nodes: s.unknowns.slice(), parts: sources.map(function (p) { return p.id; }),
      math: '<p>Unknowns: ' + s.unknowns.map(vName).join(', ') + '</p>' + (fixedNames.length ? '<p class="dim">Known: ' + fixedNames.map(function (n) { return vName(n) + ' = ' + fmt(s.fixed[n], 2) + ' V'; }).join(', ') + '</p>' : '')
    });
    s.unknowns.forEach(function (node, k) {
      var touching = parts.filter(function (p) { return p.n.indexOf(node) >= 0 && p.kind !== 'V'; });
      var terms = [], arrows = [], extra = [];
      touching.forEach(function (p) {
        var seg = segmentFrom(p, node);
        if (p.kind === 'R') {
          terms.push(termFor(p, node).html);
          arrows.push({ from: seg[0], to: seg[1], at: 0.28, label: 'i ' + p.id, cls: 'is-leaving' });
        } else {
          var into = p.n[1] === node;
          extra.push((into ? '' : '−') + fmt(p.value, 2) + '&nbsp;mA');
          arrows.push({ from: into ? seg[1] : seg[0], to: into ? seg[0] : seg[1], at: into ? 0.5 : 0.28, label: fmt(p.value, 2) + ' mA', cls: 'is-source' });
        }
      });
      var cs = touching.filter(function (p) { return p.kind === 'I'; });
      steps.push({
        title: 'KCL at node ' + node,
        text: k === 0
          ? 'Add up every current **leaving ' + node + '** and set the sum to zero. Leaving means: this node minus the other end, over the resistance. If one comes out negative, that current simply flows the other way, so you never have to guess directions.'
          : 'Same rule at **' + node + '**: every current leaving it, this node minus the other end, over the resistance.' + (cs.length ? ' The source pushes **' + fmt(cs[0].value, 2) + ' mA** into ' + node + ', so it goes on the right side.' : ''),
        nodes: [node], parts: touching.map(function (p) { return p.id; }), arrows: arrows,
        math: '<p class="eq">' + terms.join(' <i>+</i> ') + ' <i>=</i> ' + (extra.length ? extra.join(' + ') : '0') + '</p>'
      });
    });
    var rows = s.unknowns.map(function (n, i) {
      var parts2 = s.unknowns.map(function (m, j) {
        var c = s.G[i][j];
        if (Math.abs(c) < 1e-12) return '';
        return (c < 0 ? ' − ' : (j ? ' + ' : '')) + fmt(Math.abs(c), 3) + '·' + vName(m);
      }).join('');
      return '<p class="eq">' + parts2 + ' <i>=</i> ' + fmt(s.rhs[i], 3) + '&nbsp;mA</p>';
    }).join('');
    steps.push({
      title: 'Build the system',
      text: 'Group the terms of each unknown. The number in front of each voltage is a **conductance**, 1/R in mS, and everything the known voltages and sources add moves to the right.',
      nodes: s.unknowns.slice(), parts: [], math: rows
    });
    steps.push({
      title: 'Solve it',
      text: s.unknowns.length + (s.unknowns.length === 1 ? ' equation' : ' equations') + ', ' + s.unknowns.length + (s.unknowns.length === 1 ? ' unknown' : ' unknowns') + '. Solve them and every node has its voltage. Look at the schematic: each node now shows it.',
      nodes: s.unknowns.slice(), parts: [], showV: true,
      math: s.unknowns.map(function (n) { return '<p class="eq big">' + vName(n) + ' <i>=</i> ' + fmt(s.V[n], 3) + '&nbsp;V</p>'; }).join('')
    });
    var currents = [], arrows2 = [];
    parts.forEach(function (p) {
      if (p.kind !== 'R') return;
      var i = (s.V[p.n[0]] - s.V[p.n[1]]) / p.value;
      var flow = i >= 0 ? [p.n[0], p.n[1]] : [p.n[1], p.n[0]];
      var seg = segmentFrom(p, flow[0]);
      arrows2.push({ from: seg[0], to: seg[1], at: 0.5, label: fmt(Math.abs(i), 2) + ' mA', cls: 'is-real' });
      currents.push('<p><span class="t" data-part="' + p.id + '">i<sub>' + p.id + '</sub></span> = (' + fmt(s.V[p.n[0]], 2) + ' − ' + fmt(s.V[p.n[1]], 2) + ') / ' + ohms(p.value) + ' = <b>' + fmt(i, 3) + ' mA</b></p>');
    });
    steps.push({
      title: 'Check every current',
      text: 'Now each branch current is just a voltage difference over a resistance. The arrows show where it really flows. At every node, what comes in equals what goes out.',
      nodes: [], parts: parts.filter(function (p) { return p.kind === 'R'; }).map(function (p) { return p.id; }), showV: true, arrows: arrows2,
      math: currents.join('')
    });
    return steps;
  }

  // ---------- page ----------

  var ohm = window.Cast ? window.Cast.card('voltio') : { name: 'Ohm', face: 'cast/voltio.webp' };
  A.el('face').src = ohm.face;
  var finishTyping = null;

  function paintStep(animate) {
    var step = state.steps[state.step];
    A.el('stepKicker').textContent = 'Step ' + (state.step + 1) + ' of ' + state.steps.length;
    if (animate && window.Arcade) window.Arcade.decode(A.el('stepTitle'), step.title);
    else A.el('stepTitle').textContent = step.title;
    var say = A.el('stepText');
    A.clear(say);
    var b = document.createElement('b');
    b.textContent = ohm.name + ': ';
    say.appendChild(b);
    var words = document.createElement('span');
    A.inline(words, step.text);
    say.appendChild(words);
    if (finishTyping) finishTyping();
    finishTyping = animate && A.typewrite ? A.typewrite(words, 12, function () { finishTyping = null; }) : null;
    A.el('math').innerHTML = step.math || '';
    var dots = A.el('dots');
    A.clear(dots);
    state.steps.forEach(function (_, i) { var d = document.createElement('i'); if (i <= state.step) d.className = 'is-on'; dots.appendChild(d); });
    A.el('prevBtn').disabled = state.step === 0;
    var last = state.step === state.steps.length - 1;
    A.el('nextBtn').textContent = last ? 'Start again ↺' : 'Next step ›';
    draw();
  }

  function go(to) {
    var n = state.steps.length;
    var next = (to + n) % n;
    if (next === state.step) return;
    state.step = next;
    play(next === n - 1 ? 'pass' : 'move');
    paintStep(true);
  }

  function recompute(keepStep) {
    state.solved = solve(state.parts);
    if (!state.solved) {
      A.el('stepTitle').textContent = 'This circuit has no single answer';
      A.el('stepText').textContent = 'With these values the equations do not pin the voltages down. Change a value back.';
      A.el('math').innerHTML = '';
      draw();
      return;
    }
    state.steps = buildSteps();
    if (!keepStep) state.step = 0;
    state.step = Math.min(state.step, state.steps.length - 1);
    paintStep(!keepStep);
  }

  function load(preset) {
    state.preset = preset;
    state.parts = preset.parts.map(function (p) { return Object.assign({}, p); });
    state.edited = false;
    A.el('edited').hidden = true;
    A.el('resetBtn').hidden = true;
    Array.prototype.forEach.call(A.el('presets').children, function (b) { b.setAttribute('aria-selected', b.getAttribute('data-id') === preset.id ? 'true' : 'false'); });
    recompute(false);
  }

  PRESETS.forEach(function (p) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'lab-chip';
    b.setAttribute('role', 'tab');
    b.setAttribute('data-id', p.id);
    b.textContent = p.name;
    b.addEventListener('click', function () { if (state.preset !== p) { play('select'); load(p); } });
    A.el('presets').appendChild(b);
  });

  A.el('prevBtn').addEventListener('click', function () { go(state.step - 1); });
  A.el('nextBtn').addEventListener('click', function () { go(state.step + 1); });
  A.el('resetBtn').addEventListener('click', function () { play('select'); load(state.preset); });

  // ---------- changing a value by hand ----------

  var editing = null;
  var editor = A.el('editor'), input = A.el('editValue');
  function openEditor(id, x, y) {
    var p = state.parts.filter(function (q) { return q.id === id; })[0];
    if (!p) return;
    editing = p;
    A.el('editLabel').textContent = p.id + (p.kind === 'R' ? ' resistance' : p.kind === 'V' ? ' voltage' : ' current');
    A.el('editUnit').textContent = UNIT[p.kind];
    input.value = fmt(p.value, 3);
    editor.hidden = false;
    var w = editor.offsetWidth, h = editor.offsetHeight;
    editor.style.left = Math.max(12, Math.min(innerWidth - w - 12, x - w / 2)) + 'px';
    editor.style.top = Math.max(70, Math.min(innerHeight - h - 12, y + 16)) + 'px';
    input.focus();
    input.select();
  }
  function closeEditor() { editor.hidden = true; editing = null; }
  function applyEdit() {
    if (!editing) return;
    var v = Number(String(input.value).replace(',', '.').trim());
    if (!isFinite(v) || (editing.kind === 'R' && v <= 0) || (editing.kind !== 'R' && v === 0)) { input.classList.add('is-bad'); return; }
    input.classList.remove('is-bad');
    editing.value = v;
    closeEditor();
    state.edited = true;
    A.el('edited').hidden = false;
    A.el('resetBtn').hidden = false;
    play('select');
    recompute(true);
  }
  A.el('schematic').addEventListener('click', function (e) {
    var g = e.target.closest && e.target.closest('.lab-part');
    if (g) openEditor(g.getAttribute('data-id'), e.clientX, e.clientY);
  });
  A.el('schematic').addEventListener('keydown', function (e) {
    var g = e.target.closest && e.target.closest('.lab-part');
    if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); var r = g.getBoundingClientRect(); openEditor(g.getAttribute('data-id'), r.left + r.width / 2, r.top + r.height / 2); }
  });
  A.el('editOk').addEventListener('click', applyEdit);
  A.el('editCancel').addEventListener('click', closeEditor);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') applyEdit(); if (e.key === 'Escape') closeEditor(); });
  document.addEventListener('click', function (e) { if (!editor.hidden && !editor.contains(e.target) && !(e.target.closest && e.target.closest('.lab-part'))) closeEditor(); });

  // Hovering a term of an equation lights up its part.
  A.el('math').addEventListener('mouseover', function (e) {
    var t = e.target.closest && e.target.closest('[data-part]');
    Array.prototype.forEach.call(document.querySelectorAll('.lab-part'), function (g) { g.classList.toggle('is-pointed', !!t && g.getAttribute('data-id') === t.getAttribute('data-part')); });
  });
  A.el('math').addEventListener('mouseleave', function () {
    Array.prototype.forEach.call(document.querySelectorAll('.lab-part.is-pointed'), function (g) { g.classList.remove('is-pointed'); });
  });

  document.addEventListener('keydown', function (e) {
    if (!editor.hidden || /INPUT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(state.step + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(state.step - 1); }
  });

  var wanted = A.param('circuit');
  load(PRESETS.filter(function (p) { return p.id === wanted; })[0] || PRESETS[0]);
})();
