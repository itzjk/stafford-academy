// The teaching cast. Every course has a character who gives the class and
// answers in the helper. After two misses in a row the lead calls Kernel, the
// veteran mentor, or Mate in courses heavy on maths. When a code mission
// passes, Bug, the academy's rival, offers a duel: he breaks one line of the
// student's code and they have two minutes to find it.
(function (root) {
  'use strict';

  if (root.Cast) return;

  var script = document.currentScript;
  var FACES = script ? new URL('cast/', script.src).href : 'cast/';
  var WINS_KEY = 'zerack.bug.wins';

  var CAST = {
    zack: { name: 'Zack', role: 'Welcome and fundamentals', accent: '#00d4ff', style: 'a warm robot guide who speaks in short sentences and celebrates every small step', hello: "Hey, I'm Zack. Here you learn by doing, one step at a time." },
    nodo: { name: 'Nodo', role: 'That is you', accent: '#82ffc8', style: 'the student, curious and honest about what is not clear yet', hello: 'Every mission you finish lights one more node in my head.' },
    byte: { name: 'Byte', role: 'Programming', accent: '#b46bff', style: 'a programmer with dry humour who loves clean code and explains with tiny examples', hello: 'Byte here. Tell me what you expected your code to do and what it did instead.' },
    neura: { name: 'Neura', role: 'Artificial intelligence', accent: '#3dff9a', style: 'calm and curious, she builds the intuition first and only then the maths', hello: "I'm Neura. Before the formula, let's get the idea." },
    pixel: { name: 'Pixel', role: 'Design and web', accent: '#ff7ad9', style: 'a visual thinker who sketches the layout before any code', hello: "Pixel. Let's picture it first, then build it." },
    cifra: { name: 'Cifra', role: 'Data and analysis', accent: '#ffc542', style: 'a data detective who always asks what the numbers are hiding', hello: 'Cifra. Numbers always hide a story. Want to find it?' },
    turbo: { name: 'Turbo', role: 'Video games', accent: '#ff5470', style: 'an arcade machine that turns everything into levels and bosses', hello: 'Turbo! This mission is a level. Let me show you the boss.' },
    clave: { name: 'Clave', role: 'Cybersecurity', accent: '#ff3b3b', style: 'a quiet sentinel who thinks like an attacker to defend better', hello: 'Clave. Where would you attack this if you were the bad guy?' },
    chispa: { name: 'Chispa', role: 'Robotics', accent: '#ffa53d', style: 'a hands-on robot mechanic with four arms who explains with real machines', hello: 'Chispa here, four arms ready. Robots are just sense, think, act.' },
    mate: { name: 'Mate', role: 'Mathematics', accent: '#e8f1ff', style: 'a precise crystal mind who turns every problem into a small puzzle you can check by hand', hello: "Mate. Let's shrink this to numbers you can check on paper." },
    voltio: { name: 'Voltio', role: 'Hardware and electronics', accent: '#ffe14d', style: 'an excitable chip-crab who talks in volts and pins and always puts safety first', hello: 'Voltio! Volts, pins and current. Tell me what is wired to what.' },
    nube: { name: 'Nube', role: 'Cloud and servers', accent: '#7fd1ff', style: 'a relaxed cloud who explains systems as things that travel', hello: 'Nube. Where does your data live and where does it travel?' },
    ritmo: { name: 'Ritmo', role: 'Music and audio', accent: '#c77dff', style: 'a producer who hears signals as music', hello: "Ritmo. Every signal has a beat. Let's listen to this one." },
    foco: { name: 'Foco', role: 'Content creation', accent: '#ffd166', style: 'an energetic creator who teaches how to make and publish content', hello: "Foco. Let's look at the idea behind this mission." },
    kernel: { name: 'Kernel', role: 'Veteran mentor', accent: '#9ad1ff', style: 'a patient veteran who never gives the answer and asks the one question that unlocks it', hello: 'Kernel. Slow down. Read your error out loud, line by line.' },
    bug: { name: 'Bug', role: 'The rival', accent: '#7dff4d', style: 'a mischievous rival who taunts but plays fair and loves off-by-one errors', hello: 'Bug. Your code passed? Cute. Let me in.' },
    axo: { name: 'Axo', role: 'Academy mascot', accent: '#ff9ecb', style: 'a cheerful axolotl who keeps your streak alive', hello: 'Axo! Keep the streak going!' }
  };

  // Who gives each course. Courses that are not listed get Zack.
  var LEADS = {
    programming: 'byte', javascript: 'byte', 'python-robotics': 'byte', 'embedded-linux': 'byte',
    'electronics-basics': 'voltio', power: 'voltio',
    'robotics-basics': 'chispa', ros2: 'chispa', humanoids: 'chispa', manipulation: 'chispa', drones: 'chispa', navigation: 'chispa', slam: 'chispa',
    control: 'mate', kinematics: 'mate', dsp: 'mate', 'state-estimation': 'mate', simulation: 'mate',
    vision: 'neura', 'machine-learning': 'neura', 'reinforcement-learning': 'neura', 'learn-ai': 'neura', 'ai-for-developers': 'neura'
  };
  // In these courses the first call for help goes to Mate, the second to Kernel.
  var MATHS = { control: 1, kinematics: 1, dsp: 1, 'state-estimation': 1, simulation: 1, navigation: 1, slam: 1, humanoids: 1, drones: 1 };

  function card(id) {
    var c = CAST[id] || CAST.zack;
    if (!CAST[id]) id = 'zack';
    return { id: id, name: c.name, role: c.role, accent: c.accent, style: c.style, hello: c.hello, face: FACES + id + '.jpg' };
  }

  function lead(courseId) { return card(LEADS[courseId] || 'zack'); }

  function node(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  // A card with the face of whoever speaks, next to the helper. Buttons are optional.
  var shown = null;
  function hideCard() { if (shown) shown.remove(); shown = null; }
  function speak(id, text, buttons, stay) {
    hideCard();
    var p = card(id);
    var box = node('div', 'cast-card');
    box.style.setProperty('--cast-acc', p.accent);
    box.setAttribute('role', 'status');
    var face = node('img', 'cast-face');
    face.src = p.face;
    face.alt = '';
    var words = node('div', 'cast-words');
    words.appendChild(node('b', null, p.name));
    words.appendChild(node('p', null, text));
    if (buttons && buttons.length) {
      var row = node('div', 'cast-buttons');
      buttons.forEach(function (b) {
        var btn = node('button', b.main ? 'cast-btn is-main' : 'cast-btn', b.label);
        btn.type = 'button';
        btn.addEventListener('click', b.run);
        row.appendChild(btn);
      });
      words.appendChild(row);
    }
    var close = node('button', 'cast-x', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', hideCard);
    box.appendChild(face);
    box.appendChild(words);
    box.appendChild(close);
    document.body.appendChild(box);
    shown = box;
    if (!stay) setTimeout(function () { if (shown === box) hideCard(); }, 9000);
  }

  // ---------- the duel with Bug ----------
  // Small, realistic changes. Bug tries them until one really breaks the
  // student's solution, so the mission's own check decides what counts.
  var SABOTAGES = [
    [/<=/, '<'], [/>=/, '>'], [/>=/, '<='], [/<=/, '>='], [/(^|[^<>=!-])>(?![=>])/, '$1<'], [/(^|[^<>=!-])<(?![=<])/, '$1>'], [/==/, '!='], [/!=/, '=='],
    [/\b(\d)(\d)(\d+)\b/, '$2$1$3'],
    [/\+= ?1\b/, '+= 2'], [/-= ?1\b/, '-= 2'], [/\+ ?1\b/, '- 1'], [/- ?1\b/, '+ 1'],
    [/\[0\]/, '[1]'], [/\[-1\]/, '[-2]'], [/\band\b/, 'or'], [/\bor\b/, 'and'], [/&&/, '||'], [/\|\|/, '&&'],
    [/\bTrue\b/, 'False'], [/\bFalse\b/, 'True'], [/\btrue\b/, 'false'], [/\bfalse\b/, 'true'],
    [/range\(([^(),]+)\)/, 'range($1 - 1)'], [/(\w)\s\*\s(\w)/, '$1 + $2'], [/(\w)\s\/\s(\w)/, '$1 * $2'], [/\bmax\(/, 'min('], [/\bmin\(/, 'max(']
  ];
  var MAX_TRIES = 6;
  var DUEL_MS = 120000;

  function shuffle(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = copy[i]; copy[i] = copy[j]; copy[j] = t; }
    return copy;
  }

  // Only code is touched: comment lines and the text inside strings stay as
  // they are, so the bug is always one of logic.
  function sabotage(code, rule) {
    var lines = code.split('\n');
    var order = shuffle(lines.map(function (_, i) { return i; }));
    for (var k = 0; k < order.length; k++) {
      var i = order[k], line = lines[i];
      if (/^\s*(#|\/\/)/.test(line) || !rule[0].test(line.replace(/(["'])(?:\\.|(?!\1).)*\1/g, '""'))) continue;
      var changed = line.replace(rule[0], rule[1]);
      if (changed === line) continue;
      lines[i] = changed;
      return { code: lines.join('\n'), line: i + 1, before: line.trim(), after: changed.trim() };
    }
    return null;
  }

  function wins(add) {
    var n = 0;
    try { n = Number(localStorage.getItem(WINS_KEY) || 0) + (add || 0); if (add) localStorage.setItem(WINS_KEY, String(n)); } catch (e) {}
    return n;
  }

  // Wires the hand-off and the duel into a mission page. The page passes:
  //   mascot   the helper, to switch who speaks
  //   courseId the course, to pick the lead and the helper
  //   code     true when the mission is code the checker can test
  //   getCode, setCode(text, save), passes(text) -> Promise<boolean>
  function lesson(page) {
    var mascot = page.mascot;
    var main = lead(page.courseId);
    var misses = 0;
    var duel = null;

    function backToLead() { if (mascot && mascot.character().id !== main.id) mascot.setCharacter(main); }

    function handOff() {
      var helper = card(main.id !== 'mate' && MATHS[page.courseId] && misses === 2 ? 'mate' : 'kernel');
      if (!mascot) return;
      mascot.say('Two misses in a row. Let me call **' + helper.name + '**, they see this kind of thing differently.', 12000, {
        label: 'Talk to ' + helper.name,
        run: function () { mascot.setCharacter(helper); mascot.open(); }
      });
    }

    function endDuel(won) {
      if (!duel) return;
      var d = duel;
      duel = null;
      clearInterval(d.clock);
      document.body.classList.remove('cast-in-duel');
      d.bar.remove();
      page.setCode(d.original, true);
      if (won) {
        var total = wins(1);
        speak('bug', total === 1 ? 'Fine. You found it. First win against me... enjoy it.' : 'Again?! That is ' + total + ' wins against me. I will be back.');
      } else {
        speak('bug', 'Got you. It was line ' + d.bug.line + ': "' + d.bug.after + '" should be "' + d.bug.before + '". Your code is back.', null, true);
      }
    }

    function startDuel() {
      if (duel) return;
      var original = page.getCode();
      speak('bug', 'Hold on, let me look for a weak spot...', null, true);
      var rules = shuffle(SABOTAGES), tries = 0;
      (function attempt(k) {
        if (k >= rules.length || tries >= MAX_TRIES) {
          speak('bug', 'I tried ' + tries + (tries === 1 ? ' trick' : ' tricks') + ' and your code survived. Respect. This round is yours.');
          if (tries) wins(1);
          return;
        }
        var s = sabotage(original, rules[k]);
        if (!s) return attempt(k + 1);
        tries++;
        page.passes(s.code).then(function (stillPasses) {
          if (stillPasses) return attempt(k + 1);
          page.setCode(s.code, false);
          document.body.classList.add('cast-in-duel');
          var bar = node('div', 'cast-duel');
          bar.setAttribute('role', 'timer');
          var clock = node('b', null, '2:00');
          bar.appendChild(node('span', null, 'Bug broke one line of your code. Find it and press Check.'));
          bar.appendChild(clock);
          var giveUp = node('button', 'cast-btn', 'Give up');
          giveUp.type = 'button';
          giveUp.addEventListener('click', function () { endDuel(false); });
          bar.appendChild(giveUp);
          document.body.appendChild(bar);
          var end = Date.now() + DUEL_MS;
          duel = { original: original, bug: s, bar: bar, clock: setInterval(function () {
            var left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
            clock.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
            if (!left) endDuel(false);
          }, 250) };
          speak('bug', 'Done. I changed ONE line. Two minutes. Tick tock.');
        }, function () { attempt(k + 1); });
      })(0);
    }

    // Leaving in the middle of a duel must not keep Bug's line as the draft.
    addEventListener('pagehide', function () { if (duel) page.setCode(duel.original, true); });

    document.addEventListener('academy:result', function (e) {
      var ok = e.detail && e.detail.ok;
      if (duel) {
        if (ok) endDuel(true);
        return;
      }
      if (!ok) {
        misses++;
        if (misses === 2 || misses === 4) handOff();
        return;
      }
      misses = 0;
      backToLead();
      if (!page.code) return;
      var won = wins(0);
      setTimeout(function () {
        speak('bug', won ? 'Passed again. ' + won + ' wins against me so far. Double or nothing?' : 'Passed? Let me break your code. If you find my bug in two minutes, you win.', [
          { label: 'Duel Bug', main: true, run: startDuel },
          { label: 'Not now', run: hideCard }
        ], true);
      }, 1400);
    });
  }

  root.Cast = {
    card: card,
    lead: lead,
    all: function () { return Object.keys(CAST).map(card); },
    lesson: lesson
  };
})(window);
