// Home page: a full-screen scene with one course per screen. Scrolling,
// swiping, the arrow keys or the dots move between courses, and each change
// slides the text up like a deck.
(function () {
  'use strict';

  var A = window.Academy;
  if (!A) return;

  var CATALOG_URL = 'academy/courses/catalog.json';
  var still = A.reducedMotion();

  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function courseUrl(id) { return 'academy/course.html?c=' + encodeURIComponent(id); }

  A.stars();
  var mascot = window.Mascot ? window.Mascot.mount({ page: 'home' }) : null;

  Promise.all([
    fetch(CATALOG_URL, { cache: 'no-store' }).then(function (r) { return r.json(); }),
    A.loadProgress()
  ]).then(function (v) {
    var catalog = v[0] || {}, progress = v[1] || {};
    var courses = (catalog.courses || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    if (!courses.length) return;

    $('sceneTotal').textContent = pad(courses.length);
    $('sceneAll').textContent = courses.length;

    // Open on the course the student was last working on.
    var last = progress.last && progress.last.course;
    var startAt = Math.max(0, courses.map(function (c) { return c.id; }).indexOf(last));
    buildScene(courses, progress, startAt);

    if (mascot) {
      mascot.welcome(last && startAt >= 0 && courses[startAt].id === last
        ? 'Hi, welcome back! 👋 Ready to keep going with **' + courses[startAt].title + '**?'
        : 'Hi! 👋 I am **Zerack**, welcome to **Stafford Academy**. Scroll to explore the courses. New to coding? Start with **Programming from Zero**.');
    }
  }).catch(function () {
    if (mascot) mascot.welcome('Hi! 👋 Welcome to **Stafford Academy**.');
  });

  // ---------- course figure ----------
  // Courses about a topic rather than about code show an animated figure from
  // academy/art/<course>.svg (the catalog marks them with "figure": true). The
  // files are ours and use only classes, so they can be inlined and pick up
  // the course color.

  var figures = {};

  function loadFigure(id) {
    if (!figures[id]) {
      figures[id] = fetch('academy/art/' + encodeURIComponent(id) + '.svg')
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(function (t) { return t && t.indexOf('<svg') >= 0 ? t : null; }, function () { return null; });
    }
    return figures[id];
  }

  // Shows the figure when the course has one, the live code window otherwise.
  function showVisual(course) {
    var figure = $('figure'), win = $('codeWindow');
    (course.figure ? loadFigure(course.id) : Promise.resolve(null)).then(function (svg) {
      if ($('sceneTitle').textContent !== course.title) return;
      if (svg) {
        codeRun++;
        figure.innerHTML = svg;
        figure.hidden = false;
        win.hidden = true;
        $('orbit').hidden = false;
      } else {
        figure.hidden = true;
        figure.innerHTML = '';
        $('orbit').hidden = true;
        win.hidden = false;
        typeCode(course);
      }
    });
  }

  // ---------- live code window ----------

  var KEYWORDS = /^(def|return|for|in|if|elif|else|while|import|from|as|class|and|or|not|is|lambda|with|try|except|finally|raise|pass|break|continue|yield|global|None|True|False)$/;
  var BUILTINS = /^(print|len|range|abs|round|min|max|sum|sorted|enumerate|zip|list|dict|set|tuple|int|float|str|bool|isinstance|map|filter|reversed|any|all|self)$/;

  // Splits one line of Python into colored tokens.
  function tokenize(line) {
    var tokens = [], re = /(#.*$)|([rbfRBF]{0,2}"(?:\\.|[^"\\])*"?|[rbfRBF]{0,2}'(?:\\.|[^'\\])*'?)|(\b\d+(?:\.\d+)?(?:e-?\d+)?\b)|([A-Za-z_]\w*)|(\s+)|([^\sA-Za-z_\d#'"]+)/g, m;
    while ((m = re.exec(line))) {
      var cls = '';
      if (m[1]) cls = 'tk-com';
      else if (m[2]) cls = 'tk-str';
      else if (m[3]) cls = 'tk-num';
      else if (m[4]) {
        if (KEYWORDS.test(m[4])) cls = 'tk-kw';
        else if (BUILTINS.test(m[4])) cls = 'tk-bi';
        else if (line.charAt(re.lastIndex) === '(') cls = 'tk-fn';
      }
      tokens.push({ cls: cls, text: m[0] });
    }
    return tokens;
  }

  var codeRun = 0;

  // Types the snippet line by line, then prints its real output.
  function typeCode(course) {
    var run = ++codeRun;
    var codeEl = $('cwCode'), outEl = $('cwOutput'), consoleEl = $('cwConsole');
    var preview = course.preview || { code: '', output: '' };
    $('cwFile').textContent = String(course.id).replace(/-/g, '_') + '.py';
    A.clear(codeEl);
    A.clear(outEl);
    consoleEl.classList.remove('ran');

    var lines = String(preview.code).split('\n').map(tokenize);
    var total = String(preview.code).length;
    var perFrame = Math.max(1, Math.ceil(total / 150));
    var caret = document.createElement('span');
    caret.className = 'cw-caret';

    if (still) {
      lines.forEach(function (tokens) { codeEl.appendChild(lineNode(tokens, true)); });
      showOutput();
      return;
    }

    var li = 0, ti = 0, ci = 0, lineEl = null, tokenEl = null;
    function lineNode(tokens, full) {
      var el = document.createElement('span');
      el.className = 'cw-line';
      if (full) tokens.forEach(function (t) { var s = document.createElement('span'); if (t.cls) s.className = t.cls; s.textContent = t.text; el.appendChild(s); });
      return el;
    }
    function step() {
      if (run !== codeRun) return;
      for (var n = 0; n < perFrame; n++) {
        if (li >= lines.length) { showOutput(); return; }
        if (!lineEl) {
          if (codeEl.lastChild && codeEl.lastChild.classList) codeEl.lastChild.classList.remove('active');
          lineEl = lineNode([], false);
          lineEl.classList.add('active');
          codeEl.appendChild(lineEl);
        }
        var tokens = lines[li];
        if (ti >= tokens.length) { li++; ti = 0; ci = 0; lineEl = null; tokenEl = null; continue; }
        var t = tokens[ti];
        if (!tokenEl) { tokenEl = document.createElement('span'); if (t.cls) tokenEl.className = t.cls; lineEl.appendChild(tokenEl); }
        tokenEl.textContent += t.text.charAt(ci++);
        if (ci >= t.text.length) { ti++; ci = 0; tokenEl = null; }
      }
      if (lineEl) lineEl.appendChild(caret);
      codeEl.scrollTop = codeEl.scrollHeight;
      requestAnimationFrame(step);
    }
    function showOutput() {
      if (run !== codeRun) return;
      if (caret.parentNode) caret.parentNode.removeChild(caret);
      Array.prototype.forEach.call(codeEl.children, function (l) { l.classList.remove('active'); });
      setTimeout(function () {
        if (run !== codeRun) return;
        consoleEl.classList.add('ran');
        String(preview.output).split('\n').forEach(function (text, i) {
          var s = document.createElement('span');
          s.textContent = text || ' ';
          s.style.animationDelay = (i * 140) + 'ms';
          outEl.appendChild(s);
        });
      }, still ? 0 : 350);
    }
    requestAnimationFrame(step);
  }

  function buildScene(courses, progress, startAt) {
    var scene = $('scene'), text = $('sceneText'), stage = $('stage'), dots = $('sceneDots');
    var current = startAt, locked = false;

    function doneIn(course) {
      return Math.min(A.doneIn(progress, course.id).length, course.lessons || 0);
    }

    courses.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', c.title);
      b.title = c.title;
      b.addEventListener('click', function () { go(i); });
      dots.appendChild(b);
    });

    function paint(i) {
      var c = courses[i], done = doneIn(c);
      scene.style.setProperty('--c', c.accent || '#7deeff');
      $('sceneIndex').textContent = pad(i + 1);
      $('sceneGhost').textContent = pad(i + 1);
      $('sceneWorld').textContent = c.world || '';
      $('sceneLevel').textContent = c.level || '';
      $('sceneTitle').textContent = c.title;
      $('sceneSummary').textContent = c.summary || '';
      var tags = $('sceneTags');
      A.clear(tags);
      [c.language === 'none' ? 'no code' : (c.language || 'python'), (c.hours || 0) + ' hours', (c.lessons || 0) + ' missions', done ? done + ' done' : null]
        .filter(Boolean).forEach(function (t) {
          var s = document.createElement('span');
          s.textContent = t;
          tags.appendChild(s);
        });
      var cta = $('sceneCta');
      cta.href = courseUrl(c.id);
      cta.firstChild.nodeValue = (done ? 'CONTINUE' : 'OPEN THE CLASSROOM') + ' ';
      Array.prototype.forEach.call(dots.children, function (d, k) {
        d.classList.toggle('on', k === i);
        d.setAttribute('aria-current', k === i ? 'true' : 'false');
      });
      $('prevBtn').disabled = i === 0;
      $('nextBtn').disabled = i === courses.length - 1;
      showVisual(c);
    }

    function go(i) {
      if (i < 0 || i >= courses.length || i === current || locked) return;
      var forward = i > current;
      current = i;
      if (still) { paint(i); return; }
      locked = true;
      text.className = 'scene-text ' + (forward ? 'leaving' : 'leaving-down');
      stage.classList.remove('changing');
      void stage.offsetWidth;
      stage.classList.add('changing');
      setTimeout(function () {
        paint(i);
        text.className = 'scene-text ' + (forward ? 'entering' : 'entering-up');
        setTimeout(function () { locked = false; }, 450);
      }, 300);
    }

    function next() { go(current + 1); }
    function prev() { go(current - 1); }

    $('nextBtn').addEventListener('click', next);
    $('prevBtn').addEventListener('click', prev);

    // The page never scrolls: the wheel only moves between courses. Small
    // trackpad deltas add up until they are worth one step.
    var wheelSum = 0, wheelReset = null;
    window.addEventListener('wheel', function (e) {
      if (e.target.closest && e.target.closest('.mc-panel')) return;
      e.preventDefault();
      clearTimeout(wheelReset);
      wheelReset = setTimeout(function () { wheelSum = 0; }, 180);
      if (locked) return;
      wheelSum += e.deltaY;
      if (Math.abs(wheelSum) < 40) return;
      var down = wheelSum > 0;
      wheelSum = 0;
      if (down) next(); else prev();
    }, { passive: false });

    var touchY = null;
    scene.addEventListener('touchstart', function (e) { touchY = e.touches[0].clientY; }, { passive: true });
    scene.addEventListener('touchend', function (e) {
      if (touchY == null) return;
      var dy = touchY - e.changedTouches[0].clientY;
      touchY = null;
      if (Math.abs(dy) < 50) return;
      if (dy > 0) next(); else prev();
    });

    document.addEventListener('keydown', function (e) {
      if (e.target.closest && e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); prev(); }
      if (e.key === 'Home') { e.preventDefault(); go(0); }
      if (e.key === 'End') { e.preventDefault(); go(courses.length - 1); }
    });

    paint(current);
    text.className = 'scene-text entering';
  }
})();
