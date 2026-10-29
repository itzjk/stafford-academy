(function () {
  'use strict';

  var LX = window.LX;
  if (!LX) return;

  LX.estrellas();
  LX.montarInterruptorPiel();
  LX.montarMascota();

  var cursoId = LX.parametro('c');
  var lecId = LX.parametro('l');
  var estado = { curso: null, leccion: null, siguiente: null, prog: {}, yaHecha: false };

  function salida(clase, titulo, lineas) {
    var out = LX.el('llOut');
    LX.limpiar(out);
    out.className = 'll-out ' + clase;
    if (titulo) { var b = document.createElement('b'); b.textContent = titulo; out.appendChild(b); }
    if (lineas && lineas.length) {
      var ul = document.createElement('ul');
      lineas.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      out.appendChild(ul);
    }
  }

  function normal(s) { return String(s || '').replace(/\r/g, ''); }

  // El check compara texto, asi que el espaciado decidia si una respuesta correcta
  // pasaba: 1133 de los 2509 fragmentos exigidos rechazaban a quien escribiera
  // digitalWrite(LED_PIN,HIGH) sin el espacio. Se aplica igual a los dos lados,
  // asi que no ablanda la comprobacion, solo deja de castigar el formato.
  function aplanar(s) {
    return String(s || '')
      .replace(/\r/g, '')
      .replace(/\s+/g, ' ')
      .replace(/ ?([^\w\s]) ?/g, '$1')
      .trim();
  }
  // Cada lenguaje marca sus comentarios a su manera y confundirlos rechaza codigo
  // bueno: en Python // es division entera y en C o en un device tree # abre una
  // directiva. Barrer los tres marcadores a la vez tiraba 13 soluciones oficiales.
  // h = #, s = // y /* */, x = <!-- -->. Los 15 lenguajes del arbol estan aqui;
  // rojo-learn-paginas.mjs se pone rojo si aparece uno que no lo este.
  var MARCAS = {
    python: 'h', udev: 'h', sh: 'h', bash: 'h', systemd: 'h',
    make: 'h', cmake: 'h', yaml: 'h', srv: 'h', action: 'h',
    arduino: 's', c: 's', cpp: 's', 'c++': 's', dts: 's',
    xml: 'x', urdf: 'x', xacro: 'x'
  };

  // El texto exigido se buscaba en el fuente entero, asi que escribirlo dentro de
  // un comentario ganaba la mision sin escribir codigo. Medido sobre el arbol
  // entero: 1.983 de las 2.018 misiones se ganaban asi, no las 30 que se creian
  // arregladas. Con sinCadenas tambien se vacia el interior de las comillas, que
  // es la otra forma de texto libre que el alumno controla; lo que va entre llaves
  // de una f-string se conserva, porque ahi hay codigo de verdad.
  function soloCodigo(texto, lenguaje, sinCadenas) {
    var s = String(texto || '').replace(/\r/g, '');
    var modo = MARCAS[String(lenguaje || '').toLowerCase()] || 'sx';
    var hash = modo.indexOf('h') >= 0, barra = modo.indexOf('s') >= 0, xml = modo.indexOf('x') >= 0;
    var out = '', i = 0, n = s.length;
    while (i < n) {
      var ch = s[i];
      if (ch === '"' || ch === "'") {
        var triple = hash && s.substr(i, 3) === ch + ch + ch;
        var cierre = triple ? ch + ch + ch : ch;
        var j = i + cierre.length;
        while (j < n) {
          if (s[j] === '\\') { j += 2; continue; }
          if (s.substr(j, cierre.length) === cierre) break;
          if (!triple && s[j] === '\n') break;
          j++;
        }
        var fin = Math.min(n, j + cierre.length);
        if (!sinCadenas) { out += s.slice(i, fin); i = fin; continue; }
        var formato = /[fF]/.test(s.slice(Math.max(0, i - 2), i));
        out += cierre;
        for (var k = i + cierre.length; k < fin - cierre.length; k++) {
          if (s[k] === '\n') { out += '\n'; continue; }
          if (!formato || s[k] !== '{' || s[k + 1] === '{') continue;
          var cierra = s.indexOf('}', k + 1);
          if (cierra < 0 || cierra >= fin) continue;
          out += ' ' + s.slice(k + 1, cierra) + ' ';
          k = cierra;
        }
        out += cierre;
        i = fin;
        continue;
      }
      if (barra && ch === '/' && s[i + 1] === '/') { while (i < n && s[i] !== '\n') i++; out += ' '; continue; }
      if (barra && ch === '/' && s[i + 1] === '*') {
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


  function corre(leccion) {
    if (!leccion) return false;
    if (leccion.ejecutable === true) return true;
    return !!(leccion.comprueba && leccion.comprueba.tipo === 'runs');
  }

  function normalizarSalida(t) {
    return String(t == null ? '' : t).replace(/\r/g, '').replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
  }

  function bloqueSalida(titulo, texto, clase) {
    var out = LX.el('llOut');
    LX.limpiar(out);
    out.className = 'll-out ' + clase;
    var b = document.createElement('b');
    b.textContent = titulo;
    out.appendChild(b);
    if (texto) {
      var pre = document.createElement('pre');
      pre.className = 'll-stdout';
      pre.textContent = texto;
      out.appendChild(pre);
    }
    return out;
  }

  function aniadirNota(nodo, texto) {
    var p = document.createElement('p');
    p.className = 'll-out-note';
    p.textContent = texto;
    nodo.appendChild(p);
  }

  function motorDe(lenguaje) {
    var lg = String(lenguaje || '').toLowerCase();
    if (lg === 'javascript' || lg === 'js') return { motor: window.ZerackJs, nombre: 'JavaScript', fichero: 'js-runner.js' };
    return { motor: window.ZerackPython, nombre: 'Python', fichero: 'python-runner.js' };
  }

  function comprobarEjecutando(codigo, leccion, lenguaje) {
    var elegido = motorDe(lenguaje);
    var motor = elegido.motor;
    if (!motor) {
      return Promise.resolve({ ok: false, titulo: 'The ' + elegido.nombre + ' runtime is not loaded.', salida: '', nota: elegido.fichero + ' did not load on this page.' });
    }
    var regla = leccion.comprueba || {};
    return motor.run(codigo, { stdin: leccion.stdin || '', timeoutMs: leccion.timeoutMs || 8000, dom: leccion.entorno === 'dom' }).then(function (res) {
      if (!res.ok) {
        var pista = elegido.nombre === 'JavaScript'
          ? 'Read the first line first. It names the error, and the frames below it are the path that led there.'
          : 'Read the last line of the traceback first. It names the error.';
        return { ok: false, titulo: res.timedOut ? 'Your program never finished.' : 'Your program crashed.', salida: res.stderr, nota: res.timedOut ? '' : pista };
      }
      var esperado = regla.expects != null ? normalizarSalida(regla.expects) : null;
      var real = normalizarSalida(res.stdout);
      if (esperado === null) {
        var texto = revisar(codigo, leccion, lenguaje);
        return { ok: texto.ok, titulo: texto.ok ? 'It runs, and it checks out.' : 'It runs, but something is missing.', salida: real, nota: texto.ok ? (leccion.meta || '') : texto.faltan.join('  ') };
      }
      if (real === esperado) {
        return { ok: true, titulo: 'It runs, and the output is right.', salida: real, nota: leccion.meta || '' };
      }
      return { ok: false, titulo: 'It runs, but the output is not what the mission asks for.', salida: real, nota: 'Expected:\n' + esperado };
    });
  }

  function revisar(codigo, leccion, lenguaje) {
    var c = normal(codigo);
    var regla = leccion && leccion.comprueba;
    if (!c.trim()) return { ok: false, faltan: ['The editor is empty.'], pide: 1, lleva: 0 };
    if (!regla || !regla.tipo) return { ok: c.trim().length > 0, faltan: [], pide: 1, lleva: 1 };

    var conComentarios = soloCodigo(c, lenguaje, false);
    var soloFuera = soloCodigo(c, lenguaje, true);

    if (regla.tipo === 'contiene') {
      var pedidos = Array.isArray(regla.valor) ? regla.valor : [regla.valor];
      // Un trozo que en la solucion oficial vive fuera de toda comilla se exige
      // fuera de toda comilla: pegarlo dentro de unas comillas ganaba 2.013 de
      // las 2.018 misiones. Los que solo viven dentro de una cadena, como el
      // texto que la mision manda imprimir, se buscan con las cadenas puestas.
      var enSolucion = aplanar(soloCodigo(leccion.solucion || '', lenguaje, true));
      var blando = aplanar(conComentarios), duro = aplanar(soloFuera);
      var faltan = pedidos.filter(function (p) {
        var quiere = aplanar(p);
        return (enSolucion.indexOf(quiere) >= 0 ? duro : blando).indexOf(quiere) < 0;
      });
      return {
        ok: faltan.length === 0,
        faltan: faltan.map(function (f) { return 'Missing: ' + f; }),
        pide: pedidos.length,
        lleva: pedidos.length - faltan.length
      };
    }
    if (regla.tipo === 'regex') {
      var patrones = Array.isArray(regla.valor) ? regla.valor : [regla.valor];
      var malos = patrones.filter(function (p) {
        try { return !(new RegExp(p, 'm').test(conComentarios)); } catch (e) { return false; }
      });
      return {
        ok: malos.length === 0,
        faltan: malos.map(function () { return 'The shape of the answer is not there yet.'; }),
        pide: patrones.length,
        lleva: patrones.length - malos.length
      };
    }
    if (regla.tipo === 'runs') {
      var trozos = Array.isArray(regla.valor) ? regla.valor : (regla.valor ? [regla.valor] : []);
      if (!trozos.length) return { ok: true, faltan: [], pide: 1, lleva: 1 };
      var falla = trozos.filter(function (p) { return aplanar(conComentarios).indexOf(aplanar(p)) < 0; });
      return {
        ok: falla.length === 0,
        faltan: falla.map(function (f) { return 'Missing: ' + f; }),
        pide: trozos.length,
        lleva: trozos.length - falla.length
      };
    }
    if (regla.tipo === 'salida') {
      var esperado = String(regla.valor || '').trim();
      var hay = conComentarios.indexOf(esperado) >= 0;
      return { ok: hay, faltan: esperado ? ['It should produce: ' + esperado] : [], pide: 1, lleva: hay ? 1 : 0 };
    }
    return { ok: true, faltan: [], pide: 1, lleva: 1 };
  }

  var SANGRIA = '  ';

  function sangrar(txt, desde, hasta, quitar) {
    var ini = txt.lastIndexOf('\n', desde - 1) + 1;
    var fin = txt.indexOf('\n', hasta);
    if (fin < 0) fin = txt.length;
    var lineas = txt.slice(ini, fin).split('\n');
    var movido = 0;
    var nuevas = lineas.map(function (l) {
      if (!quitar) { movido += SANGRIA.length; return SANGRIA + l; }
      var m = l.match(/^[ \t]{1,2}/);
      if (!m) return l;
      movido -= m[0].length;
      return l.slice(m[0].length);
    });
    return { texto: txt.slice(0, ini) + nuevas.join('\n') + txt.slice(fin), movido: movido, primera: nuevas[0].length - lineas[0].length };
  }

  // En un curso de Python la sangria es el lenguaje, y un tabulador que saca el
  // foco del editor deja al alumno sin poder escribir un bloque. Escape antes de
  // Tab devuelve la navegacion por teclado, que es el patron accesible.
  function teclado(code) {
    var salir = false;
    code.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { salir = true; return; }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        LX.el('llRun').click();
        return;
      }

      if (e.key !== 'Tab' || salir) { salir = false; return; }
      e.preventDefault();
      var ini = code.selectionStart, fin = code.selectionEnd;

      if (ini === fin && !e.shiftKey) {
        code.value = code.value.slice(0, ini) + SANGRIA + code.value.slice(fin);
        code.selectionStart = code.selectionEnd = ini + SANGRIA.length;
      } else {
        var r = sangrar(code.value, ini, fin, e.shiftKey);
        code.value = r.texto;
        code.selectionStart = Math.max(0, ini + r.primera);
        code.selectionEnd = Math.max(0, fin + r.movido);
      }
      code.dispatchEvent(new Event('input'));
    });
    code.addEventListener('blur', function () { salir = false; });
  }

  function claveBorrador() { return 'zerack_academy_borrador_' + cursoId + '_' + lecId; }

  function guardarBorrador(txt) { try { localStorage.setItem(claveBorrador(), txt); } catch (e) {} }
  function leerBorrador() { try { return localStorage.getItem(claveBorrador()); } catch (e) { return null; } }

  // ---------- la experiencia de la referencia: apartados, voz y fiesta ----------

  var CLAVE_VOZ = 'zerack_academy_voz';
  var CLAVE_TOUR = 'zerack_academy_tour';
  var sinMovimiento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function vozActiva() {
    try { return localStorage.getItem(CLAVE_VOZ) !== 'off'; } catch (e) { return true; }
  }

  function hablar(texto) {
    if (!vozActiva() || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(texto || '').slice(0, 600));
      u.lang = 'en-US';
      u.rate = 1.04;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  function callar() {
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  }

  // Cada letra entra con un retraso propio, como en la referencia. Sobre bloques
  // largos el efecto cansa y pesa, asi que a partir de 700 letras el bloque entra
  // entero y solo se anima el resto.
  function maquina(nodo) {
    if (sinMovimiento) return;
    var textos = [];
    (function juntar(n) {
      for (var h = n.firstChild; h; h = h.nextSibling) {
        if (h.nodeType === 3) textos.push(h);
        else juntar(h);
      }
    })(nodo);
    var total = 0;
    for (var i = 0; i < textos.length; i++) total += textos[i].nodeValue.length;
    if (total > 700) return;
    var paso = 0;
    textos.forEach(function (t) {
      var trozo = document.createDocumentFragment();
      String(t.nodeValue).split('').forEach(function (ch) {
        var s = document.createElement('span');
        s.className = 'll-tw-char';
        s.style.animationDelay = (paso * 12) + 'ms';
        s.textContent = ch;
        paso++;
        trozo.appendChild(s);
      });
      t.parentNode.replaceChild(trozo, t);
    });
    // Si algo interrumpe las animaciones, que el texto nunca se quede a medias.
    setTimeout(function () { nodo.classList.add('ll-tw-fin'); }, paso * 12 + 500);
  }

  // La teoria no cae de golpe: sale por apartados con un boton de continuar,
  // y la tarea es el ultimo. Quien ya gano la mision lo ve todo de una vez.
  function porApartados() {
    var teo = LX.el('llTheory');
    var tarea = document.querySelector('.ll-task');
    var bloques = [].slice.call(teo.children);
    if (tarea) bloques.push(tarea);
    if (estado.yaHecha || bloques.length < 2) return;

    bloques.forEach(function (b, i) { if (i > 0) b.classList.add('ll-espera'); });

    var boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'll-sigue';
    boton.appendChild(document.createTextNode('Continue '));
    var flecha = document.createElement('i');
    flecha.textContent = '▸';
    boton.appendChild(flecha);

    var visto = 0;
    function colocar() {
      var b = bloques[visto];
      if (b.nextSibling) b.parentNode.insertBefore(boton, b.nextSibling);
      else b.parentNode.appendChild(boton);
    }
    boton.addEventListener('click', function () {
      visto++;
      if (visto >= bloques.length) return;
      var b = bloques[visto];
      b.classList.remove('ll-espera');
      maquina(b);
      hablar(b.textContent);
      if (visto === bloques.length - 1) {
        boton.remove();
        globo('That is the task. The check grades exactly that.');
      } else {
        colocar();
      }
      b.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'nearest' });
    });

    maquina(bloques[0]);
    hablar(bloques[0].textContent);
    colocar();
  }

  var globoNodo = null;

  function globo(texto) {
    if (globoNodo) globoNodo.textContent = texto;
  }

  // La guia abajo en la esquina ya no es el raton, que el dueño tacho: es un
  // orbe minimo que respira. Acompaña, repite en voz alta lo que va saliendo,
  // y la voz se apaga con su boton.
  function montarPipEsquina() {
    var caja = document.createElement('div');
    caja.className = 'll-pip';

    var globoCaja = document.createElement('div');
    globoCaja.className = 'll-pip-globo';
    globoNodo = document.createElement('span');
    globoNodo.textContent = 'Read the briefing, then take the mission.';
    globoCaja.appendChild(globoNodo);

    var voz = document.createElement('button');
    voz.type = 'button';
    voz.className = 'll-pip-voz';
    function rotularVoz() {
      voz.textContent = vozActiva() ? 'Voice on' : 'Voice off';
      voz.classList.toggle('is-on', vozActiva());
    }
    voz.addEventListener('click', function () {
      var ahora = vozActiva() ? 'off' : 'on';
      try { localStorage.setItem(CLAVE_VOZ, ahora); } catch (e) {}
      if (ahora === 'off') callar();
      rotularVoz();
    });
    rotularVoz();
    globoCaja.appendChild(voz);

    var bicho = document.createElement('div');
    bicho.className = 'll-pip-bicho';
    var orbe = document.createElement('div');
    orbe.className = 'll-orbe';
    orbe.setAttribute('role', 'img');
    orbe.setAttribute('aria-label', 'The academy guide');
    var ojo = document.createElement('i');
    orbe.appendChild(ojo);
    bicho.appendChild(orbe);

    caja.appendChild(globoCaja);
    caja.appendChild(bicho);
    document.body.appendChild(caja);
  }

  // El tour de bienvenida, una sola vez: velo, cuatro paradas y clic en
  // cualquier parte para avanzar, con PIP leyendolo en voz alta.
  function tourBienvenida() {
    try { if (localStorage.getItem(CLAVE_TOUR)) return; } catch (e) {}

    var pasos = [
      { sel: '.ll-panel', texto: 'Welcome, apprentice. This is the briefing: the story and the theory of the mission come out section by section.' },
      { sel: '.ll-editor', texto: 'This is your editor. What you write here is the mission.' },
      { sel: '#llRun', texto: 'Check my code grades your answer and pays the XP.' },
      { sel: '#llHintBtn', texto: 'Stuck? Ask for the hint first. The solution also counts, but you learn less.' }
    ];

    var velo = document.createElement('div');
    velo.className = 'll-velo';
    var caja = document.createElement('div');
    caja.className = 'll-tour';
    var texto = document.createElement('span');
    var pie = document.createElement('small');
    pie.textContent = 'Click anywhere to continue';
    var puntos = document.createElement('div');
    puntos.className = 'll-tour-puntos';
    pasos.forEach(function () { puntos.appendChild(document.createElement('i')); });
    caja.appendChild(texto);
    caja.appendChild(pie);
    caja.appendChild(puntos);

    var en = -1, marcado = null;

    function pintarPaso() {
      if (marcado) marcado.classList.remove('ll-foco');
      var p = pasos[en];
      marcado = document.querySelector(p.sel);
      if (marcado) {
        marcado.classList.add('ll-foco');
        marcado.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'center' });
      }
      texto.textContent = p.texto;
      [].forEach.call(puntos.children, function (i, k) { i.classList.toggle('is-aqui', k === en); });
      hablar(p.texto);
    }

    function cerrar() {
      if (marcado) marcado.classList.remove('ll-foco');
      velo.remove();
      caja.remove();
      callar();
      try { localStorage.setItem(CLAVE_TOUR, 'visto'); } catch (e) {}
      globo('Your turn. I will be here.');
    }

    function avanzar() {
      en++;
      if (en >= pasos.length) { cerrar(); return; }
      pintarPaso();
    }

    velo.addEventListener('click', avanzar);
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', esc); }
    });

    document.body.appendChild(velo);
    document.body.appendChild(caja);
    avanzar();
  }

  // La fiesta de la referencia: letras que saltan, chispas de pixel y el
  // contador de XP subiendo, en el color del curso y el cian de la marca.
  function fiesta(caja, xp) {
    caja.classList.add('is-fiesta');

    var t = LX.el('llNextT');
    var letras = t.textContent;
    LX.limpiar(t);
    letras.split('').forEach(function (ch, i) {
      var s = document.createElement('span');
      s.className = 'll-letra';
      s.style.animationDelay = (i * 35) + 'ms';
      s.textContent = ch === ' ' ? ' ' : ch;
      t.appendChild(s);
    });

    if (!sinMovimiento) {
      var r = caja.getBoundingClientRect();
      var colores = [estado.curso.acento || '#22d3ee', '#22d3ee', '#f7f7f8', '#66f6ad'];
      for (var i = 0; i < 26; i++) {
        var c = document.createElement('i');
        c.className = 'll-chispa';
        c.style.left = (r.left + r.width * Math.random()) + 'px';
        c.style.top = (r.top + 8) + 'px';
        c.style.background = colores[i % colores.length];
        c.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
        c.style.setProperty('--dy', (-40 - Math.random() * 120) + 'px');
        document.body.appendChild(c);
        setTimeout(function (n) { return function () { n.remove(); }; }(c), 1000);
      }
    }

    var pop = document.querySelector('.lx-xp-pop');
    if (pop && xp) {
      var desde = 0;
      var reloj = setInterval(function () {
        desde = Math.min(xp, desde + Math.max(1, Math.round(xp / 18)));
        pop.textContent = '+' + desde + ' XP';
        if (desde >= xp) clearInterval(reloj);
      }, 34);
    }

    hablar('Mission complete. Plus ' + xp + ' XP.');
    globo('Mission complete. On to the next one.');
  }

  function pintarSiguiente(gano, xp) {
    var caja = LX.el('llNext');
    caja.hidden = false;
    LX.el('llNextT').textContent = gano ? 'Mission complete' : 'Already done';
    LX.el('llNextS').textContent = estado.siguiente
      ? 'Up next: ' + estado.siguiente.titulo
      : 'That was the last mission of this course.';
    var btn = LX.el('llNextBtn');
    if (estado.siguiente) {
      btn.href = 'learn-leccion.html?c=' + encodeURIComponent(cursoId) + '&l=' + encodeURIComponent(estado.siguiente.id);
      btn.hidden = false;
    } else {
      btn.href = 'learn-curso.html?c=' + encodeURIComponent(cursoId);
      LX.limpiar(btn);
      btn.appendChild(document.createTextNode('Back to the course'));
    }
    if (gano && xp) {
      var pop = document.createElement('span');
      pop.className = 'lx-xp-pop';
      pop.textContent = '+' + xp + ' XP';
      LX.el('llNextT').parentNode.insertBefore(pop, LX.el('llNextT'));
    }
    if (gano) fiesta(caja, xp);
    caja.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // El titulo de la siguiente mision se guarda aqui porque aqui el curso ya esta
  // cargado. La portada solo abre el catalogo de 9 KB, y un curso son 223 KB: sin
  // esto, retomar costaria veinticinco veces mas de lo que cuesta la portada entera.
  function anotarDondeSigue() {
    var sig = estado.siguiente;
    estado.prog.ultima = {
      curso: cursoId,
      cursoTitulo: estado.curso.titulo || cursoId,
      leccion: sig ? sig.id : lecId,
      leccionTitulo: sig ? sig.titulo : (estado.leccion.titulo || ''),
      terminado: !sig,
      cuando: Date.now()
    };
  }

  function alPasar() {
    var xp = Number(estado.leccion.xp || 0);
    var gano = LX.marcarHecha(estado.prog, cursoId, lecId, xp);
    if (!gano) { pintarSiguiente(false, 0); return; }
    anotarDondeSigue();
    LX.guardarProgreso(estado.prog).then(function () {
      LX.pintarXp(estado.prog);
      pintarSiguiente(true, xp);
    });
  }

  function arrancar() {
    var l = estado.leccion, curso = estado.curso;
    document.title = l.titulo + ' · ZERACK Academy';
    document.body.style.setProperty('--lx-acc', curso.acento || '#4fd8ff');

    LX.el('llBack').href = 'learn-curso.html?c=' + encodeURIComponent(cursoId);
    LX.el('llBarT').textContent = String(curso.titulo || '').toUpperCase();
    LX.el('llBarS').textContent = curso.mundo || '';
    // Siete misiones del curso de ros piden un CMakeLists, un package.xml o un
    // URDF. Sin lenguaje propio, la cabecera decia PYTHON a quien escribia XML.
    LX.el('llLang').textContent = (l.lenguaje || curso.lenguaje || 'code').toUpperCase();

    var crumb = LX.el('llCrumb');
    LX.limpiar(crumb);
    var a = document.createElement('a');
    a.href = 'learn-curso.html?c=' + encodeURIComponent(cursoId);
    a.textContent = curso.titulo;
    crumb.appendChild(a);
    crumb.appendChild(document.createTextNode(' · ' + (estado.capitulo ? estado.capitulo.titulo : '')));

    var tit = LX.el('llTitle');
    LX.limpiar(tit);
    if (window.PX) tit.appendChild(PX.texto(l.titulo || '', { escala: 3 }));
    else tit.textContent = l.titulo || '';
    LX.el('llGoal').textContent = l.meta || '';
    var teo = LX.el('llTheory');
    LX.limpiar(teo);
    teo.appendChild(LX.marcaSimple(l.teoria || ''));
    var tarea = LX.el('llTask'); LX.limpiar(tarea); tarea.appendChild(LX.marcaSimple(l.tarea || ''));

    var code = LX.el('llCode');
    var borrador = leerBorrador();
    code.value = borrador != null ? borrador : (l.inicio || '');

    // El medidor y la tira se refrescan mientras escribe: dicen cuantos requisitos
    // lleva sin decir cuales, que es lo que delataria la respuesta.
    function instrumentos() {
      if (!window.DT) return;
      var r = revisar(code.value, l, l.lenguaje || curso.lenguaje);
      var tira = LX.el('oxTiraEditor');
      if (tira) {
        var lineas = code.value ? code.value.split('\n').length : 0;
        LX.limpiar(tira);
        tira.appendChild(DT.lectura([
          ['LANG', String(l.lenguaje || curso.lenguaje || 'code').toUpperCase()],
          ['LINES', String(lineas)],
          ['CHECKS', r.lleva + '/' + r.pide]
        ], { columnas: 3 }));
      }
      var med = LX.el('oxMedidorSalida');
      if (med) {
        LX.limpiar(med);
        med.appendChild(DT.medidor(r.pide ? (r.lleva / r.pide) * 100 : 0, { marcas: Math.min(r.pide, 6), etiqueta: 'CHECKS' }));
      }
    }

    code.addEventListener('input', function () { guardarBorrador(code.value); instrumentos(); });
    instrumentos();

    // Los personajes (personajes.js) leen y prueban la misión por aquí: Bug sabotea código y comprueba si sigue pasando.
    window.ZerackLeccion = {
      cursoId: cursoId,
      leccion: l,
      editor: code,
      pasa: function (codigo) {
        if (corre(l) && motorDe(l.lenguaje || curso.lenguaje).motor) return comprobarEjecutando(codigo, l, l.lenguaje || curso.lenguaje).then(function (r) { return r.ok; });
        return Promise.resolve(revisar(codigo, l, l.lenguaje || curso.lenguaje).ok);
      },
      poner: function (txt) { code.value = txt; guardarBorrador(txt); instrumentos(); }
    };
    function avisarCheck(ok) { document.dispatchEvent(new CustomEvent('zerack:check', { detail: { ok: ok } })); }
    teclado(code);

    LX.el('llHint').textContent = l.pista || 'No hint for this one.';

    if (corre(l)) {
      var precalentar = motorDe(l.lenguaje || curso.lenguaje).motor;
      if (precalentar) precalentar.warmUp();
    }

    LX.el('llRun').addEventListener('click', function () {
      var boton = LX.el('llRun');
      if (!corre(l) || !motorDe(l.lenguaje || curso.lenguaje).motor) {
        var r = revisar(code.value, l, l.lenguaje || curso.lenguaje);
        if (!r.ok) {
          salida('is-bad', 'Not yet.', r.faltan.length ? r.faltan : ['Something is still missing.']);
          avisarCheck(false);
          return;
        }
        salida('is-good', 'It checks out.', [l.meta || 'Objective met.']);
        alPasar();
        avisarCheck(true);
        return;
      }
      if (!code.value.trim()) {
        salida('is-bad', 'Not yet.', ['The editor is empty.']);
        return;
      }
      boton.disabled = true;
      salida('is-idle', 'Running your code...', []);
      comprobarEjecutando(code.value, l, l.lenguaje || curso.lenguaje).then(function (res) {
        boton.disabled = false;
        var caja = bloqueSalida(res.titulo, res.salida, res.ok ? 'is-good' : 'is-bad');
        if (res.nota) aniadirNota(caja, res.nota);
        if (res.ok) alPasar();
        avisarCheck(res.ok);
      });
    });

    LX.el('llHintBtn').addEventListener('click', function () {
      var h = LX.el('llHint');
      h.hidden = !h.hidden;
    });

    LX.el('llReset').addEventListener('click', function () {
      code.value = l.inicio || '';
      guardarBorrador(code.value);
      instrumentos();
      salida('is-idle', '', ['Back to the starting code.']);
    });

    LX.el('llSol').addEventListener('click', function () {
      code.value = l.solucion || code.value;
      guardarBorrador(code.value);
      instrumentos();
      salida('is-idle', 'Solution loaded.', ['Read it, then press check. It counts the same, but you learn less.']);
    });

    montarPipEsquina();
    porApartados();
    tourBienvenida();

    if (estado.yaHecha) pintarSiguiente(false, 0);
    LX.pintarXp(estado.prog);
  }

  function fallo(msg) {
    var t = LX.el('llTitle');
    LX.limpiar(t);
    if (window.PX) t.appendChild(PX.texto('NO MISSION', { escala: 3 }));
    else t.textContent = 'Mission not available';
    LX.el('llGoal').textContent = msg;
    // Sin esto la barra se queda en "Loading" para siempre y parece que sigue cargando.
    document.title = 'Mission not available · ZERACK Academy';
    LX.el('llBarS').textContent = 'Nothing to show';
    LX.el('llLang').textContent = '';
  }

  if (!cursoId || !lecId) { fallo('The address does not name a course and a mission.'); return; }

  Promise.all([LX.cargarCurso(cursoId), LX.leerProgreso()]).then(function (v) {
    var curso = v[0];
    estado.prog = v[1] || {};
    if (!LX.hayCurso(curso)) { fallo(LX.porQueNoHayCurso(curso)); LX.pintarXp(estado.prog); return; }

    var todas = LX.todasLasLecciones(curso);
    var idx = -1;
    for (var i = 0; i < todas.length; i++) if (todas[i].lec.id === lecId) { idx = i; break; }
    if (idx < 0) { fallo('That mission is not in this course.'); LX.pintarXp(estado.prog); return; }

    estado.curso = curso;
    estado.leccion = todas[idx].lec;
    estado.capitulo = todas[idx].cap;
    estado.siguiente = idx + 1 < todas.length ? todas[idx + 1].lec : null;
    estado.yaHecha = LX.hechasDe(estado.prog, cursoId).indexOf(lecId) >= 0;
    arrancar();
  });
})();
