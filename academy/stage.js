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

    var hero = node('div', 'stage-hero');
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
    setTimeout(function () { showLine(0); }, still() ? 0 : 1050);
    return { close: close };
  }

  root.Stage = { play: play };
})(window);
