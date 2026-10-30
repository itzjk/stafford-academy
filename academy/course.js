// Course page: the entrance scene, the teacher standing on a platform that
// fills with your progress, and the map of missions, one zone per chapter.
(function () {
  'use strict';

  var A = window.Academy;
  if (!A) return;

  A.stars();
  // The corner helper waits: on this page the teacher stands in the hero, and
  // the corner only takes over once the hero scrolls out of sight.
  var mascot = window.Mascot ? window.Mascot.mount({ page: 'course', hold: true }) : null;
  if (window.Arcade) { window.Arcade.soundButton(); window.Arcade.avatarCorner(); }

  var courseId = A.param('c');
  var MET_KEY = 'zerack.met.';
  var SEEN_KEY = 'zerack.stage.';

  function badge(text) {
    var s = document.createElement('span');
    s.className = 'badge';
    s.textContent = text;
    return s;
  }

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  function lessonHref(id) {
    return 'lesson.html?c=' + encodeURIComponent(courseId) + '&l=' + encodeURIComponent(id);
  }

  function paintHeader(course) {
    document.title = course.title + ' · Zerack Academy';
    A.el('barTitle').textContent = String(course.title || '').toUpperCase();
    A.el('barSubtitle').textContent = course.world || '';
    A.el('courseWorld').textContent = course.world || '';
    A.el('courseTitle').textContent = course.title || '';
    A.el('courseSummary').textContent = course.summary || '';

    var meta = A.el('courseMeta');
    A.clear(meta);
    if (course.type) meta.appendChild(badge(course.type));
    if (course.level) meta.appendChild(badge(course.level));
    if (course.hours) meta.appendChild(badge(course.hours + ' h'));
    if (course.language && course.language !== 'none') meta.appendChild(badge(course.language));
  }

  function paintTeacher(who, pct, done, total) {
    document.body.style.setProperty('--teacher', who.accent);
    A.el('teacherImg').src = who.face;
    A.el('teacherImg').alt = who.name;
    A.el('teacherName').textContent = who.name;
    A.el('teacherRole').textContent = who.role + ' · your teacher';
    A.el('teacher').setAttribute('aria-label', 'Ask ' + who.name + ', your teacher');
    A.el('coursePct').textContent = pct + '%';
    A.el('courseTrackText').textContent = done + ' of ' + total + ' missions done';
    // The rim of the platform fills as the course is done.
    requestAnimationFrame(function () { A.el('platformFill').style.strokeDasharray = pct + ' 100'; });
  }

  // ---------- the map ----------
  // Each chapter is a zone. Its missions are stops on a winding path; the
  // next one glows and the teacher waits next to it.

  function paintMap(course, done, next, who) {
    var box = A.el('chapters');
    A.clear(box);
    var current = null;

    (course.chapters || []).forEach(function (chapter, zi) {
      var lessons = chapter.lessons || [];
      var doneHere = lessons.filter(function (l) { return done.indexOf(l.id) >= 0; }).length;
      var hasNext = next && lessons.some(function (l) { return l.id === next.id; });
      var state = doneHere === lessons.length ? 'done' : hasNext ? 'current' : 'todo';

      var zone = el('article', 'zone');
      zone.setAttribute('data-state', state);
      zone.style.setProperty('--i', zi);
      var head = el('button', 'zone-head');
      head.type = 'button';
      var n = el('span', 'zone-n');
      n.appendChild(el('small', null, 'Zone'));
      n.appendChild(el('b', null, String(chapter.n != null ? chapter.n : zi).padStart(2, '0')));
      var titles = el('span', 'zone-titles');
      titles.appendChild(el('b', null, chapter.title || ''));
      var bar = el('span', 'zone-bar');
      var fill = el('i');
      fill.style.width = (lessons.length ? Math.round(doneHere / lessons.length * 100) : 0) + '%';
      bar.appendChild(fill);
      titles.appendChild(bar);
      var count = el('span', 'zone-count', state === 'done' ? 'Cleared' : doneHere + ' / ' + lessons.length);
      head.appendChild(n); head.appendChild(titles); head.appendChild(count); head.appendChild(el('span', 'zone-caret'));
      zone.appendChild(head);

      var path = el('div', 'zone-path');
      lessons.forEach(function (l, i) {
        var isDone = done.indexOf(l.id) >= 0;
        var isNext = next && l.id === next.id;
        var stop = el('a', 'stop');
        stop.href = lessonHref(l.id);
        stop.setAttribute('data-state', isNext ? 'next' : isDone ? 'done' : 'todo');
        stop.style.setProperty('--k', i);
        var orb = el('span', 'stop-orb');
        orb.appendChild(el('span', 'stop-n', isDone && !isNext ? '' : String(i + 1)));
        stop.appendChild(orb);
        var label = el('span', 'stop-label');
        label.appendChild(el('b', null, l.title || l.id));
        label.appendChild(el('small', null, isNext ? (isDone ? 'Replay · +' : 'Next · +') + (l.xp || 0) + ' XP' : '+' + (l.xp || 0) + ' XP'));
        stop.appendChild(label);
        if (isNext) {
          var guide = el('span', 'stop-guide');
          var face = el('img');
          face.src = who.face;
          face.alt = '';
          guide.appendChild(face);
          stop.appendChild(guide);
        }
        path.appendChild(stop);
      });
      zone.appendChild(path);

      function setOpen(open) {
        zone.setAttribute('data-open', open ? '1' : '0');
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) requestAnimationFrame(function () { layout(path); });
      }
      head.addEventListener('click', function () { setOpen(zone.getAttribute('data-open') !== '1'); });
      setOpen(state === 'current' || (!next && zi === 0));
      if (state === 'current') current = zone;
      box.appendChild(zone);
    });

    addEventListener('resize', function () {
      Array.prototype.forEach.call(box.querySelectorAll('.zone[data-open="1"] .zone-path'), layout);
    });
    return current;
  }

  // Places the stops on a wave and draws the trail between them. The part of
  // the trail you have walked is lit.
  function layout(path) {
    var stops = path.querySelectorAll('.stop');
    if (!stops.length || !path.offsetWidth) return;
    var amp = Math.min(150, path.offsetWidth * 0.2);
    var points = [];
    var lastLit = -1;
    Array.prototype.forEach.call(stops, function (s, i) {
      var x = Math.round(Math.sin(i * 0.95) * amp);
      s.style.setProperty('--x', x + 'px');
      s.classList.toggle('is-flip', x > 0);
      var orb = s.querySelector('.stop-orb');
      points.push({ x: path.offsetWidth / 2 + x, y: s.offsetTop + orb.offsetTop + orb.offsetHeight / 2 });
      if (s.getAttribute('data-state') !== 'todo') lastLit = i;
    });
    var old = path.querySelector('.trail');
    if (old) old.remove();
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'trail');
    svg.setAttribute('width', path.offsetWidth);
    svg.setAttribute('height', path.offsetHeight);
    function curve(list) {
      return list.map(function (p, i) {
        if (!i) return 'M' + p.x + ' ' + p.y;
        var q = list[i - 1], my = (q.y + p.y) / 2;
        return 'C' + q.x + ' ' + my + ' ' + p.x + ' ' + my + ' ' + p.x + ' ' + p.y;
      }).join(' ');
    }
    var all = document.createElementNS(ns, 'path');
    all.setAttribute('d', curve(points));
    all.setAttribute('class', 'trail-all');
    svg.appendChild(all);
    if (lastLit > 0) {
      var lit = document.createElementNS(ns, 'path');
      lit.setAttribute('d', curve(points.slice(0, lastLit + 1)));
      lit.setAttribute('class', 'trail-lit');
      svg.appendChild(lit);
    }
    path.insertBefore(svg, path.firstChild);
  }

  // ---------- what the teacher says on the way in ----------

  function firstSentences(text, max) {
    var out = '';
    String(text || '').split(/(?<=\.)\s+/).some(function (s) {
      if (out && (out + ' ' + s).length > max) return true;
      out = out ? out + ' ' + s : s;
      return false;
    });
    return out;
  }

  function introLines(course, who, done, total, next) {
    var chapters = (course.chapters || []).length;
    var world = course.world || course.title;
    var codes = course.language && course.language !== 'none';
    if (done.length) {
      return [
        'Welcome back to **' + world + '**! You have cleared **' + done.length + ' of ' + total + '** missions.',
        next ? 'Next up: **' + next.title + '**. Let\'s keep going.' : 'You finished every mission here. Replay any of them from the map.'
      ];
    }
    return [
      'Welcome to **' + world + '**! I\'m **' + who.name + '**, and I teach **' + course.title + '**. ' + (who.intro || ''),
      firstSentences(course.summary, 230),
      '**' + total + ' missions** across **' + chapters + ' zones**. Each one is a short briefing, then you build it yourself.',
      codes
        ? 'Stuck? Tap me any time. And watch out for **Bug**: when your code passes, he likes to break it.'
        : 'Stuck? Tap me any time. I will be right there.',
      next ? 'Ready? Your first mission is **' + next.title + '**.' : 'Ready? Pick a mission on the map.'
    ];
  }

  function fail(message) {
    A.el('courseTitle').textContent = 'Course not available';
    A.el('courseSummary').textContent = message;
    A.el('continueBtn').hidden = true;
    if (mascot) mascot.land();
  }

  if (!courseId) { fail('No course was named in the address.'); return; }

  Promise.all([A.loadCourse(courseId), A.loadProgress()]).then(function (v) {
    var course = v[0], progress = v[1] || {};
    if (!A.isCourse(course)) {
      fail(A.whyNoCourse(course));
      A.paintXp(progress);
      return;
    }
    var all = A.allLessons(course);

    // Saved progress can list missions this course no longer has. Count only
    // the ones that still exist so the platform never goes past 100 percent.
    var exists = {};
    all.forEach(function (x) { exists[x.lesson.id] = 1; });
    var done = A.doneIn(progress, courseId).filter(function (id) { return exists[id]; });
    var nextEntry = all.filter(function (x) { return done.indexOf(x.lesson.id) < 0; })[0];
    var next = nextEntry ? nextEntry.lesson : null;
    var pct = all.length ? Math.round((done.length / all.length) * 100) : 0;

    var who = window.Cast ? window.Cast.lead(courseId) : null;
    paintHeader(course);
    if (mascot) mascot.setCourse(course);
    if (who) paintTeacher(who, pct, done.length, all.length);
    var currentZone = paintMap(course, done, next, who || { face: '' });
    A.paintXp(progress);

    var go = A.el('continueBtn');
    go.href = lessonHref(next ? next.id : all[0].lesson.id);
    A.el('continueKicker').textContent = !done.length ? 'Start here' : next ? 'Continue' : 'Course complete · replay';
    A.el('continueTitle').textContent = next ? next.title : all[0].lesson.title;

    var teacher = A.el('teacher');
    var tag = A.el('teacherTag');
    teacher.addEventListener('click', function () { if (mascot) mascot.open(); });

    // The corner helper shows up only while the teacher in the hero is out of sight.
    function watchHero() {
      if (!mascot) return;
      mascot.land();
      if (!('IntersectionObserver' in window)) return;
      new IntersectionObserver(function (entries) {
        mascot.tuck(entries[0].isIntersecting);
      }, { threshold: 0.15 }).observe(teacher);
    }

    function revealTeacher() {
      teacher.hidden = false;
      tag.hidden = false;
      teacher.classList.add('is-in');
      watchHero();
    }

    function playIntro(full) {
      if (!who || !window.Stage) { revealTeacher(); return; }
      teacher.hidden = false;
      teacher.classList.add('is-waiting');
      window.Stage.play({
        who: who,
        kicker: course.world || course.title,
        lines: full ? introLines(course, who, [], all.length, next) : introLines(course, who, done, all.length, next),
        actions: [
          { label: next ? (done.length ? 'Continue mission' : 'Start mission 1') : 'See the map', main: true, run: function (close) {
            close(function () { if (next) location.href = lessonHref(next.id); });
          } },
          { label: 'See the map', run: function (close) {
            close(function () { if (currentZone) currentZone.scrollIntoView({ behavior: A.reducedMotion() ? 'auto' : 'smooth', block: 'start' }); });
          } }
        ],
        target: function () { return A.el('teacherImg').getBoundingClientRect(); },
        done: function () {
          teacher.classList.remove('is-waiting');
          revealTeacher();
        }
      });
    }

    var met = false, seen = false;
    try { met = localStorage.getItem(MET_KEY + courseId) === '1'; localStorage.setItem(MET_KEY + courseId, '1'); } catch (e) {}
    try { seen = sessionStorage.getItem(SEEN_KEY + courseId) === '1'; sessionStorage.setItem(SEEN_KEY + courseId, '1'); } catch (e) {}

    var replay = A.el('replayIntro');
    replay.hidden = !who;
    replay.addEventListener('click', function () { playIntro(true); });

    // The full welcome the first time; a short one when you come back in a
    // new session; none when you are just moving between this course's pages.
    if (!met) playIntro(true);
    else if (!seen) playIntro(false);
    else revealTeacher();
  });
})();
