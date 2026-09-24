// Shared helpers for every page: storage, progress, course loading, the
// animated star field and a tiny Markdown renderer for lesson text.
(function (root) {
  'use strict';

  var IN_EXTENSION = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  var PROGRESS_KEY = 'stafford.progress';

  var Academy = {};

  Academy.el = function (id) { return document.getElementById(id); };
  Academy.clear = function (node) { while (node && node.firstChild) node.removeChild(node.firstChild); };

  Academy.param = function (name) {
    try { return new URLSearchParams(location.search).get(name) || ''; } catch (e) { return ''; }
  };

  Academy.reducedMotion = function () {
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  };

  // ---------- progress ----------
  // Shape: { xp, courses: { [courseId]: { done: [lessonId] } }, last: { course, lesson, at } }

  Academy.loadProgress = function () {
    return new Promise(function (resolve) {
      if (!IN_EXTENSION || !chrome.storage) {
        try { resolve(JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}')); } catch (e) { resolve({}); }
        return;
      }
      try { chrome.storage.local.get(PROGRESS_KEY, function (r) { resolve((r && r[PROGRESS_KEY]) || {}); }); }
      catch (e) { resolve({}); }
    });
  };

  Academy.saveProgress = function (progress) {
    return new Promise(function (resolve) {
      if (!IN_EXTENSION || !chrome.storage) {
        try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch (e) {}
        resolve(true);
        return;
      }
      var o = {};
      o[PROGRESS_KEY] = progress;
      try { chrome.storage.local.set(o, function () { resolve(true); }); } catch (e) { resolve(false); }
    });
  };

  Academy.levelFor = function (xp) {
    var level = 1, needed = 100, rest = Number(xp) || 0;
    while (rest >= needed) { rest -= needed; level++; needed = Math.round(needed * 1.35); }
    return { level: level, into: rest, toNext: needed };
  };

  Academy.paintXp = function (progress) {
    var xp = Number(progress && progress.xp || 0);
    var lv = Academy.levelFor(xp);
    var levelEl = Academy.el('barLevel'), textEl = Academy.el('barXpText'), fillEl = Academy.el('barXpFill');
    if (levelEl) levelEl.textContent = 'LV ' + lv.level;
    if (textEl) textEl.textContent = xp.toLocaleString('en-US') + ' XP';
    if (fillEl) requestAnimationFrame(function () { fillEl.style.width = Math.round((lv.into / lv.toNext) * 100) + '%'; });
  };

  Academy.doneIn = function (progress, courseId) {
    var c = (progress.courses || {})[courseId];
    return (c && Array.isArray(c.done)) ? c.done : [];
  };

  // Returns false when the lesson was already done, so XP is only paid once.
  Academy.markDone = function (progress, courseId, lessonId, xp) {
    progress.courses = progress.courses || {};
    progress.courses[courseId] = progress.courses[courseId] || { done: [] };
    var done = progress.courses[courseId].done;
    if (done.indexOf(lessonId) >= 0) return false;
    done.push(lessonId);
    progress.xp = (Number(progress.xp) || 0) + (Number(xp) || 0);
    return true;
  };

  // ---------- courses ----------

  // Paths are relative to the page, and every page that loads a course lives
  // in the academy/ folder next to courses/.
  Academy.loadCourse = function (id) {
    return fetch('courses/' + encodeURIComponent(id) + '.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) return { error: 'missing', status: r.status };
        return r.json().catch(function () { return { error: 'unreadable' }; });
      })
      .catch(function () { return { error: 'blocked' }; });
  };

  Academy.isCourse = function (course) {
    return !!(course && !course.error && Array.isArray(course.chapters));
  };

  Academy.whyNoCourse = function (course) {
    var e = course && course.error;
    if (e === 'missing') return 'This course does not exist yet.';
    if (e === 'unreadable') return 'The course file is there but its contents could not be read.';
    if (e === 'blocked') return 'The course file could not be read. Open the academy from the Stafford Academy button in the browser toolbar.';
    return 'The course file loaded but it has no chapters in it.';
  };

  Academy.allLessons = function (course) {
    var out = [];
    (course.chapters || []).forEach(function (chapter) {
      (chapter.lessons || []).forEach(function (lesson) { out.push({ chapter: chapter, lesson: lesson }); });
    });
    return out;
  };

  // ---------- star field ----------
  // Three parallax layers of twinkling stars, shooting stars, drifting
  // satellites and the occasional rocket with a smoke trail.

  Academy.stars = function () {
    var canvas = Academy.el('stars');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var still = Academy.reducedMotion();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var layers = [], meteors = [], satellites = [], rockets = [], smoke = [];
    var mouseX = 0, mouseY = 0, followX = 0, followY = 0;
    var t = 0, meteorClock = 0, nextMeteor = 700, rocketClock = 0, nextRocket = 1800;

    var PLAN = [
      { count: 320, size: 0.9, speed: 2.5, alpha: 0.42, parallax: 0.25 },
      { count: 190, size: 1.5, speed: 7, alpha: 0.68, parallax: 0.6 },
      { count: 70, size: 2.3, speed: 15, alpha: 1, parallax: 1.2 }
    ];

    function measure() {
      var w = canvas.clientWidth || window.innerWidth;
      var h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      layers = PLAN.map(function (p) {
        var points = [];
        for (var i = 0; i < p.count; i++) {
          points.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: (Math.random() * p.size + 0.35) * dpr,
            phase: Math.random() * Math.PI * 2,
            twinkle: Math.random() * 0.9 + 0.3
          });
        }
        return { plan: p, points: points };
      });
      satellites = [];
      for (var k = 0; k < 4; k++) {
        satellites.push({
          x: Math.random() * canvas.width,
          y: canvas.height * (0.1 + Math.random() * 0.75),
          vx: (0.18 + Math.random() * 0.28) * dpr * (k % 2 ? 1 : -1),
          angle: Math.random() * Math.PI,
          spin: 0.003 + Math.random() * 0.005,
          scale: 0.8 + Math.random() * 0.6
        });
      }
    }

    function launchMeteor() {
      var fromTop = Math.random() > 0.35;
      meteors.push({
        x: fromTop ? canvas.width * (0.25 + Math.random() * 0.8) : canvas.width * 1.05,
        y: fromTop ? -30 * dpr : canvas.height * Math.random() * 0.5,
        vx: -(4 + Math.random() * 5) * dpr,
        vy: (2.2 + Math.random() * 3) * dpr,
        life: 1,
        length: (70 + Math.random() * 90) * dpr
      });
      nextMeteor = 900 + Math.random() * 2600;
      meteorClock = 0;
    }

    function launchRocket() {
      var fromLeft = Math.random() > 0.5;
      var v = (1.6 + Math.random() * 1.2) * dpr;
      rockets.push({
        x: fromLeft ? -40 * dpr : canvas.width + 40 * dpr,
        y: canvas.height * (0.55 + Math.random() * 0.4),
        vx: fromLeft ? v : -v,
        vy: -(0.55 + Math.random() * 0.6) * dpr,
        curve: (Math.random() - 0.5) * 0.0016 * dpr,
        scale: (0.8 + Math.random() * 0.5) * dpr,
        color: ['#ff5a6e', '#ffd43b', '#7deeff', '#b7a3f2'][Math.floor(Math.random() * 4)]
      });
      nextRocket = 7000 + Math.random() * 9000;
      rocketClock = 0;
    }

    function drawRocket(r) {
      ctx.save();
      ctx.translate(r.x - followX * 30, r.y - followY * 22);
      ctx.rotate(Math.atan2(r.vy, r.vx) + Math.PI / 2);
      ctx.scale(r.scale, r.scale);
      var flame = 9 + Math.sin(t * 40) * 3;
      var fire = ctx.createLinearGradient(0, 10, 0, 12 + flame);
      fire.addColorStop(0, 'rgba(255,246,194,.95)');
      fire.addColorStop(0.5, 'rgba(255,170,60,.8)');
      fire.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = fire;
      ctx.beginPath(); ctx.moveTo(-3.5, 10); ctx.quadraticCurveTo(0, 12 + flame * 1.4, 3.5, 10); ctx.fill();
      ctx.fillStyle = r.color;
      ctx.beginPath(); ctx.moveTo(-5, 4); ctx.lineTo(-9, 12); ctx.lineTo(-4, 10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(5, 4); ctx.lineTo(9, 12); ctx.lineTo(4, 10); ctx.fill();
      ctx.fillStyle = '#eef2fa';
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.bezierCurveTo(6, -8, 6, 4, 4.5, 10); ctx.lineTo(-4.5, 10); ctx.bezierCurveTo(-6, 4, -6, -8, 0, -14); ctx.fill();
      ctx.fillStyle = r.color;
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.bezierCurveTo(3.4, -10.5, 4.4, -8, 4.8, -6); ctx.lineTo(-4.8, -6); ctx.bezierCurveTo(-4.4, -8, -3.4, -10.5, 0, -14); ctx.fill();
      ctx.fillStyle = '#3776ab';
      ctx.beginPath(); ctx.arc(0, -1, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.arc(-0.7, -1.7, 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawStars() {
      layers.forEach(function (layer) {
        var p = layer.plan;
        var drift = (t * p.speed * dpr) % canvas.width;
        layer.points.forEach(function (s, i) {
          var x = s.x - drift - followX * 26 * p.parallax;
          x = ((x % canvas.width) + canvas.width) % canvas.width;
          var y = s.y - followY * 20 * p.parallax;
          var glow = p.alpha * (0.55 + Math.sin(t * s.twinkle + s.phase) * 0.45);
          if (glow <= 0.02) return;
          ctx.globalAlpha = glow;
          ctx.fillStyle = i % 13 === 0 ? '#8fe6ff' : (i % 23 === 0 ? '#ffd2a8' : '#ffffff');
          ctx.beginPath();
          ctx.arc(x, y, s.r, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      ctx.globalAlpha = 1;
    }

    function drawMeteors() {
      for (var m = meteors.length - 1; m >= 0; m--) {
        var me = meteors[m];
        me.x += me.vx; me.y += me.vy; me.life -= 0.011;
        if (me.life <= 0 || me.y > canvas.height + 40 * dpr || me.x < -80 * dpr) { meteors.splice(m, 1); continue; }
        var tailX = me.x - me.vx * me.length / 6, tailY = me.y - me.vy * me.length / 6;
        var tail = ctx.createLinearGradient(me.x, me.y, tailX, tailY);
        tail.addColorStop(0, 'rgba(255,255,255,' + (0.9 * me.life) + ')');
        tail.addColorStop(0.35, 'rgba(150,225,255,' + (0.4 * me.life) + ')');
        tail.addColorStop(1, 'rgba(150,225,255,0)');
        ctx.strokeStyle = tail;
        ctx.lineWidth = 1.8 * dpr;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(me.x, me.y); ctx.lineTo(tailX, tailY); ctx.stroke();
        ctx.globalAlpha = me.life;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(me.x, me.y, 1.6 * dpr, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    function drawSatellites() {
      for (var q = 0; q < satellites.length; q++) {
        var s = satellites[q];
        s.x += s.vx; s.angle += s.spin;
        if (s.x > canvas.width + 40 * dpr) s.x = -40 * dpr;
        if (s.x < -40 * dpr) s.x = canvas.width + 40 * dpr;
        ctx.save();
        ctx.translate(s.x - followX * 34, s.y - followY * 26);
        ctx.rotate(s.angle);
        ctx.scale(dpr * s.scale, dpr * s.scale);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#8d939f';
        ctx.fillRect(-4, -1.5, 8, 3);
        ctx.fillStyle = '#3d434d';
        ctx.fillRect(-9, -0.8, 4, 1.6);
        ctx.fillRect(5, -0.8, 4, 1.6);
        if (Math.sin(t * 3 + q * 7) > 0.93) {
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = '#ff5a5a';
          ctx.fillRect(-0.8, -3.4, 1.6, 1.6);
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    function drawRockets() {
      for (var h = smoke.length - 1; h >= 0; h--) {
        var puff = smoke[h];
        puff.life -= 0.012; puff.r += 0.09 * dpr;
        if (puff.life <= 0) { smoke.splice(h, 1); continue; }
        ctx.globalAlpha = puff.life * 0.28;
        ctx.fillStyle = '#c9d4e8';
        ctx.beginPath(); ctx.arc(puff.x - followX * 30, puff.y - followY * 22, puff.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (var i = rockets.length - 1; i >= 0; i--) {
        var r = rockets[i];
        r.vy -= r.curve * Math.abs(r.vx);
        r.x += r.vx; r.y += r.vy;
        if (r.x < -80 * dpr || r.x > canvas.width + 80 * dpr || r.y < -80 * dpr) { rockets.splice(i, 1); continue; }
        if (Math.random() < 0.6) {
          var n = Math.hypot(r.vx, r.vy) || 1;
          smoke.push({ x: r.x - r.vx / n * 14 * r.scale, y: r.y - r.vy / n * 14 * r.scale, r: 1.6 * dpr, life: 1 });
        }
        drawRocket(r);
      }
    }

    function frame() {
      t += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      followX += (mouseX - followX) * 0.045;
      followY += (mouseY - followY) * 0.045;
      drawStars();
      meteorClock += 16;
      if (meteorClock > nextMeteor) launchMeteor();
      drawMeteors();
      drawSatellites();
      rocketClock += 16;
      if (rocketClock > nextRocket) launchRocket();
      drawRockets();
      requestAnimationFrame(frame);
    }

    measure();
    window.addEventListener('resize', measure);
    if (still) {
      PLAN.forEach(function (p) { p.speed = 0; });
      drawStars();
      return;
    }
    window.addEventListener('mousemove', function (e) {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    frame();
  };

  // ---------- lesson text ----------
  // Fenced ```code``` blocks, paragraphs, "- " lists, `inline code` and **bold**.

  Academy.markdown = function (text) {
    var frag = document.createDocumentFragment();
    var parts = [];
    var rest = String(text || '');
    var fence = /```([A-Za-z0-9_+-]*)\n([\s\S]*?)```/;
    var m;
    while ((m = fence.exec(rest))) {
      if (m.index > 0) parts.push({ kind: 'text', value: rest.slice(0, m.index) });
      parts.push({ kind: 'code', value: m[2], language: m[1] });
      rest = rest.slice(m.index + m[0].length);
    }
    if (rest) parts.push({ kind: 'text', value: rest });

    parts.forEach(function (part) {
      if (part.kind === 'code') {
        var pre = document.createElement('pre');
        pre.className = 'code-block';
        if (part.language) pre.setAttribute('data-lang', part.language);
        var code = document.createElement('code');
        code.textContent = String(part.value).replace(/\n+$/, '');
        pre.appendChild(code);
        frag.appendChild(pre);
        return;
      }
      Academy.textBlocks(part.value, frag);
    });
    return frag;
  };

  Academy.textBlocks = function (text, frag) {
    String(text || '').split(/\n{2,}/).forEach(function (block) {
      var b = block.trim();
      if (!b) return;
      var lines = b.split('\n');
      if (lines.every(function (l) { return /^[-*]\s/.test(l.trim()) || !l.trim(); })) {
        var ul = document.createElement('ul');
        lines.forEach(function (l) {
          var item = l.trim().replace(/^[-*]\s*/, '');
          if (!item) return;
          var li = document.createElement('li');
          Academy.inline(li, item);
          ul.appendChild(li);
        });
        frag.appendChild(ul);
        return;
      }
      var p = document.createElement('p');
      Academy.inline(p, b);
      frag.appendChild(p);
    });
  };

  Academy.inline = function (node, text) {
    var rest = String(text || '');
    var re = /`([^`]+)`|\*\*([^*]+)\*\*/;
    var m;
    while ((m = re.exec(rest))) {
      if (m.index > 0) node.appendChild(document.createTextNode(rest.slice(0, m.index)));
      if (m[1] != null) { var c = document.createElement('code'); c.textContent = m[1]; node.appendChild(c); }
      else { var s = document.createElement('strong'); s.textContent = m[2]; node.appendChild(s); }
      rest = rest.slice(m.index + m[0].length);
    }
    if (rest) node.appendChild(document.createTextNode(rest));
  };

  root.Academy = Academy;
})(window);
