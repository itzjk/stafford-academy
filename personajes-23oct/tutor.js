(function () {
  'use strict';

  if (window.__zerackTutor) return;
  window.__zerackTutor = true;

  var SALAS = ['http://127.0.0.1:7801'];
  var AGENTE = 'zerack-tutor';
  var TOPE_CONTEXTO = 5200;
  var TOPE_ESPERA = 45000;
  var TOPE_DURO = 55000;
  var CLAVE_LADO = 'zerack_tutor_lado';
  var CLAVE_HILO = 'zerack_tutor_hilo';

  var base = null;
  var abierto = false;
  var pensando = false;
  var lado = 'derecha';
  var hilo = [];

  try { lado = localStorage.getItem(CLAVE_LADO) === 'izquierda' ? 'izquierda' : 'derecha'; } catch (e) {}
  try { hilo = JSON.parse(localStorage.getItem(CLAVE_HILO) || '[]') || []; } catch (e) { hilo = []; }
  if (!Array.isArray(hilo)) hilo = [];

  function guardarHilo() {
    try { localStorage.setItem(CLAVE_HILO, JSON.stringify(hilo.slice(-40))); } catch (e) {}
  }

  function compactar(t, tope) {
    return String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, tope || 600);
  }

  function texto(id, tope) {
    var el = document.getElementById(id);
    if (!el) return '';
    return compactar(el.tagName === 'TEXTAREA' ? el.value : el.textContent, tope);
  }

  function personaje() { return window.PJ ? window.PJ.actual() : null; }

  function contextoDeLaPantalla() {
    var partes = [];
    var pj = personaje();
    // Contesta el personaje del curso (o el del relevo), cada uno con su forma de enseñar.
    if (pj) partes.push('YOU ARE ' + pj.nombre.toUpperCase() + ', the ' + pj.rol.toLowerCase() + ' character of ZERACK Academy: ' + pj.estilo + '. Speak in character, short, like a teacher who asks back; never paste the full solution');
    var curso = texto('llCrumb', 120);
    if (curso) partes.push('COURSE: ' + curso);

    var titulo = texto('llTitle', 120);
    if (titulo) {
      partes.push('MISSION: ' + titulo);
      partes.push('GOAL: ' + texto('llGoal', 200));
      partes.push('TASK: ' + texto('llTask', 500));
      partes.push('THEORY: ' + texto('llTheory', 1400));
      var editor = document.getElementById('llCode');
      // El código va con sus saltos de línea: aplanado, el tutor veía errores de sangría que no existen.
      if (editor) partes.push('WHAT HE HAS WRITTEN NOW:\n' + (String(editor.value || '').replace(/\r/g, '').trim().slice(0, 900) || '(the editor is empty)'));
      var salida = texto('llOut', 700);
      if (salida && salida.indexOf('Write your code') !== 0) partes.push('WHAT THE SCREEN ANSWERED: ' + salida);
    } else {
      var h1 = document.querySelector('h1');
      if (h1) partes.push('HE IS LOOKING AT THE COURSE PAGE: ' + compactar(h1.textContent, 120));
    }
    var previo = conversacionPrevia();
    if (previo) partes.push('THE CONVERSATION SO FAR, oldest first: ' + previo);

    return partes.join(' | ').slice(0, TOPE_CONTEXTO);
  }

  function conversacionPrevia() {
    var utiles = hilo.filter(function (m) { return !m.temporal; });
    if (utiles.length < 2) return '';
    return utiles.slice(-6).map(function (m) {
      return (m.quien === 'yo' ? 'HE ASKED: ' : 'YOU ANSWERED: ') + compactar(m.texto, 320);
    }).join(' // ').slice(0, 2000);
  }

  function tope(ms) {
    try { return AbortSignal.timeout(ms); } catch (e) { return undefined; }
  }

  function elegirSala() {
    if (base) return Promise.resolve(base);
    return SALAS.reduce(function (cadena, url) {
      return cadena.then(function (hallada) {
        if (hallada) return hallada;
        return fetch(url + '/salud', { cache: 'no-store', signal: tope(4000) })
          .then(function (r) { return r.ok ? url : null; })
          .catch(function () { return null; });
      });
    }, Promise.resolve(null)).then(function (url) { base = url; return url; });
  }

  function preguntar(pregunta) {
    return elegirSala().then(function (url) {
      if (!url) return { ok: false, porque: 'The agent room is not answering on this machine or on the Lenovo. Start it and ask again.' };
      return fetch(url + '/llamar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: tope(TOPE_ESPERA),
        body: JSON.stringify({
          agente: AGENTE,
          modo: 'charla',
          prioridad: 'dueño',
          tarea: (personaje() ? 'Answer as ' + personaje().nombre + ', in character, in the language of the question: ' : '') + compactar(pregunta, 400) + (conversacionPrevia() ? ' (this continues the conversation in the context, do not start over)' : ''),
          contexto: contextoDeLaPantalla()
        })
      }).then(function (r) {
        if (!r.ok) throw new Error('the room answered HTTP ' + r.status);
        return r.json();
      }).then(function (j) {
        var t = j && (j.respuesta || j.texto || (j.decision && (j.decision.texto || j.decision.veredicto)));
        if (!t) return { ok: false, porque: 'The tutor answered with nothing. Ask again in a moment.' };
        return { ok: true, texto: String(t), motor: j.motor || (j.motores && j.motores[0] && j.motores[0].motor) || '' };
      });
    }).catch(function (e) {
      base = null;
      var tarde = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
      return { ok: false, porque: tarde ? 'The tutor took too long and the question was dropped.' : 'Could not reach the tutor: ' + (e && e.message || e) };
    });
  }

  function conTopeDuro(promesa) {
    return Promise.race([
      promesa,
      new Promise(function (r) {
        setTimeout(function () { r({ ok: false, porque: 'No answer came back in time. Check that the agent room is running.' }); }, TOPE_DURO);
      })
    ]);
  }

  function nodo(tag, clase, txt) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (txt != null) n.textContent = txt;
    return n;
  }

  function icono(d) {
    return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }

  function montar() {
    var burbuja = nodo('button', 'zt-bubble');
    burbuja.type = 'button';
    burbuja.title = 'Ask the tutor';
    burbuja.setAttribute('aria-label', 'Ask the tutor');
    burbuja.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M12 3.2a3 3 0 0 0-3 3 2.8 2.8 0 0 0-2 4.4 2.9 2.9 0 0 0 .7 4.3A2.8 2.8 0 0 0 12 20.8Z"/>'
      + '<path d="M12 3.2a3 3 0 0 1 3 3 2.8 2.8 0 0 1 2 4.4 2.9 2.9 0 0 1-.7 4.3 2.8 2.8 0 0 1-4.3 1.9"/>'
      + '<path d="M12 3.2v17.6"/></svg>';

    var panel = nodo('section', 'zt-panel');
    panel.hidden = true;

    var cabecera = nodo('header', 'zt-head');
    var cara = nodo('img', 'zt-face-head');
    cara.alt = '';
    var nombre = nodo('b', null, 'Tutor');
    var rol = nodo('small', null, 'sees this mission');
    cabecera.appendChild(cara);
    cabecera.appendChild(nombre);
    cabecera.appendChild(rol);

    function vestir() {
      var pj = personaje();
      cara.hidden = !pj;
      if (!pj) return;
      cara.src = pj.imagen;
      nombre.textContent = pj.nombre;
      rol.textContent = pj.rol + ' · sees this mission';
      burbuja.title = burbuja.ariaLabel = 'Ask ' + pj.nombre;
      burbuja.classList.add('zt-con-cara');
      burbuja.style.setProperty('--pj-acc', pj.acento);
      panel.style.setProperty('--pj-acc', pj.acento);
      burbuja.innerHTML = '';
      var foto = nodo('img', 'zt-face');
      foto.src = pj.imagen;
      foto.alt = pj.nombre;
      burbuja.appendChild(foto);
    }

    var mover = nodo('button', 'zt-icon');
    mover.type = 'button';
    var nuevo = nodo('button', 'zt-icon');
    nuevo.type = 'button';
    nuevo.title = 'Start a new chat';
    nuevo.innerHTML = icono('<path d="M12 5v14M5 12h14"/>');
    var cerrar = nodo('button', 'zt-icon zt-x');
    cerrar.type = 'button';
    cerrar.title = 'Hide';
    cerrar.innerHTML = icono('<path d="M18 6 6 18M6 6l12 12"/>');

    cabecera.appendChild(mover);
    cabecera.appendChild(nuevo);
    cabecera.appendChild(cerrar);

    var cuerpo = nodo('div', 'zt-body');
    var forma = nodo('form', 'zt-form');
    var campo = nodo('input', 'zt-input');
    campo.type = 'text';
    campo.placeholder = 'Why does this fail?';
    campo.autocomplete = 'off';
    var enviar = nodo('button', 'zt-send', 'Ask');
    enviar.type = 'submit';
    forma.appendChild(campo);
    forma.appendChild(enviar);

    panel.appendChild(cabecera);
    panel.appendChild(cuerpo);
    panel.appendChild(forma);
    document.body.appendChild(burbuja);
    document.body.appendChild(panel);

    function pintar() {
      cuerpo.innerHTML = '';
      if (!hilo.length) {
        var vacio = nodo('div', 'zt-empty');
        var pj = personaje();
        vacio.appendChild(nodo('b', null, pj ? pj.hola : 'Stuck on this mission?'));
        vacio.appendChild(nodo('p', null, 'Ask in your own words. ' + (pj ? pj.nombre : 'The tutor') + ' already sees the mission, your code and the last thing the screen answered.'));
        cuerpo.appendChild(vacio);
        return;
      }
      hilo.forEach(function (m) {
        var fila = nodo('div', 'zt-msg zt-' + m.quien);
        fila.appendChild(nodo('span', 'zt-who', m.quien === 'yo' ? 'You' : (m.nombre || 'Tutor')));
        fila.appendChild(nodo('p', null, m.texto));
        if (m.motor) fila.appendChild(nodo('i', 'zt-motor', m.motor));
        cuerpo.appendChild(fila);
      });
      cuerpo.scrollTop = cuerpo.scrollHeight;
    }

    function aplicarLado() {
      panel.classList.toggle('zt-izq', lado === 'izquierda');
      burbuja.classList.toggle('zt-izq', lado === 'izquierda');
      mover.title = lado === 'izquierda' ? 'Move to the right' : 'Move to the left';
      mover.innerHTML = icono(lado === 'izquierda' ? '<path d="M9 6l6 6-6 6"/>' : '<path d="M15 6l-6 6 6 6"/>');
      try { localStorage.setItem(CLAVE_LADO, lado); } catch (e) {}
    }

    function alternar(quiero) {
      abierto = quiero == null ? !abierto : quiero;
      panel.hidden = !abierto;
      burbuja.classList.toggle('is-open', abierto);
      if (abierto) setTimeout(function () { campo.focus(); }, 60);
    }

    mover.addEventListener('click', function () {
      lado = lado === 'izquierda' ? 'derecha' : 'izquierda';
      aplicarLado();
    });

    nuevo.addEventListener('click', function () {
      hilo = [];
      guardarHilo();
      pintar();
      campo.focus();
    });

    burbuja.addEventListener('click', function () { alternar(); });
    cerrar.addEventListener('click', function () { alternar(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && abierto) alternar(false); });

    forma.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = campo.value.trim();
      if (!q || pensando) return;
      campo.value = '';
      hilo.push({ quien: 'yo', texto: q });
      hilo.push({ quien: 'tutor', texto: 'Thinking...', temporal: true });
      pintar();
      pensando = true;
      enviar.disabled = true;

      function cerrarTurno(res) {
        pensando = false;
        enviar.disabled = false;
        if (hilo.length && hilo[hilo.length - 1].temporal) hilo.pop();
        var quien = personaje();
        hilo.push(res.ok ? { quien: 'tutor', texto: res.texto, motor: res.motor, nombre: quien && quien.nombre } : { quien: 'tutor', texto: res.porque });
        guardarHilo();
        pintar();
      }

      conTopeDuro(preguntar(q)).then(cerrarTurno, function (err) {
        cerrarTurno({ ok: false, porque: 'Something broke on the way to the tutor: ' + (err && err.message || err) });
      });
    });

    document.addEventListener('pj:cambio', function () { vestir(); pintar(); });
    document.addEventListener('pj:abrir-tutor', function () { alternar(true); });
    vestir();
    aplicarLado();
    pintar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();
})();
