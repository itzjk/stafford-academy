# Characters that teach (built 23-10-2026, not yet in the app)

This folder holds work done on 23-10 in an old copy of the Academy (the Spanish `monetize-studio/learn-*` pages). It never reached this repository, so the live Academy has none of it. It is here so it can be ported into `academy/`; nothing in this folder is loaded by the extension.

## What it does

- **Cast per course.** Each course has a character who gives the class: Byte for programming, Voltio for electronics, Chispa for robotics, Mate for the math-heavy courses, Neura for AI and vision, Zack for everything else. The tutor speaks as that character (face in the bubble, name and style in the context it sends).
- **Hand-off.** After 2 failed checks in a row the character calls Kernel, the veteran mentor, or Mate in math-heavy courses.
- **Duel with Bug.** When you pass a mission, Bug sabotages ONE line of your code. It tries sabotages until one really breaks the check, and you get 2 minutes to fix it. Wins are kept in localStorage.

## Files

| File | What it is |
|---|---|
| `personajes.js`, `personajes.css` | Cast, hand-off and Bug duel. Listens to the `zerack:check` event and uses `window.ZerackLeccion` (`pasa`, `poner`). |
| `tutor.js` | Tutor bubble that talks as the course's character. It asks a local tutor service at `127.0.0.1:7801`; without it the tutor stays silent and the rest works. |
| `learn-leccion.js` | The old lesson page script, with the two hooks above added: it fires `zerack:check` after every check and exposes `window.ZerackLeccion`. |
| `learn-leccion.html`, `learn-curso.html` | Where the old pages loaded the files (see the `personajes.*` and `tutor.js` tags). |
| `caras/*.jpg` | The 17 faces, web size. |
| `PERSONAJES.md`, `lamina.png` | Who each character is, and a sheet with all 17. |

## Porting notes

- Course ids in `REPARTO` (inside `personajes.js`) are the old Spanish ids. This repo uses English ids: `electronica` is `electronics-basics`, `ros` is `ros2`, `humanoide` is `humanoids`, `manipulacion` is `manipulation`, `navegacion` is `navigation`, `cinematica` is `kinematics`, `estimacion` is `state-estimation`, `simulacion` is `simulation`, `aprendizaje` is `machine-learning`, `refuerzo` is `reinforcement-learning`, `linux-embebido` is `embedded-linux`, `python-robotica` is `python-robotics`, `energia` is `power`.
- `academy/lesson.js` here is a rewrite of the old `learn-leccion.js`. The two hooks have to be added to it: an event after each check with whether it passed, and a way to read and replace the code in the editor.
- Not started: Nodo as an avatar that lights up with each mission, a voice per character, and courses for Pixel, Cifra, Turbo, Clave, Nube and Ritmo.
