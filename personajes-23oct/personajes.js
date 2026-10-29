// Personajes de ZERACK Academy (23-10): el elenco que hizo Vera deja de ser ilustración y pasa a dar la clase.
// - Reparto: cada curso tiene a su personaje, que es quien contesta en el tutor con su propia forma de enseñar.
// - Relevo: si fallas dos veces seguidas, tu personaje llama a otro del elenco (Kernel o Mate) para desatascarte.
// - Duelo con Bug: al aprobar, Bug, el rival, te mete un fallo real en tu propio código y tienes que encontrarlo.
(function () {
  'use strict';

  if (window.PJ) return;

  var IMG = 'personajes/';
  var ELENCO = {
    zack: { nombre: 'Zack', rol: 'Welcome and fundamentals', acento: '#00d4ff', estilo: 'a warm robot guide who speaks in short sentences and celebrates every small step', hola: "Hey, I'm Zack. Here you learn by doing, one step at a time. Ask me anything about this mission." },
    nodo: { nombre: 'Nodo', rol: 'That is you', acento: '#82ffc8', estilo: 'the student, curious and honest about what is not clear yet', hola: 'Every mission you finish lights one more node in my head.' },
    byte: { nombre: 'Byte', rol: 'Programming', acento: '#b46bff', estilo: 'a programmer with dry humour who loves clean code and explains with tiny examples', hola: 'Byte here. Tell me what you expected your code to do and what it did instead.' },
    neura: { nombre: 'Neura', rol: 'Artificial intelligence', acento: '#3dff9a', estilo: 'calm and curious, she builds the intuition first and only then the maths', hola: "I'm Neura. Before the formula, let's get the idea. What do you think the model should learn here?" },
    pixel: { nombre: 'Pixel', rol: 'Design and web', acento: '#ff7ad9', estilo: 'a visual thinker who sketches the layout before any code', hola: "Pixel. Let's picture it first, then build it." },
    cifra: { nombre: 'Cifra', rol: 'Data and analysis', acento: '#ffc542', estilo: 'a data detective who always asks what the numbers are hiding', hola: 'Cifra. Numbers always hide a story. Want to find it?' },
    turbo: { nombre: 'Turbo', rol: 'Video games', acento: '#ff5470', estilo: 'an arcade machine that turns everything into levels and bosses', hola: 'Turbo! This mission is a level. Let me show you the boss.' },
    clave: { nombre: 'Clave', rol: 'Cybersecurity', acento: '#ff3b3b', estilo: 'a quiet sentinel who thinks like an attacker to defend better', hola: 'Clave. Where would you attack this if you were the bad guy?' },
    chispa: { nombre: 'Chispa', rol: 'Robotics', acento: '#ffa53d', estilo: 'a hands-on robot mechanic with four arms who explains with real machines', hola: "Chispa here, four arms ready. Robots are just sense, think, act. Where's yours stuck?" },
    mate: { nombre: 'Mate', rol: 'Mathematics', acento: '#e8f1ff', estilo: 'a precise crystal mind who turns every problem into a small puzzle you can check by hand', hola: "Mate. Let's shrink this to numbers you can check on paper." },
    voltio: { nombre: 'Voltio', rol: 'Hardware and electronics', acento: '#ffe14d', estilo: 'an excitable chip-crab who talks in volts and pins and always puts safety first', hola: 'Voltio! Volts, pins and current. Tell me what is wired to what.' },
    nube: { nombre: 'Nube', rol: 'Cloud and servers', acento: '#7fd1ff', estilo: 'a relaxed cloud who explains systems as things that travel', hola: 'Nube. Where does your data live and where does it travel?' },
    ritmo: { nombre: 'Ritmo', rol: 'Music and audio', acento: '#c77dff', estilo: 'a producer who hears signals as music', hola: "Ritmo. Every signal has a beat. Let's listen to this one." },
    foco: { nombre: 'Foco', rol: 'Content creation', acento: '#ffd166', estilo: 'an energetic creator who teaches how to make and publish content', hola: "Foco. Let's look at the idea behind this mission." },
    kernel: { nombre: 'Kernel', rol: 'Veteran mentor', acento: '#9ad1ff', estilo: 'a patient veteran who never gives the answer and asks the one question that unlocks it', hola: 'Kernel. Slow down. Read your error out loud, line by line.' },
    bug: { nombre: 'Bug', rol: 'The rival', acento: '#7dff4d', estilo: 'a mischievous rival who taunts but plays fair and loves off-by-one errors', hola: 'Bug. Your code passed? Cute. Let me in.' },
    axo: { nombre: 'Axo', rol: 'Academy mascot', acento: '#ff9ecb', estilo: 'a cheerful axolotl who keeps your streak alive', hola: 'Axo! Keep the streak going!' }
  };

  // Quién da cada curso del catálogo. Los cursos con mucha matemática llaman a Mate en el relevo.
  var REPARTO = {
    programming: 'byte', javascript: 'byte', 'python-robotica': 'byte', 'c-embebido': 'byte', 'linux-embebido': 'byte', 'tiempo-real': 'byte',
    electronica: 'voltio', arduino: 'voltio', sensores: 'voltio', motores: 'voltio', buses: 'voltio', energia: 'voltio',
    ros: 'chispa', humanoide: 'chispa', manipulacion: 'chispa', drones: 'chispa', navegacion: 'chispa', slam: 'chispa',
    control: 'mate', cinematica: 'mate', dsp: 'mate', estimacion: 'mate', simulacion: 'mate',
    vision: 'neura', aprendizaje: 'neura', refuerzo: 'neura',
  };
  var CON_MATEMATICA = { control: 1, cinematica: 1, dsp: 1, estimacion: 1, simulacion: 1, navegacion: 1, slam: 1, humanoide: 1, drones: 1 };

  var params = new URLSearchParams(location.search);
  var cursoId = params.get('c') || '';
  var titular = REPARTO[cursoId] || 'zack';
  var actual = titular;
  var fallosSeguidos = 0;
  var duelo = null;

  function ficha(id) {
    var p = ELENCO[id];
    return { id: id, nombre: p.nombre, rol: p.rol, acento: p.acento, estilo: p.estilo, hola: p.hola, imagen: IMG + id + '.jpg' };
  }

  function nodo(tag, clase, txt) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (txt != null) n.textContent = txt;
    return n;
  }

  function avisar() {
    document.dispatchEvent(new CustomEvent('pj:cambio', { detail: ficha(actual) }));
  }

  // Tarjeta flotante con la cara del personaje que habla; los botones son opcionales.
  var tarjeta = null;
  function decir(id, texto, botones, fija) {
    if (tarjeta) tarjeta.remove();
    var p = ficha(id);
    tarjeta = nodo('div', 'pj-card');
    tarjeta.style.setProperty('--pj-acc', p.acento);
    var cara = nodo('img', 'pj-cara');
    cara.src = p.imagen;
    cara.alt = p.nombre;
    var caja = nodo('div', 'pj-texto');
    caja.appendChild(nodo('b', null, p.nombre));
    caja.appendChild(nodo('p', null, texto));
    if (botones && botones.length) {
      var fila = nodo('div', 'pj-botones');
      botones.forEach(function (b) {
        var boton = nodo('button', b.principal ? 'pj-btn is-main' : 'pj-btn', b.texto);
        boton.type = 'button';
        boton.addEventListener('click', b.accion);
        fila.appendChild(boton);
      });
      caja.appendChild(fila);
    }
    var cerrar = nodo('button', 'pj-x', '×');
    cerrar.type = 'button';
    cerrar.setAttribute('aria-label', 'Close');
    cerrar.addEventListener('click', function () { if (tarjeta) tarjeta.remove(); tarjeta = null; });
    tarjeta.appendChild(cara);
    tarjeta.appendChild(caja);
    tarjeta.appendChild(cerrar);
    document.body.appendChild(tarjeta);
    if (!fija) {
      var esta = tarjeta;
      setTimeout(function () { if (tarjeta === esta) { esta.remove(); tarjeta = null; } }, 9000);
    }
    return tarjeta;
  }

  // ---------- relevo ----------
  function relevo() {
    var ayuda = titular === 'mate' ? 'kernel' : CON_MATEMATICA[cursoId] && fallosSeguidos === 2 ? 'mate' : 'kernel';
    var de = ficha(titular).nombre, a = ficha(ayuda).nombre;
    actual = ayuda;
    avisar();
    decir(titular, 'Two misses in a row. I am calling ' + a + ', they see this kind of thing differently.', [
      { texto: 'Talk to ' + a, principal: true, accion: function () { if (tarjeta) tarjeta.remove(); tarjeta = null; document.dispatchEvent(new CustomEvent('pj:abrir-tutor')); } },
      { texto: 'Keep ' + de, accion: function () { actual = titular; avisar(); if (tarjeta) tarjeta.remove(); tarjeta = null; } }
    ], true);
  }

  // ---------- duelo con Bug ----------
  // Cambios pequeños y realistas; Bug prueba varios hasta dar con uno que de verdad rompa tu solución.
  var SABOTAJES = [
    [/<=/, '<'], [/>=/, '>'], [/>=/, '<='], [/<=/, '>='], [/(^|[^<>=!-])>(?![=>])/, '$1<'], [/(^|[^<>=!-])<(?![=<])/, '$1>'], [/==/, '!='], [/!=/, '=='],
    [/\b(\d)(\d)(\d+)\b/, '$2$1$3'],
    [/\+= ?1\b/, '+= 2'], [/-= ?1\b/, '-= 2'], [/\+ ?1\b/, '- 1'], [/- ?1\b/, '+ 1'],
    [/\[0\]/, '[1]'], [/\[-1\]/, '[-2]'], [/\band\b/, 'or'], [/\bor\b/, 'and'], [/&&/, '||'], [/\|\|/, '&&'],
    [/\bTrue\b/, 'False'], [/\bFalse\b/, 'True'], [/\btrue\b/, 'false'], [/\bfalse\b/, 'true'],
    [/range\(([^(),]+)\)/, 'range($1 - 1)'], [/(\w)\s\*\s(\w)/, '$1 + $2'], [/(\w)\s\/\s(\w)/, '$1 * $2'], [/\bmax\(/, 'min('], [/\bmin\(/, 'max(']
  ];

  function barajar(lista) {
    var copia = lista.slice();
    for (var i = copia.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = copia[i]; copia[i] = copia[j]; copia[j] = t; }
    return copia;
  }

  // Solo se toca código: las líneas de comentario y las cadenas quedan fuera para que el fallo sea de lógica.
  function sabotear(codigo, regla) {
    var lineas = codigo.split('\n');
    var orden = barajar(lineas.map(function (_, i) { return i; }));
    for (var k = 0; k < orden.length; k++) {
      var i = orden[k], linea = lineas[i];
      if (/^\s*(#|\/\/)/.test(linea) || !regla[0].test(linea.replace(/(["'])(?:\\.|(?!\1).)*\1/g, '""'))) continue;
      var nueva = linea.replace(regla[0], regla[1]);
      if (nueva === linea) continue;
      lineas[i] = nueva;
      return { codigo: lineas.join('\n'), linea: i + 1, antes: linea.trim(), despues: nueva.trim() };
    }
    return null;
  }

  function contarVictorias(suma) {
    var clave = 'zerack_academy_duelos_bug';
    var n = 0;
    try { n = Number(localStorage.getItem(clave) || 0) + (suma || 0); if (suma) localStorage.setItem(clave, String(n)); } catch (e) {}
    return n;
  }

  function terminarDuelo(gano) {
    if (!duelo) return;
    clearInterval(duelo.reloj);
    var L = window.ZerackLeccion, d = duelo;
    duelo = null;
    document.body.classList.remove('pj-en-duelo');
    if (d.marcador) d.marcador.remove();
    if (gano) {
      var total = contarVictorias(1);
      decir('bug', total === 1 ? 'Fine. You found it. First win against me... enjoy it.' : 'Again?! That is ' + total + ' wins against me. I will be back.', null, false);
    } else {
      decir('bug', 'Got you. It was line ' + d.sabotaje.linea + ': "' + d.sabotaje.despues + '" should be "' + d.sabotaje.antes + '". Your code is back.', null, true);
    }
    if (L) L.poner(d.original);
  }

  function empezarDuelo() {
    var L = window.ZerackLeccion;
    if (!L || duelo) return;
    var original = L.editor.value;
    decir('bug', 'Hold on, let me look for a weak spot...', null, true);
    var reglas = barajar(SABOTAJES), intentos = 0;
    (function probar(k) {
      if (k >= reglas.length || intentos >= 6) {
        decir('bug', 'I tried ' + intentos + (intentos === 1 ? ' trick' : ' tricks') + ' and your code survived. Respect. This round is yours.', null, false);
        if (intentos) contarVictorias(1);
        return;
      }
      var s = sabotear(original, reglas[k]);
      if (!s) return probar(k + 1);
      intentos++;
      L.pasa(s.codigo).then(function (sigue) {
        if (sigue) return probar(k + 1);
        duelo = { original: original, sabotaje: s, fin: Date.now() + 120000, reloj: null, marcador: null };
        L.poner(s.codigo);
        document.body.classList.add('pj-en-duelo');
        var marcador = nodo('div', 'pj-duelo');
        var reloj = nodo('b', null, '2:00');
        marcador.appendChild(nodo('span', null, 'Bug broke one line of your code. Find it and press Check.'));
        marcador.appendChild(reloj);
        var rendirse = nodo('button', 'pj-btn', 'Give up');
        rendirse.type = 'button';
        rendirse.addEventListener('click', function () { terminarDuelo(false); });
        marcador.appendChild(rendirse);
        document.body.appendChild(marcador);
        duelo.marcador = marcador;
        duelo.reloj = setInterval(function () {
          var resta = Math.max(0, Math.ceil((duelo.fin - Date.now()) / 1000));
          reloj.textContent = Math.floor(resta / 60) + ':' + String(resta % 60).padStart(2, '0');
          if (!resta) terminarDuelo(false);
        }, 250);
        decir('bug', 'Done. I changed ONE line. Two minutes. Tick tock.', null, false);
      }, function () { probar(k + 1); });
    })(0);
  }

  // ---------- lo que pasa en la misión ----------
  document.addEventListener('zerack:check', function (e) {
    var ok = e.detail && e.detail.ok;
    if (duelo) {
      if (ok) terminarDuelo(true);
      return;
    }
    if (ok) {
      fallosSeguidos = 0;
      if (actual !== titular) { actual = titular; avisar(); }
      var victorias = contarVictorias(0);
      setTimeout(function () {
        decir('bug', victorias ? 'Passed again. ' + victorias + ' wins against me so far. Double or nothing?' : 'Passed? Let me break your code. If you find my bug in two minutes, you win.', [
          { texto: 'Duel Bug', principal: true, accion: empezarDuelo },
          { texto: 'Not now', accion: function () { if (tarjeta) tarjeta.remove(); tarjeta = null; } }
        ], true);
      }, 1400);
      return;
    }
    fallosSeguidos++;
    if (fallosSeguidos === 2 || fallosSeguidos === 4) relevo();
  });

  window.PJ = {
    actual: function () { return ficha(actual); },
    titular: function () { return ficha(titular); },
    elenco: function () { return Object.keys(ELENCO).map(ficha); },
    decir: decir
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avisar);
  else avisar();
})();
