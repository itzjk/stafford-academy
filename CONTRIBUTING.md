# Contributing to Stafford Academy

Thank you for helping! Stafford Academy is a free, non-profit academy, and every mission, fix or idea makes it better for a student somewhere. You do not need to be an expert: a clear explanation or a well-made exercise is as valuable as code.

## Ways to help

- **Improve a mission.** Fix a typo, a confusing explanation, a wrong answer or a check that rejects a correct answer.
- **Add missions or a whole course.** Python courses, or courses with no code at all (multiple choice, calculations or prompt writing).
- **Translate.** Help bring the academy to students in other languages.
- **Improve the app.** The helper robot Zerack, the home page figures, accessibility, performance.
- **Report a problem.** Open an issue, even if you do not know how to fix it.

Looking for a first task? Check the issues labelled [good first issue](https://github.com/itzjk/stafford-academy/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

## Run it locally

1. Fork and clone the repository.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and choose the repository folder.
3. Click the Stafford Academy icon in the toolbar. After you edit a file, press the reload button on the extension card.

No build step and no dependencies: it is plain HTML, CSS and JavaScript, plus Python for the tools.

## How a course is made

Each course is one JSON file in `academy/courses/`, listed in `academy/courses/catalog.json`. A course has `chapters`, each chapter has `lessons`, and every lesson (a mission) has:

| Field | What it is |
| --- | --- |
| `id` | Unique inside the course, for example `g0-1` |
| `title`, `goal` | The mission name and what the student can do after it |
| `theory` | A short Markdown briefing: paragraphs, `- ` lists, `inline code`, **bold** and fenced code blocks |
| `task`, `hint` | What to do, and a nudge that does not give the answer away |
| `check` | How the answer is graded (see below) |
| `xp` | 15 to 40, up to 60 for a chapter's final challenge |

Code missions also have `starter` (the code in the editor at the start) and `solution`.

### Kinds of check

- **`runs`**: the student's Python runs in the browser and its output must equal `expects`. Use for beginner missions with a clear printed result.
- **`contains`**: the answer must contain the code fragments in `value`.
- **`choice`**: pick one of 3 or 4 `options`. `answer` is the index of the right one, and `why` explains every option, because the student reads the explanation of the one they picked.
- **`number`**: a calculation with an `answer`, a `unit` and a `tolerance`.
- **`prompt`**: the student writes a prompt for an AI. A `rubric` lists what a good prompt includes, each item with regular expressions that recognise it. Add an `alternative` good prompt and a `weak` one so the rubric is proven fair.

Look at an existing course of the same kind and copy its shape.

### Rules that keep missions fair

- **Taught before tested.** Everything the check demands must appear in the theory, task, hint or starter. A name that only exists in the solution cannot be guessed.
- **The starter must not already pass.** The student has to do the work.
- **Deterministic output.** Use a fixed `random.seed(...)` and fixed dates.
- **Standard library only.** Python runs in Pyodide, in the browser, with no internet.
- **Plain, friendly English.** Short sentences, second person, no jargon without an explanation.

## Before you open a pull request

```bash
python3 tools/check_course.py                 # checks every course
python3 tools/build_search_index.py           # lets Zerack answer questions about your missions
```

`check_course.py` runs every Python solution, checks every question and rubric, and makes sure the catalog counts match. Please make sure it prints `All good.`

## Pull requests

- Keep each pull request about one thing.
- Describe what you changed and why, and paste the output of `check_course.py`.
- Everything in the repository is in English: code, comments, file names and course content.
- By contributing you agree that your work is released under the [MIT License](LICENSE).

## Be kind

This project exists for learners. Be welcoming, patient and respectful in issues, reviews and discussions.
