// Mission page: briefing, code editor, the checker and the "next mission" panel.
(function () {
  'use strict';

  var A = window.Academy;
  if (!A) return;

  A.stars();
  var mascot = window.Mascot ? window.Mascot.mount({ page: 'lesson' }) : null;

  var courseId = A.param('c');
  var lessonId = A.param('l');
  var state = { course: null, chapter: null, lesson: null, next: null, progress: {}, alreadyDone: false };

  // ---------- output panel ----------

  function showMessage(cls, title, lines) {
    var out = A.el('output');
    A.clear(out);
    out.className = 'output ' + cls;
    if (title) { var b = document.createElement('b'); b.textContent = title; out.appendChild(b); }
    if (lines && lines.length) {
      var ul = document.createElement('ul');
      lines.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      out.appendChild(ul);
    }
  }

  function showRun(title, text, cls) {
    var out = A.el('output');
    A.clear(out);
    out.className = 'output ' + cls;
    var b = document.createElement('b');
    b.textContent = title;
    out.appendChild(b);
    if (text) {
      var pre = document.createElement('pre');
      pre.className = 'stdout';
      pre.textContent = text;
      out.appendChild(pre);
    }
    return out;
  }

  function addNote(node, text) {
    var p = document.createElement('p');
    p.className = 'output-note';
    p.textContent = text;
    node.appendChild(p);
  }

  // The mascot listens for this event to celebrate or to offer help.
  function announceResult(res) {
    try { document.dispatchEvent(new CustomEvent('academy:result', { detail: { ok: !!res.ok, title: res.title || '' } })); } catch (e) {}
  }

  // ---------- the checker ----------

  function normalize(s) { return String(s || '').replace(/\r/g, ''); }

  // The check compares text, so spacing used to decide whether a correct
  // answer passed. Both sides are flattened the same way: this does not make
  // the check softer, it only stops punishing formatting.
  function flatten(s) {
    return String(s || '')
      .replace(/\r/g, '')
      .replace(/\s+/g, ' ')
      .replace(/ ?([^\w\s]) ?/g, '$1')
      .trim();
  }

  // Each language marks comments its own way, and mixing them up rejects good
  // code: in Python // is floor division, in C or a device tree # opens a
  // directive. h = #, s = // and /* */, x = <!-- -->.
  var COMMENT_STYLE = {
    python: 'h', udev: 'h', sh: 'h', bash: 'h', systemd: 'h',
    make: 'h', cmake: 'h', yaml: 'h', srv: 'h', action: 'h',
    c: 's', cpp: 's', 'c++': 's', dts: 's',
    xml: 'x', urdf: 'x', xacro: 'x'
  };

  // Strips comments, and with blankStrings also the inside of string literals,
  // so a required fragment cannot be satisfied by writing it in a comment or
  // inside quotes. What sits between the braces of an f-string is kept,
  // because that is real code.
  function codeOnly(text, language, blankStrings) {
    var s = String(text || '').replace(/\r/g, '');
    var style = COMMENT_STYLE[String(language || '').toLowerCase()] || 'sx';
    var hash = style.indexOf('h') >= 0, slash = style.indexOf('s') >= 0, xml = style.indexOf('x') >= 0;
    var out = '', i = 0, n = s.length;
    while (i < n) {
      var ch = s[i];
      if (ch === '"' || ch === "'") {
        var triple = hash && s.substr(i, 3) === ch + ch + ch;
        var quote = triple ? ch + ch + ch : ch;
        var j = i + quote.length;
        while (j < n) {
          if (s[j] === '\\') { j += 2; continue; }
          if (s.substr(j, quote.length) === quote) break;
          if (!triple && s[j] === '\n') break;
          j++;
        }
        var end = Math.min(n, j + quote.length);
        if (!blankStrings) { out += s.slice(i, end); i = end; continue; }
        var fString = /[fF]/.test(s.slice(Math.max(0, i - 2), i));
        out += quote;
        for (var k = i + quote.length; k < end - quote.length; k++) {
          if (s[k] === '\n') { out += '\n'; continue; }
          if (!fString || s[k] !== '{' || s[k + 1] === '{') continue;
          var close = s.indexOf('}', k + 1);
          if (close < 0 || close >= end) continue;
          out += ' ' + s.slice(k + 1, close) + ' ';
          k = close;
        }
        out += quote;
        i = end;
        continue;
      }
      if (slash && ch === '/' && s[i + 1] === '/') { while (i < n && s[i] !== '\n') i++; out += ' '; continue; }
      if (slash && ch === '/' && s[i + 1] === '*') {
        var e = s.indexOf('*/', i + 2), f = e < 0 ? n : e + 2;
        for (var q = i; q < f; q++) if (s[q] === '\n') out += '\n';
        out += ' '; i = f; continue;
      }
      if (xml && s.substr(i, 4) === '<!--') {
        var e2 = s.indexOf('-->', i + 4), f2 = e2 < 0 ? n : e2 + 3;
        for (var q2 = i; q2 < f2; q2++) if (s[q2] === '\n') out += '\n';
        out += ' '; i = f2; continue;
      }
      if (hash && ch === '#') { while (i < n && s[i] !== '\n') i++; out += ' '; continue; }
      out += ch; i++;
    }
    return out;
  }

  function runsCode(lesson) {
    return !!(lesson && lesson.check && lesson.check.type === 'runs');
  }

  function normalizeOutput(t) {
    return String(t == null ? '' : t).replace(/\r/g, '').replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
  }

  // Static check: looks for the required fragments in the code without running it.
  function review(code, lesson, language) {
    var c = normalize(code);
    var check = lesson && lesson.check;
    if (!c.trim()) return { ok: false, missing: ['The editor is empty.'], asked: 1, met: 0 };
    if (!check || !check.type) return { ok: true, missing: [], asked: 1, met: 1 };

    var withStrings = codeOnly(c, language, false);
    var outsideStrings = codeOnly(c, language, true);
    var wanted = Array.isArray(check.value) ? check.value : (check.value ? [check.value] : []);

    if (check.type === 'contains') {
      // A fragment that lives outside every string in the official solution
      // must also be outside strings in the answer. Fragments that only exist
      // inside a string, like the text a mission asks you to print, are
      // searched with strings included.
      var inSolution = flatten(codeOnly(lesson.solution || '', language, true));
      var loose = flatten(withStrings), strict = flatten(outsideStrings);
      var missing = wanted.filter(function (p) {
        var need = flatten(p);
        return (inSolution.indexOf(need) >= 0 ? strict : loose).indexOf(need) < 0;
      });
      return { ok: missing.length === 0, missing: missing.map(function (f) { return 'Missing: ' + f; }), asked: wanted.length, met: wanted.length - missing.length };
    }
    if (check.type === 'regex') {
      var failed = wanted.filter(function (p) {
        try { return !(new RegExp(p, 'm').test(withStrings)); } catch (e) { return false; }
      });
      return { ok: failed.length === 0, missing: failed.map(function () { return 'The shape of the answer is not there yet.'; }), asked: wanted.length, met: wanted.length - failed.length };
    }
    if (check.type === 'runs') {
      if (!wanted.length) return { ok: true, missing: [], asked: 1, met: 1 };
      var absent = wanted.filter(function (p) { return flatten(withStrings).indexOf(flatten(p)) < 0; });
      return { ok: absent.length === 0, missing: absent.map(function (f) { return 'Missing: ' + f; }), asked: wanted.length, met: wanted.length - absent.length };
    }
    if (check.type === 'output') {
      var expected = String(check.value || '').trim();
      var found = withStrings.indexOf(expected) >= 0;
      return { ok: found, missing: expected ? ['It should produce: ' + expected] : [], asked: 1, met: found ? 1 : 0 };
    }
    return { ok: true, missing: [], asked: 1, met: 1 };
  }

  // Runs the code in Python and compares its output with the expected one.
  function runAndCheck(code, lesson, language) {
    var runner = window.PythonRunner;
    if (!runner) {
      return Promise.resolve({ ok: false, title: 'The Python runtime is not loaded.', output: '', note: 'python-runner.js did not load on this page.' });
    }
    var check = lesson.check || {};
    return runner.run(code, { stdin: lesson.stdin || '', timeoutMs: 8000 }).then(function (res) {
      if (!res.ok) {
        return {
          ok: false,
          title: res.timedOut ? 'Your program never finished.' : 'Your program crashed.',
          output: res.stderr,
          note: res.timedOut ? '' : 'Read the last line of the traceback first. It names the error.'
        };
      }
      var expected = check.expects != null ? normalizeOutput(check.expects) : null;
      var actual = normalizeOutput(res.stdout);
      if (expected === null) {
        var r = review(code, lesson, language);
        return { ok: r.ok, title: r.ok ? 'It runs, and it checks out.' : 'It runs, but something is missing.', output: actual, note: r.ok ? (lesson.goal || '') : r.missing.join('  ') };
      }
      if (actual === expected) return { ok: true, title: 'It runs, and the output is right.', output: actual, note: lesson.goal || '' };
      return { ok: false, title: 'It runs, but the output is not what the mission asks for.', output: actual, note: 'Expected:\n' + expected };
    });
  }

  // ---------- editor ----------

  var INDENT = '    ';

  function indentLines(text, from, to, outdent) {
    var start = text.lastIndexOf('\n', from - 1) + 1;
    var end = text.indexOf('\n', to);
    if (end < 0) end = text.length;
    var lines = text.slice(start, end).split('\n');
    var moved = 0;
    var changed = lines.map(function (l) {
      if (!outdent) { moved += INDENT.length; return INDENT + l; }
      var m = l.match(/^( {1,4}|\t)/);
      if (!m) return l;
      moved -= m[0].length;
      return l.slice(m[0].length);
    });
    return { text: text.slice(0, start) + changed.join('\n') + text.slice(end), moved: moved, first: changed[0].length - lines[0].length };
  }

  // In Python indentation is part of the language, so Tab indents instead of
  // leaving the editor. Escape then Tab moves focus on, the accessible pattern.
  function editorKeys(code) {
    var escaping = false;
    code.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { escaping = true; return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        A.el('runBtn').click();
        return;
      }
      if (e.key !== 'Tab' || escaping) { escaping = false; return; }
      e.preventDefault();
      var start = code.selectionStart, end = code.selectionEnd;
      if (start === end && !e.shiftKey) {
        code.value = code.value.slice(0, start) + INDENT + code.value.slice(end);
        code.selectionStart = code.selectionEnd = start + INDENT.length;
      } else {
        var r = indentLines(code.value, start, end, e.shiftKey);
        code.value = r.text;
        code.selectionStart = Math.max(0, start + r.first);
        code.selectionEnd = Math.max(0, end + r.moved);
      }
      code.dispatchEvent(new Event('input'));
    });
    code.addEventListener('blur', function () { escaping = false; });
  }

  function draftKey() { return 'stafford.draft.' + courseId + '.' + lessonId; }
  function saveDraft(text) { try { localStorage.setItem(draftKey(), text); } catch (e) {} }
  function loadDraft() { try { return localStorage.getItem(draftKey()); } catch (e) { return null; } }

  // ---------- finishing a mission ----------

  function paintNext(won, xp) {
    var box = A.el('nextBox');
    box.hidden = false;
    A.el('nextTitle').textContent = won ? 'Mission complete' + (xp ? '  +' + xp + ' XP' : '') : 'Already done';
    A.el('nextSubtitle').textContent = state.next ? 'Up next: ' + state.next.title : 'That was the last mission of this course.';
    var btn = A.el('nextBtn');
    if (state.next) {
      btn.href = 'lesson.html?c=' + encodeURIComponent(courseId) + '&l=' + encodeURIComponent(state.next.id);
    } else {
      btn.href = 'course.html?c=' + encodeURIComponent(courseId);
      A.clear(btn);
      btn.appendChild(document.createTextNode('Back to the course'));
    }
    if (won) box.classList.add('is-won');
    box.scrollIntoView({ behavior: A.reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  }

  function onPass() {
    var xp = Number(state.lesson.xp || 0);
    var won = A.markDone(state.progress, courseId, lessonId, xp);
    // The home page reads this to offer "Continue where you left off".
    state.progress.last = { course: courseId, lesson: state.next ? state.next.id : lessonId, at: Date.now() };
    A.saveProgress(state.progress).then(function () {
      A.paintXp(state.progress);
      paintNext(won, won ? xp : 0);
    });
  }

  function start() {
    var l = state.lesson, course = state.course;
    var language = l.language || course.language || 'python';
    document.title = l.title + ' · Stafford Academy';
    document.body.style.setProperty('--course-accent', course.accent || '#4fd8ff');

    if (mascot) {
      mascot.setLesson({ course: course, chapter: state.chapter, lesson: l });
      var greeted = false;
      try { greeted = sessionStorage.getItem('stafford.mascot.greeted') === '1'; sessionStorage.setItem('stafford.mascot.greeted', '1'); } catch (e) {}
      if (!greeted) mascot.welcome('Hi! 👋 I can see this mission. If your code fails, tap me and I will explain the error.');
    }

    A.el('backLink').href = 'course.html?c=' + encodeURIComponent(courseId);
    A.el('barTitle').textContent = String(course.title || '').toUpperCase();
    A.el('barSubtitle').textContent = course.world || '';
    // Some ROS missions ask for a CMakeLists, a package.xml or a URDF, so the
    // editor label follows the lesson's own language when it has one.
    A.el('editorLang').textContent = language.toUpperCase();

    var crumb = A.el('crumb');
    A.clear(crumb);
    var a = document.createElement('a');
    a.href = 'course.html?c=' + encodeURIComponent(courseId);
    a.textContent = course.title;
    crumb.appendChild(a);
    crumb.appendChild(document.createTextNode(' · ' + (state.chapter ? state.chapter.title : '')));

    A.el('lessonTitle').textContent = l.title || '';
    A.el('lessonGoal').textContent = l.goal || '';
    var theory = A.el('lessonTheory');
    A.clear(theory);
    theory.appendChild(A.markdown(l.theory || ''));
    var task = A.el('lessonTask');
    A.clear(task);
    task.appendChild(A.markdown(l.task || ''));

    var code = A.el('code');
    var draft = loadDraft();
    code.value = draft != null ? draft : (l.starter || '');
    code.addEventListener('input', function () { saveDraft(code.value); });
    editorKeys(code);

    A.el('hint').textContent = l.hint || 'No hint for this one.';

    if (runsCode(l) && window.PythonRunner) window.PythonRunner.warmUp();

    A.el('runBtn').addEventListener('click', function () {
      var button = A.el('runBtn');
      if (!runsCode(l) || !window.PythonRunner) {
        var r = review(code.value, l, language);
        if (!r.ok) {
          showMessage('is-bad', 'Not yet.', r.missing.length ? r.missing : ['Something is still missing.']);
          announceResult({ ok: false, title: 'Not yet.' });
          return;
        }
        showMessage('is-good', 'It checks out.', [l.goal || 'Objective met.']);
        announceResult({ ok: true, title: 'It checks out.' });
        onPass();
        return;
      }
      if (!code.value.trim()) {
        showMessage('is-bad', 'Not yet.', ['The editor is empty.']);
        return;
      }
      button.disabled = true;
      showMessage('is-idle', 'Running your code...', []);
      runAndCheck(code.value, l, language).then(function (res) {
        button.disabled = false;
        var box = showRun(res.title, res.output, res.ok ? 'is-good' : 'is-bad');
        if (res.note) addNote(box, res.note);
        announceResult(res);
        if (res.ok) onPass();
      });
    });

    A.el('hintBtn').addEventListener('click', function () {
      var h = A.el('hint');
      h.hidden = !h.hidden;
    });

    A.el('resetBtn').addEventListener('click', function () {
      code.value = l.starter || '';
      saveDraft(code.value);
      showMessage('is-idle', '', ['Back to the starting code.']);
    });

    A.el('solutionBtn').addEventListener('click', function () {
      code.value = l.solution || code.value;
      saveDraft(code.value);
      showMessage('is-idle', 'Solution loaded.', ['Read it, then press check. It counts the same, but you learn less.']);
    });

    if (state.alreadyDone) paintNext(false, 0);
    A.paintXp(state.progress);
  }

  function fail(message) {
    A.el('lessonTitle').textContent = 'Mission not available';
    A.el('lessonGoal').textContent = message;
    document.title = 'Mission not available · Stafford Academy';
    A.el('barSubtitle').textContent = 'Nothing to show';
    A.el('editorLang').textContent = '';
  }

  if (!courseId || !lessonId) { fail('The address does not name a course and a mission.'); return; }

  Promise.all([A.loadCourse(courseId), A.loadProgress()]).then(function (v) {
    var course = v[0];
    state.progress = v[1] || {};
    if (!A.isCourse(course)) { fail(A.whyNoCourse(course)); A.paintXp(state.progress); return; }

    var all = A.allLessons(course);
    var idx = -1;
    for (var i = 0; i < all.length; i++) if (all[i].lesson.id === lessonId) { idx = i; break; }
    if (idx < 0) { fail('That mission is not in this course.'); A.paintXp(state.progress); return; }

    state.course = course;
    state.lesson = all[idx].lesson;
    state.chapter = all[idx].chapter;
    state.next = idx + 1 < all.length ? all[idx + 1].lesson : null;
    state.alreadyDone = A.doneIn(state.progress, courseId).indexOf(lessonId) >= 0;
    start();
  });
})();
