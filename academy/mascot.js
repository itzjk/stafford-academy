// Zerack, the academy mascot and the helper in the bottom right corner.
// It answers with the best brain available: Chrome's on-device AI, then
// Gemini if someone connected a key, then offline answers built from the open
// mission (task, hint, checker output) and a guide to Python errors.
(function (root) {
  'use strict';

  if (root.__mascot) return;
  root.__mascot = true;

  var A = root.Academy || {};
  var NAME = 'Zerack';
  var THREAD_KEY = 'stafford.mascot.thread.';
  var still = false;
  try { still = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  // ---------- the robot ----------

  var ROBOT_SVG =
    '<svg class="mc-svg" viewBox="0 0 120 160" aria-hidden="true">' +
    '<defs>' +
    '<linearGradient id="mcMetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#dfe6f2"/><stop offset="1" stop-color="#aab6cc"/></linearGradient>' +
    '<linearGradient id="mcVisor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2540"/><stop offset="1" stop-color="#0a0f1d"/></linearGradient>' +
    '<radialGradient id="mcFlame" cx=".5" cy=".2" r=".8"><stop offset="0" stop-color="#fff6c2"/><stop offset=".45" stop-color="#ffd43b"/><stop offset="1" stop-color="#ff6a2b" stop-opacity="0"/></radialGradient>' +
    '</defs>' +
    '<g class="mc-flame"><ellipse cx="46" cy="140" rx="7" ry="16" fill="url(#mcFlame)"/><ellipse cx="74" cy="140" rx="7" ry="16" fill="url(#mcFlame)"/></g>' +
    '<rect x="38" y="112" width="16" height="14" rx="4" fill="#3776ab" stroke="#0d1424" stroke-width="2.5"/>' +
    '<rect x="66" y="112" width="16" height="14" rx="4" fill="#3776ab" stroke="#0d1424" stroke-width="2.5"/>' +
    '<g class="mc-arm-l"><rect x="16" y="80" width="14" height="30" rx="7" fill="url(#mcMetal)" stroke="#0d1424" stroke-width="2.5"/><circle cx="23" cy="112" r="6" fill="#ffd43b" stroke="#0d1424" stroke-width="2.5"/></g>' +
    '<g class="mc-arm-r"><rect x="90" y="80" width="14" height="30" rx="7" fill="url(#mcMetal)" stroke="#0d1424" stroke-width="2.5"/><circle cx="97" cy="112" r="6" fill="#ffd43b" stroke="#0d1424" stroke-width="2.5"/></g>' +
    '<rect x="28" y="74" width="64" height="44" rx="16" fill="url(#mcMetal)" stroke="#0d1424" stroke-width="2.8"/>' +
    '<rect x="46" y="84" width="28" height="18" rx="6" fill="#0d1424"/>' +
    '<rect class="mc-chest" x="50" y="88" width="20" height="10" rx="3" fill="#7deeff"/>' +
    '<line x1="60" y1="20" x2="60" y2="8" stroke="#0d1424" stroke-width="3" stroke-linecap="round"/>' +
    '<circle class="mc-antenna" cx="60" cy="7" r="5.5" fill="#ffd43b" stroke="#0d1424" stroke-width="2.5"/>' +
    '<rect x="20" y="18" width="80" height="58" rx="26" fill="url(#mcMetal)" stroke="#0d1424" stroke-width="2.8"/>' +
    '<rect x="30" y="30" width="60" height="34" rx="16" fill="url(#mcVisor)"/>' +
    '<path d="M36 36 q10 -5 22 -2" stroke="rgba(255,255,255,.35)" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<g class="mc-eyes"><ellipse cx="48" cy="48" rx="5" ry="6.5" fill="#7deeff"/><ellipse cx="72" cy="48" rx="5" ry="6.5" fill="#7deeff"/></g>' +
    '<path class="mc-mouth" d="M52 57 q8 6 16 0" stroke="#7deeff" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="36" cy="58" r="3.5" fill="#ff8fa3" opacity=".55"/><circle cx="84" cy="58" r="3.5" fill="#ff8fa3" opacity=".55"/>' +
    '</svg>';

  function node(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  function renderText(n, text) {
    if (A.markdown) n.appendChild(A.markdown(text));
    else n.textContent = text;
  }

  // ---------- what it knows offline ----------

  var ERRORS = [
    { re: /IndentationError|TabError/, t: 'IndentationError',
      d: 'The spaces at the start of a line matter in Python. Every line inside an `if`, `for`, `while` or `def` must be pushed in by the same amount, usually 4 spaces. Check the line it points to: it is pushed in too much, too little, or not at all.' },
    { re: /SyntaxError/, t: 'SyntaxError',
      d: 'Python could not even read your code, so nothing ran. It is almost always a small typo: a missing closing quote `"`, a missing `)`, or a missing `:` at the end of an `if`, `for` or `def` line. Look at the line it points to **and the line just above it**.' },
    { re: /UnboundLocalError/, t: 'UnboundLocalError',
      d: 'Inside a function you used a variable before giving it a value there. Give it a value first, or pass it into the function as a parameter.' },
    { re: /NameError/, t: 'NameError',
      d: 'You used a name Python does not know. Three usual causes: a spelling mistake (Python cares about capital letters), using a variable before the line that creates it, or text that is missing its quotes, so Python thinks it is a name.' },
    { re: /TypeError/, t: 'TypeError',
      d: 'You mixed two kinds of values that do not go together, like adding text and a number: `"age: " + 12`. Convert one of them: `str(12)` turns a number into text, `int("12")` turns text into a number. An f-string also works: `f"age: {12}"`.' },
    { re: /ValueError/, t: 'ValueError',
      d: 'The kind of value is right but its content is not. The classic one is `int("hello")`: that text is not a number. Check what is actually inside the variable with a `print` before the line that fails.' },
    { re: /IndexError/, t: 'IndexError',
      d: 'You asked a list for a position that does not exist. Positions start at **0**, so a list of 3 items has positions 0, 1 and 2. The last one is always `len(my_list) - 1`, or simply `my_list[-1]`.' },
    { re: /KeyError/, t: 'KeyError',
      d: 'You asked a dictionary for a key it does not have. Check the spelling and the capital letters of the key. If it might be missing, use `d.get("key")`, which gives `None` instead of crashing.' },
    { re: /ZeroDivisionError/, t: 'ZeroDivisionError',
      d: 'Something got divided by zero. Before dividing, check that the number below is not 0, for example with `if total > 0:`.' },
    { re: /AttributeError/, t: 'AttributeError',
      d: 'You called a method that this kind of value does not have, like `.append()` on text. Check what type the variable really is with `print(type(x))`.' },
    { re: /ModuleNotFoundError|ImportError/, t: 'ImportError',
      d: 'Python could not find what you tried to import. Check the spelling of the module. In this academy the standard library works, plus the packages the mission uses.' },
    { re: /FileNotFoundError/, t: 'FileNotFoundError',
      d: 'The file does not exist with that name at that path. Check the spelling, and that you wrote the file before reading it.' },
    { re: /RecursionError/, t: 'RecursionError',
      d: 'A function keeps calling itself and never stops. It needs a case that returns without calling itself again.' },
    { re: /EOFError/, t: 'EOFError',
      d: 'Your code called `input()` more times than this mission gives it lines to read. Only ask for input where the task says so.' }
  ];

  var TOPICS = [
    { k: /\bprint\b|imprim/, d: '`print(...)` sends something to the console. Text goes in quotes: `print("hi")`. Several values separated by commas get a space between them: `print("level", 3)` prints `level 3`.' },
    { k: /f-?string|\bf"|formato|format/, d: 'An f-string puts values inside text. Put an `f` before the quotes and the variable in braces: `name = "Ana"` then `print(f"hi {name}")` prints `hi Ana`.' },
    { k: /variable|asign|assign/, d: 'A variable is a name that holds a value: `score = 10`. The name goes on the left, `=`, then the value. From then on `score` means 10. You can change it later: `score = score + 5`.' },
    { k: /string|texto|\btext\b|comillas|quote/, d: 'Text (a string) always goes between quotes: `"hello"` or `\'hello\'`. Without quotes Python thinks it is a variable name. Join texts with `+`: `"Py" + "thon"` gives `Python`.' },
    { k: /\binput\b|entrada|pregunt/, d: '`input("question")` waits for the user to type something and gives it back **as text**. If you need a number: `age = int(input("Age: "))`.' },
    { k: /\bif\b|\belse\b|elif|condici|condition/, d: 'An `if` runs lines only when something is true:\n\n```python\nif score >= 10:\n    print("pass")\nelse:\n    print("try again")\n```\n\nDo not forget the `:` and the 4 spaces inside.' },
    { k: /\bfor\b|bucle|loop|repet/, d: 'A `for` loop repeats lines once for each item:\n\n```python\nfor name in ["Ana", "Leo"]:\n    print("hi", name)\n```\n\n`range(5)` gives 0, 1, 2, 3, 4 if you need to count.' },
    { k: /\bwhile\b|mientras/, d: 'A `while` loop repeats while a condition is true. Make sure something inside changes, or it never stops:\n\n```python\nn = 3\nwhile n > 0:\n    print(n)\n    n = n - 1\n```' },
    { k: /\blist|lista|append|\[/, d: 'A list keeps several values in order: `nums = [4, 8, 15]`. `nums[0]` is the first one, `len(nums)` counts them, `nums.append(16)` adds one at the end.' },
    { k: /dict|diccionario|\bkey|clave/, d: 'A dictionary stores values by name: `player = {"name": "Ana", "xp": 40}`. Read one with `player["xp"]`, change it with `player["xp"] = 50`.' },
    { k: /\bdef\b|funci|function|return|retorn/, d: 'A function is a named block you can run many times:\n\n```python\ndef double(n):\n    return n * 2\n\nprint(double(4))\n```\n\n`return` sends the result back to whoever called it. `print` only shows it.' },
    { k: /indent|sangr|espacio|space|tab/, d: 'In Python the spaces at the start of a line are part of the code. The lines inside an `if`, `for` or `def` go 4 spaces in, all by the same amount. The Tab key in the editor puts them for you.' },
    { k: /coment|comment|#/, d: 'Anything after `#` on a line is a comment: Python ignores it. Use it to leave notes for yourself.' },
    { k: /import|modul|library|librer/, d: '`import math` brings in extra tools that come with Python. Then you use them with the module name: `math.sqrt(16)`.' },
    { k: /int\b|float|number|n[uú]mero|decimal|round/, d: 'Whole numbers are `int` (`7`), numbers with decimals are `float` (`7.5`). `int("7")` turns text into a number, `round(3.14159, 2)` gives `3.14`.' },
    { k: /how long|how much time|what time|cu[aá]nto tiempo|tiempo|hours|horas/, d: 'It depends on the course: each one shows its hours on the home page. **Programming from Zero** takes about 26 hours. Twenty or thirty minutes a day, every day, works better than one long session a week. Finish one mission, then the next.' },
    { k: /xp|level|nivel|progres|guard|save/, d: 'Each mission you pass gives XP and raises your level. Your progress is saved in this browser, on this computer.' }
  ];

  function errorKind(text) {
    for (var i = 0; i < ERRORS.length; i++) if (ERRORS[i].re.test(text)) return ERRORS[i];
    return null;
  }

  function errorLine(text) {
    var m, last = null, re = /line (\d+)/g;
    while ((m = re.exec(text))) last = m[1];
    return last;
  }

  function screenOutput() {
    var out = document.getElementById('output');
    if (!out) return { cls: '', text: '' };
    return { cls: out.className, text: out.innerText || out.textContent || '' };
  }

  function explainError() {
    var s = screenOutput();
    if (!s.text || /is-idle/.test(s.cls)) {
      return 'Press **Check my code** first. When the screen answers, I will read it with you.';
    }
    if (/is-good/.test(s.cls)) return 'There is no error: your code passed this mission. Nice work!';
    if (/never finished/.test(s.text)) {
      return 'Your program never finished. That almost always means a loop that never stops: a `while` whose condition never becomes false. Check that something inside the loop changes on every turn.';
    }
    var kind = errorKind(s.text);
    if (kind) {
      var line = errorLine(s.text);
      var unknown = /name '([^']+)' is not defined/.exec(s.text);
      var extra = '';
      if (unknown) extra = '\n\nHere Python does not know `' + unknown[1] + '`. If you meant the text ' + unknown[1] + ', write it as `"' + unknown[1] + '"`.';
      return '**' + kind.t + '**' + (line ? ' on line ' + line : '') + '\n\n' + kind.d + extra;
    }
    if (/Expected:/.test(s.text)) return compareOutput();
    if (/Missing:/.test(s.text)) {
      return 'The checker is looking for pieces of code that are not in your answer yet. Read the list under the result: each **Missing** line is something the task asks you to write.';
    }
    return 'I read the result but I do not recognise that error. Read the **last line** of the message: it names the problem. Then look at the line number it points to.';
  }

  function compareOutput() {
    var s = screenOutput();
    var parts = s.text.split('Expected:');
    if (parts.length < 2) return 'Run your code first, then I can compare what it printed with what the mission wants.';
    var yours = parts[0].split('\n').slice(1).join('\n').trim().split('\n');
    var wanted = parts[1].trim().split('\n');
    for (var i = 0; i < Math.max(yours.length, wanted.length); i++) {
      var a = (yours[i] || '').trimEnd(), b = (wanted[i] || '').trimEnd();
      if (a === b) continue;
      var tip = '';
      if (a.toLowerCase() === b.toLowerCase()) tip = ' The letters are the same, only the **capital letters** change.';
      else if (a.replace(/\s+/g, '') === b.replace(/\s+/g, '')) tip = ' Only the **spaces** are different.';
      else if (!a) tip = ' Your program printed fewer lines than it should.';
      else if (!b) tip = ' Your program printed more lines than it should.';
      return 'Your code runs, but line ' + (i + 1) + ' of the output is different.\n\nYours: `' + (a || '(nothing)') + '`\n\nExpected: `' + (b || '(nothing)') + '`\n\n' + tip.trim();
    }
    return 'Your output looks the same as the expected one. Check for extra spaces at the end of a line, then run it again.';
  }

  // The keyword lists also match common Spanish words, so students who write
  // in Spanish still get the right answer.
  var OFFLINE_FALLBACK = 'Without AI I only know this mission and the basics of Python. Try asking about an error, a hint, or a word like `print`, `if`, `for`, `list` or `def`.';

  function answer(question, ctx) {
    var q = String(question || '').toLowerCase();
    var m = ctx.lesson;
    if (m && /error|fall|crash|traceback|wrong|mal|no funciona|not work|why|por ?qu/.test(q)) return explainError();
    if (m && /hint|pista|ayuda|help|stuck|atasc|no s[eé]/.test(q)) return m.lesson.hint ? 'Hint: ' + m.lesson.hint : explainTask(m);
    if (m && /task|tarea|what.*do|qu[eé] (hago|pide|tengo)|mission|misi[oó]n/.test(q)) return explainTask(m);
    if (m && /solution|soluci|answer|respuesta/.test(q)) {
      return 'The **Show solution** button is under the editor. Try the hint first: you learn much more if the last step is yours. If you still want it, open it, read it, then close it and write it again from memory.';
    }
    for (var i = 0; i < TOPICS.length; i++) if (TOPICS[i].k.test(q)) return TOPICS[i].d;
    if (/hola|hi\b|hello|hey/.test(q)) return 'Hi! Ask me about your code, an error, or a Python word like `list`, `for` or `def`.';
    if (!m && ctx.course) return 'This course is **' + ctx.course.title + '**. Open the first mission you have not done yet and I will help you from there.';
    return OFFLINE_FALLBACK;
  }

  function explainTask(m) {
    var l = m.lesson;
    return '**What this mission asks:** ' + (l.task || '') + (l.goal ? '\n\n**What you will be able to do after:** ' + l.goal : '');
  }

  // ---------- on-device AI ----------
  // Chrome ships a small model (Gemini Nano) that runs on the computer itself:
  // free, no API key, no account, and nothing leaves the machine. When the
  // computer cannot run it, Zerack falls back to the offline answers above.

  var SYSTEM_PROMPT =
    'You are Zerack, a friendly robot tutor inside Stafford Academy, a free app where students learn Python. ' +
    'Explain things simply, like a patient teacher talking to a beginner. Keep answers short: at most about 120 words. ' +
    'Use Markdown: `inline code`, **bold** and ```python fenced blocks```. ' +
    'Never hand over the full solution to a mission. Guide with questions, hints and tiny examples instead, ' +
    'unless the student says they already tried and explicitly asks for the answer. ' +
    'Answer in the same language the student writes in.';

  var ai = { state: 'unknown', base: null, creating: null };
  var AI_TIMEOUT_MS = 20000;

  function aiApi() { return typeof root.LanguageModel !== 'undefined' ? root.LanguageModel : null; }

  var AI_LANGUAGES = {
    expectedInputs: [{ type: 'text', languages: ['en', 'es'] }],
    expectedOutputs: [{ type: 'text', languages: ['en', 'es'] }]
  };

  function checkAi() {
    var api = aiApi();
    if (!api || !api.availability) { ai.state = 'unavailable'; return Promise.resolve(ai.state); }
    return api.availability(AI_LANGUAGES).then(function (s) { ai.state = s; return s; }, function () { ai.state = 'unavailable'; return ai.state; });
  }

  // Creating the session may download the model the first time; that needs a
  // click or key press, so it only happens when the student asks something.
  function aiSession(onProgress) {
    if (ai.base) return Promise.resolve(ai.base);
    if (ai.creating) return ai.creating;
    var api = aiApi();
    ai.creating = api.create(Object.assign({
      initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
      monitor: function (m) {
        m.addEventListener('downloadprogress', function (e) { if (onProgress) onProgress(e.loaded); });
      }
    }, AI_LANGUAGES)).then(function (session) {
      ai.base = session;
      ai.state = 'available';
      ai.creating = null;
      return session;
    }, function (err) {
      ai.creating = null;
      throw err;
    });
    return ai.creating;
  }

  function trim(text, max) {
    text = String(text || '').replace(/\s+\n/g, '\n').trim();
    return text.length > max ? text.slice(0, max) + ' ...' : text;
  }

  function contextFor(ctx) {
    var parts = [];
    if (ctx.course) parts.push('Course: ' + ctx.course.title);
    if (ctx.lesson) {
      var l = ctx.lesson.lesson;
      parts.push('Mission: ' + l.title);
      parts.push('Task: ' + trim(l.task, 700));
      if (l.hint) parts.push('Hint the mission offers: ' + trim(l.hint, 300));
      var code = document.getElementById('code');
      parts.push('Student code right now:\n' + (code && code.value.trim() ? trim(code.value, 1500) : '(empty)'));
      var out = screenOutput();
      if (out.text && !/is-idle/.test(out.cls)) parts.push('What the checker answered:\n' + trim(out.text, 900));
    }
    return parts.join('\n\n');
  }

  // Streams an answer into onText. Each question runs on a clone of the base
  // session, so a long chat never overflows the model's context window.
  function aiAnswer(question, ctx, history, onText, onProgress) {
    return aiSession(onProgress).then(function (base) {
      return base.clone().then(function (s) {
        var recent = history.slice(-6).map(function (m) { return (m.who === 'me' ? 'Student: ' : 'Zerack: ') + trim(m.text, 400); }).join('\n');
        var prompt = (contextFor(ctx) ? 'Context:\n' + contextFor(ctx) + '\n\n' : '') +
          (recent ? 'Conversation so far:\n' + recent + '\n\n' : '') +
          'Student: ' + question;
        var stream = s.promptStreaming(prompt);
        var reader = stream.getReader();
        var text = '';
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) { try { s.destroy(); } catch (e) {} return text; }
            // Older Chrome builds sent the whole text so far, newer ones send only the new piece.
            text = r.value.indexOf(text) === 0 ? r.value : text + r.value;
            onText(text);
            return pump();
          });
        }
        return pump();
      });
    });
  }

  // ---------- Gemini, with a key pasted by the user ----------
  // Any computer with internet can use this. The key is saved on this
  // computer only (chrome.storage), never in the code. Questions sent this
  // way go to Google, which the settings screen says before connecting.

  var GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/';
  var KEY_SETTING = 'stafford.ai.key';
  var MODEL_SETTING = 'stafford.ai.model';
  var CLOUD_TIMEOUT_MS = 30000;
  var cloud = { key: null, model: null };

  function loadCloud() {
    if (!A.getSetting) return Promise.resolve(cloud);
    return Promise.all([A.getSetting(KEY_SETTING), A.getSetting(MODEL_SETTING)]).then(function (v) {
      cloud.key = v[0] || null;
      cloud.model = v[1] || null;
      return cloud;
    });
  }

  function geminiError(res) {
    return res.json().catch(function () { return {}; }).then(function (j) {
      var err = new Error((j && j.error && j.error.message) || ('HTTP ' + res.status));
      err.kind = res.status === 429 ? 'limit' : (res.status === 400 || res.status === 401 || res.status === 403) ? 'key' : 'server';
      throw err;
    });
  }

  // Model names change over time, so the newest stable "flash" model is
  // picked from the list the key can use instead of being hard-coded.
  function pickModel(key) {
    return fetch(GEMINI_URL + 'models?pageSize=1000', { headers: { 'x-goog-api-key': key } }).then(function (res) {
      if (!res.ok) return geminiError(res);
      return res.json();
    }).then(function (j) {
      var models = (j.models || []).filter(function (m) {
        return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0 && /gemini-[\d.]+-flash/.test(m.name) &&
          !/lite|image|tts|audio|live|embedding|exp|thinking/.test(m.name);
      });
      function version(m) { var v = /gemini-([\d.]+)/.exec(m.name); return v ? parseFloat(v[1]) : 0; }
      models.sort(function (a, b) {
        var preview = (/preview/.test(a.name) ? 1 : 0) - (/preview/.test(b.name) ? 1 : 0);
        return preview || version(b) - version(a) || a.name.length - b.name.length;
      });
      if (!models.length) { var e = new Error('This key cannot use any Gemini Flash model.'); e.kind = 'key'; throw e; }
      return models[0].name;
    });
  }

  function connectCloud(key) {
    key = String(key || '').trim();
    return pickModel(key).then(function (model) {
      cloud.key = key;
      cloud.model = model;
      return Promise.all([A.setSetting(KEY_SETTING, key), A.setSetting(MODEL_SETTING, model)]).then(function () { return model; });
    });
  }

  function disconnectCloud() {
    cloud.key = null;
    cloud.model = null;
    return Promise.all([A.setSetting(KEY_SETTING, null), A.setSetting(MODEL_SETTING, null)]);
  }

  // Streams the answer over server-sent events into onText.
  function cloudAnswer(question, ctx, history, onText) {
    var contents = history.slice(-8).map(function (m) {
      return { role: m.who === 'me' ? 'user' : 'model', parts: [{ text: trim(m.text, 1200) }] };
    });
    var context = contextFor(ctx);
    contents.push({ role: 'user', parts: [{ text: (context ? 'Context:\n' + context + '\n\n' : '') + question }] });
    return fetch(GEMINI_URL + cloud.model + ':streamGenerateContent?alt=sse', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': cloud.key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 2048 }
      })
    }).then(function (res) {
      if (!res.ok) return geminiError(res);
      var reader = res.body.getReader(), decoder = new TextDecoder(), buffer = '', text = '';
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return text;
          buffer += decoder.decode(r.value, { stream: true }).replace(/\r/g, '');
          var events = buffer.split('\n\n');
          buffer = events.pop();
          events.forEach(function (ev) {
            var data = ev.split('\n').filter(function (l) { return l.indexOf('data:') === 0; }).map(function (l) { return l.slice(5).trim(); }).join('');
            if (!data) return;
            try {
              var parts = ((JSON.parse(data).candidates || [])[0] || {}).content;
              (parts && parts.parts || []).forEach(function (p) { if (p.text && !p.thought) text += p.text; });
            } catch (e) {}
          });
          if (text) onText(text);
          return pump();
        });
      }
      return pump();
    });
  }

  // ---------- the panel ----------

  function mount(options) {
    options = options || {};
    var page = options.page || 'course';

    var rootNode = node('div', 'mc-root');
    var button = node('button', 'mc-bot');
    button.type = 'button';
    button.setAttribute('aria-label', 'Ask ' + NAME + ', your helper');
    button.title = 'Ask ' + NAME;
    button.innerHTML = ROBOT_SVG;

    var bubble = node('div', 'mc-bubble');
    bubble.hidden = true;
    var bubbleText = node('div', 'mc-bubble-t');
    var bubbleClose = node('button', 'mc-bubble-x', '×');
    bubbleClose.type = 'button';
    bubbleClose.setAttribute('aria-label', 'Close');
    bubble.appendChild(bubbleClose);
    bubble.appendChild(bubbleText);

    var panel = node('section', 'mc-panel');
    panel.hidden = true;
    panel.setAttribute('aria-label', NAME + ', your helper');
    var head = node('header', 'mc-head');
    var face = node('span', 'mc-face');
    face.innerHTML = ROBOT_SVG;
    var nameBox = node('span', 'mc-name');
    nameBox.appendChild(node('b', null, NAME));
    function offlineLabel() { return page === 'lesson' ? 'sees this mission · offline mode' : 'your helper · offline mode'; }
    var subtitle = node('small', null, offlineLabel());
    nameBox.appendChild(subtitle);
    function statusLabel() {
      if (ai.state === 'available') return 'AI on · runs on this computer';
      if (cloud.key) return 'AI on · Gemini';
      return offlineLabel();
    }
    function refreshStatus() { subtitle.textContent = statusLabel(); }
    Promise.all([checkAi(), loadCloud()]).then(refreshStatus);
    var gear = node('button', 'mc-icon mc-gear', '⚙');
    gear.type = 'button';
    gear.title = 'Connect AI';
    gear.setAttribute('aria-label', 'Connect AI');
    var restart = node('button', 'mc-icon', '↺');
    restart.type = 'button';
    restart.title = 'Start over';
    var closeBtn = node('button', 'mc-icon', '×');
    closeBtn.type = 'button';
    closeBtn.title = 'Hide';
    head.appendChild(face); head.appendChild(nameBox); head.appendChild(gear); head.appendChild(restart); head.appendChild(closeBtn);

    var body = node('div', 'mc-body');
    var chips = node('div', 'mc-chips');
    var form = node('form', 'mc-form');
    var input = node('input', 'mc-input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.placeholder = page === 'lesson' ? 'Why does my code fail?' : 'Ask me something about Python';
    var send = node('button', 'mc-send', 'Ask');
    send.type = 'submit';
    form.appendChild(input); form.appendChild(send);
    panel.appendChild(head); panel.appendChild(body); panel.appendChild(chips); panel.appendChild(form);

    // The "Connect AI" screen replaces the chat until the user goes back.
    var settings = node('div', 'mc-settings');
    settings.hidden = true;
    panel.appendChild(settings);

    function paintSettings(message, isError) {
      A.clear(settings);
      settings.appendChild(node('h3', null, 'Connect AI'));
      var state = node('p', 'mc-state');
      if (ai.state === 'available') state.textContent = 'Chrome\'s built-in AI is on for this computer. It is free and private, so you do not need a key.';
      else if (cloud.key) state.textContent = 'Connected to Gemini (' + String(cloud.model || '').replace('models/', '') + ') with the key ending in ' + cloud.key.slice(-4) + '.';
      else state.textContent = 'Not connected. Zerack can explain errors, give hints and teach Python basics, but it cannot answer other questions yet.';
      settings.appendChild(state);
      settings.appendChild(renderInto(node('div', 'mc-help'),
        'Paste a **free Gemini API key** and Zerack can answer any question. Get one at Google AI Studio. Google only gives keys to people 18 or older, so ask a teacher or a parent.\n\n' +
        'The key is saved **only on this computer**. When it is used, your question and your code are sent to Google to get the answer.'));
      var link = node('a', 'mc-link', 'Get a free key at aistudio.google.com ↗');
      link.href = 'https://aistudio.google.com/apikey';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      settings.appendChild(link);
      var keyForm = node('form', 'mc-form mc-key-form');
      var keyInput = node('input', 'mc-input');
      keyInput.type = 'password';
      keyInput.autocomplete = 'off';
      keyInput.placeholder = cloud.key ? 'Paste a new key to replace it' : 'Paste your Gemini API key';
      keyInput.setAttribute('aria-label', 'Gemini API key');
      var connect = node('button', 'mc-send', 'Connect');
      connect.type = 'submit';
      keyForm.appendChild(keyInput); keyForm.appendChild(connect);
      settings.appendChild(keyForm);
      var note = node('p', 'mc-note' + (isError ? ' is-error' : ''), message || '');
      settings.appendChild(note);
      keyForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var key = keyInput.value.trim();
        if (!key) return;
        connect.disabled = true;
        note.className = 'mc-note';
        note.textContent = 'Checking the key...';
        connectCloud(key).then(function () {
          refreshStatus();
          paintSettings('Connected. Go back to the chat and ask me anything.');
        }, function (err) {
          connect.disabled = false;
          note.className = 'mc-note is-error';
          note.textContent = err && err.kind === 'key' ? 'That key did not work. Check that you copied all of it.' : 'Could not reach Google right now. Check the internet connection and try again.';
        });
      });
      var row = node('div', 'mc-settings-row');
      var backBtn = node('button', 'mc-chip', '← Back to chat');
      backBtn.type = 'button';
      backBtn.addEventListener('click', function () { showSettings(false); });
      row.appendChild(backBtn);
      if (cloud.key) {
        var remove = node('button', 'mc-chip mc-danger', 'Remove key');
        remove.type = 'button';
        remove.addEventListener('click', function () { disconnectCloud().then(function () { refreshStatus(); paintSettings('The key was removed from this computer.'); }); });
        row.appendChild(remove);
      }
      settings.appendChild(row);
      setTimeout(function () { keyInput.focus(); }, 60);
    }

    function renderInto(n, text) { renderText(n, text); return n; }

    function showSettings(show) {
      settings.hidden = !show;
      body.hidden = show;
      chips.hidden = show;
      form.hidden = show;
      gear.classList.toggle('is-on', show);
      if (show) paintSettings(); else { paint(); input.focus(); }
    }
    gear.addEventListener('click', function () { showSettings(settings.hidden); });

    rootNode.appendChild(panel);
    rootNode.appendChild(bubble);
    rootNode.appendChild(button);
    document.body.appendChild(rootNode);

    var ctx = { course: null, lesson: null };
    var threadKey = THREAD_KEY + page;
    var thread = [];
    try { thread = JSON.parse(sessionStorage.getItem(threadKey) || '[]') || []; } catch (e) { thread = []; }
    if (!Array.isArray(thread)) thread = [];
    function saveThread() { try { sessionStorage.setItem(threadKey, JSON.stringify(thread.slice(-30))); } catch (e) {} }

    function paint() {
      A.clear ? A.clear(body) : (body.innerHTML = '');
      if (!thread.length) {
        var empty = node('div', 'mc-msg mc-from-mascot');
        renderText(empty, panelGreeting());
        body.appendChild(empty);
      }
      thread.forEach(function (m) {
        var row = node('div', 'mc-msg ' + (m.who === 'me' ? 'mc-from-me' : 'mc-from-mascot'));
        renderText(row, m.text);
        if (m.action === 'connect' && ai.state !== 'available' && (!cloud.key || m.keyError)) {
          var cta = node('button', 'mc-connect', 'Connect AI');
          cta.type = 'button';
          cta.addEventListener('click', function () { showSettings(true); });
          row.appendChild(cta);
        }
        body.appendChild(row);
      });
      body.scrollTop = body.scrollHeight;
    }

    function panelGreeting() {
      if (ctx.lesson) return 'I can see this mission, your code and what the checker answered. Tap a button or ask in your own words.';
      if (ctx.course) return 'Hi! This is **' + ctx.course.title + '**. Ask me about any Python word, or open a mission and I will help you with it.';
      return 'Hi! I am ' + NAME + '. Pick a course to start. If you are new, **Programming from Zero** is the first step.';
    }

    var thinking = false;

    function ask(q, shown, offlineOnly) {
      if (thinking) return;
      var history = thread.slice();
      thread.push({ who: 'me', text: shown || q });
      // The model is only used once it is fully on the computer. While it is
      // missing, the offline answer comes right away and the download starts
      // in the background, since this click is the user gesture it needs.
      if (!offlineOnly && (ai.state === 'downloadable' || ai.state === 'downloading')) startDownload();
      var engine = offlineOnly ? null : ai.state === 'available' ? 'device' : cloud.key ? 'cloud' : null;
      if (!engine) {
        var offline = answer(q, ctx);
        // A question outside what Zerack knows offline: offer to connect AI
        // right there, with a button that opens the key screen.
        if (!offlineOnly && offline === OFFLINE_FALLBACK) {
          thread.push({ who: 'mascot', text: 'I do not know that one yet. **Want me to answer anything you ask?** Connect AI and I can.', action: 'connect' });
        } else {
          thread.push({ who: 'mascot', text: offline });
        }
        saveThread();
        paint();
        jump();
        return;
      }
      var reply = { who: 'mascot', text: 'Thinking...' };
      thread.push(reply);
      thinking = true;
      send.disabled = true;
      paint();
      var answered = false;
      var tooSlow = new Promise(function (resolve, reject) {
        setTimeout(function () { if (!answered) reject(new Error('timeout')); }, engine === 'cloud' ? CLOUD_TIMEOUT_MS : AI_TIMEOUT_MS);
      });
      var onText = function (text) { if (thinking) { reply.text = text; paintLast(text); } };
      Promise.race([engine === 'cloud' ? cloudAnswer(q, ctx, history, onText) : aiAnswer(q, ctx, history, onText), tooSlow]).then(function (text) {
        answered = true;
        if (!text) reply.text = answer(q, ctx);
      }, function (err) {
        answered = true;
        // Too slow, failed or not allowed here: answer offline instead. A
        // timeout keeps the AI on for the next question; a real failure turns it off.
        var why = '';
        if (engine === 'cloud') {
          if (err && err.kind === 'limit') why = 'The free AI limit is used up for now. Try again in a minute. Meanwhile, here is what I know:\n\n';
          else if (err && err.kind === 'key') { why = 'The AI key stopped working. Connect again with a new key. Meanwhile, here is what I know:\n\n'; reply.action = 'connect'; reply.keyError = true; }
          else if (err && err.message === 'timeout') why = 'The AI took too long to answer. Here is what I know:\n\n';
          else why = 'I could not reach the AI (is the internet on?). Here is what I know:\n\n';
        } else if (!err || err.message !== 'timeout') {
          ai.state = 'unavailable';
          refreshStatus();
        }
        reply.text = why + answer(q, ctx);
      }).then(function () {
        thinking = false;
        send.disabled = false;
        saveThread();
        paint();
        jump();
      });
    }

    var downloading = false;
    function startDownload() {
      if (downloading) return;
      downloading = true;
      if (!cloud.key) subtitle.textContent = 'downloading AI · offline mode for now';
      aiSession(function (loaded) {
        if (!cloud.key) subtitle.textContent = 'downloading AI ' + Math.round((loaded || 0) * 100) + '% · offline mode for now';
      }).then(refreshStatus, function () {
        ai.state = 'unavailable';
        refreshStatus();
      });
    }

    function paintLast(text) {
      var last = body.lastElementChild;
      if (!last) return;
      A.clear(last);
      renderText(last, text);
      body.scrollTop = body.scrollHeight;
    }

    function quickButtons() {
      A.clear ? A.clear(chips) : (chips.innerHTML = '');
      var options = ctx.lesson
        ? [['Explain my error', 'why does it fail error'], ['Give me a hint', 'hint'], ['What does the task ask?', 'what is the task']]
        : [['What is a variable?', 'variable'], ['How does a for loop work?', 'for loop'], ['What is a function?', 'def function']];
      options.forEach(function (pair) {
        var b = node('button', 'mc-chip', pair[0]);
        b.type = 'button';
        b.addEventListener('click', function () { ask(pair[1], pair[0], true); });
        chips.appendChild(b);
      });
    }

    var open = false;
    function toggle(want) {
      open = want == null ? !open : want;
      panel.hidden = !open;
      rootNode.classList.toggle('is-open', open);
      if (open) { hideBubble(); paint(); setTimeout(function () { input.focus(); }, 60); }
    }

    var bubbleTimer = null;
    function say(text, ms, action) {
      if (open) return;
      A.clear ? A.clear(bubbleText) : (bubbleText.innerHTML = '');
      renderText(bubbleText, text);
      if (action) {
        var b = node('button', 'mc-bubble-b', action.label);
        b.type = 'button';
        b.addEventListener('click', function (e) { e.stopPropagation(); action.run(); });
        bubbleText.appendChild(b);
      }
      bubble.hidden = false;
      bubble.classList.remove('is-in');
      void bubble.offsetWidth;
      bubble.classList.add('is-in');
      clearTimeout(bubbleTimer);
      if (ms) bubbleTimer = setTimeout(hideBubble, ms);
    }
    function hideBubble() { bubble.hidden = true; clearTimeout(bubbleTimer); }

    function jump() {
      if (still) return;
      rootNode.classList.remove('is-jumping');
      void rootNode.offsetWidth;
      rootNode.classList.add('is-jumping');
    }

    function greet() {
      button.classList.add('is-arriving');
      rootNode.classList.add('is-waving');
      setTimeout(function () { rootNode.classList.remove('is-waving'); }, 2600);
    }

    button.addEventListener('click', function () { toggle(); });
    bubble.addEventListener('click', function () { toggle(true); });
    bubbleClose.addEventListener('click', function (e) { e.stopPropagation(); hideBubble(); });
    closeBtn.addEventListener('click', function () { toggle(false); });
    restart.addEventListener('click', function () { thread = []; saveThread(); paint(); input.focus(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) toggle(false); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      input.value = '';
      ask(q);
    });

    // The checker announces every result: celebrate a pass, offer help on a fail.
    document.addEventListener('academy:result', function (e) {
      var r = e.detail || {};
      if (r.ok) {
        jump();
        say('Nice! Mission passed. 🚀', 3500);
      } else {
        say(r.title === 'Your program crashed.' ? 'Ouch, it crashed. Want me to explain the error?' : 'Not yet. Want me to look at it with you?', 9000,
          { label: 'Yes, explain', run: function () { toggle(true); ask('why does it fail error', 'Explain my error', true); } });
      }
    });

    quickButtons();

    // The robot flies in when the page opens. The course arrives a moment
    // later, so the welcome waits until the robot has landed.
    var landed = false, pending = null;
    setTimeout(function () {
      greet();
      setTimeout(function () {
        landed = true;
        if (pending) { say(pending, 10000); pending = null; }
      }, still ? 0 : 1100);
    }, still ? 0 : 350);

    return {
      setCourse: function (course) { ctx.course = course; quickButtons(); },
      setLesson: function (m) { ctx.lesson = m; ctx.course = m && m.course; quickButtons(); },
      welcome: function (text) { if (landed) say(text, 10000); else pending = text; },
      say: say
    };
  }

  root.Mascot = { mount: mount, answer: answer };
})(window);
