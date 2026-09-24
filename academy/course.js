// Course page: header, mentor, progress bar and the chapter list.
(function () {
  'use strict';

  var A = window.Academy;
  if (!A) return;

  A.stars();
  var mascot = window.Mascot ? window.Mascot.mount({ page: 'course' }) : null;

  var courseId = A.param('c');

  function badge(text, cls) {
    var s = document.createElement('span');
    s.className = 'badge ' + (cls || '');
    s.textContent = text;
    return s;
  }

  function paintHeader(course) {
    document.title = course.title + ' · Stafford Academy';
    document.body.style.setProperty('--course-accent', course.accent || '#4fd8ff');
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

    var mentor = course.mentor || {};
    if (mentor.name) {
      A.el('mentorBox').hidden = false;
      A.el('mentorAvatar').textContent = String(mentor.name).replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase();
      A.el('mentorName').textContent = mentor.name;
      A.el('mentorCharacter').textContent = mentor.character || '';
    }
  }

  function paintChapters(course, done) {
    var box = A.el('chapters');
    A.clear(box);
    var firstUnfinished = true;

    (course.chapters || []).forEach(function (chapter) {
      var lessons = chapter.lessons || [];
      var doneHere = lessons.filter(function (l) { return done.indexOf(l.id) >= 0; }).length;
      // Only the first chapter with missions left starts open.
      var open = firstUnfinished && doneHere < lessons.length;
      if (open) firstUnfinished = false;

      var article = document.createElement('article');
      article.className = 'chapter';
      article.setAttribute('data-open', open ? '1' : '0');

      var head = document.createElement('button');
      head.className = 'chapter-head';
      head.type = 'button';
      head.setAttribute('aria-expanded', open ? 'true' : 'false');

      var n = document.createElement('span'); n.className = 'chapter-n';
      n.textContent = String(chapter.n != null ? chapter.n : '?').padStart(2, '0');
      var t = document.createElement('span'); t.className = 'chapter-title'; t.textContent = chapter.title || '';
      var c = document.createElement('span'); c.className = 'chapter-count'; c.textContent = doneHere + '/' + lessons.length;
      var caret = document.createElement('span'); caret.className = 'chapter-caret';
      head.appendChild(n); head.appendChild(t); head.appendChild(c); head.appendChild(caret);
      head.addEventListener('click', function () {
        var isOpen = article.getAttribute('data-open') === '1';
        article.setAttribute('data-open', isOpen ? '0' : '1');
        head.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      });
      article.appendChild(head);

      var list = document.createElement('div'); list.className = 'chapter-lessons';
      lessons.forEach(function (l) {
        var a = document.createElement('a');
        a.className = 'lesson-row';
        a.href = 'lesson.html?c=' + encodeURIComponent(course.id) + '&l=' + encodeURIComponent(l.id);
        a.setAttribute('data-done', done.indexOf(l.id) >= 0 ? '1' : '0');
        var tick = document.createElement('span'); tick.className = 'lesson-tick';
        var title = document.createElement('span'); title.className = 'lesson-name'; title.textContent = l.title || l.id;
        var xp = document.createElement('span'); xp.className = 'lesson-xp'; xp.textContent = '+' + (l.xp || 0) + ' XP';
        a.appendChild(tick); a.appendChild(title); a.appendChild(xp);
        list.appendChild(a);
      });
      article.appendChild(list);
      box.appendChild(article);
    });
  }

  function fail(message) {
    A.el('courseTitle').textContent = 'Course not available';
    A.el('courseSummary').textContent = message;
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
    // the ones that still exist so the bar never goes past 100 percent.
    var exists = {};
    all.forEach(function (x) { exists[x.lesson.id] = 1; });
    var done = A.doneIn(progress, courseId).filter(function (id) { return exists[id]; });

    paintHeader(course);
    paintChapters(course, done);
    A.paintXp(progress);

    var pct = all.length ? Math.round((done.length / all.length) * 100) : 0;
    requestAnimationFrame(function () { A.el('courseTrack').style.width = pct + '%'; });
    A.el('courseTrackText').textContent = done.length + ' of ' + all.length + ' missions done, ' + pct +
      ' percent of ' + (course.world || 'the course') + '.';

    if (mascot) {
      mascot.setCourse(course);
      mascot.welcome(done.length
        ? 'Hi, welcome back to **' + course.title + '**! 👋 You have done ' + done.length + ' of ' + all.length + ' missions. Let\'s keep going!'
        : 'Hi! 👋 Welcome to **' + course.title + '**. ' + all.length + ' missions are waiting for you. Tap me whenever you get stuck.');
    }
  });
})();
