"""Checks course files before they go into the academy.

    python3 tools/check_course.py                      # every course in the catalog
    python3 tools/check_course.py academy/courses/programming.json

For every mission it checks the fields every lesson needs, then the check
that grades it:

  runs      the solution runs with python3 and prints check.expects exactly;
            the starter runs too (unless starterFails marks it as broken on
            purpose), and does not already print the answer
  contains  every required fragment appears in the solution
  regex     every pattern compiles and matches the solution
  output    the expected text appears in the solution
  choice    3 or 4 options, a valid answer, and one "why" per option
  number    a numeric answer, a unit and a tolerance
  prompt    the model prompt and the alternative prompt pass the rubric,
            the weak prompt fails it on at least one item

It also checks that the catalog's mission and chapter counts match the file.
Python missions run on your local python3; the academy runs Pyodide, so keep
solutions to the standard library.
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COURSES = ROOT / 'academy' / 'courses'
BASE_FIELDS = ['id', 'title', 'goal', 'theory', 'task', 'hint', 'check', 'xp']


def normalize_output(text):
    """Same normalization as the app: drop trailing spaces and final newlines."""
    return re.sub(r'\n+$', '', re.sub(r'[ \t]+$', '', (text or '').replace('\r', ''), flags=re.M))


def flatten(text):
    """Same spacing-insensitive form the app uses to compare code fragments."""
    return re.sub(r' ?([^\w\s]) ?', r'\1', re.sub(r'\s+', ' ', (text or '').replace('\r', ''))).strip()


def run_python(code, stdin=''):
    with tempfile.TemporaryDirectory() as folder:
        return subprocess.run([sys.executable, '-c', code], input=stdin, capture_output=True,
                              text=True, timeout=15, cwd=folder)


def passes_rubric(check, text):
    text = (text or '').replace('’', "'").replace('‘', "'")
    items_ok = all(any(re.search(p, text, re.I) for p in item['any']) for item in check['rubric'])
    return items_ok and len(text.split()) >= check.get('minWords', 0)


def check_lesson(lesson, report):
    for field in BASE_FIELDS:
        if field not in lesson or lesson[field] in ('', None):
            report(f'missing field "{field}"')
    check = lesson.get('check') or {}
    kind = check.get('type')
    solution = lesson.get('solution', '')

    if kind == 'runs':
        result = run_python(solution, lesson.get('stdin', ''))
        if result.returncode:
            report('solution crashes: ' + (result.stderr.strip().splitlines() or ['?'])[-1])
        elif 'expects' in check and normalize_output(result.stdout) != normalize_output(check['expects']):
            report('solution output differs from check.expects')
        starter = run_python(lesson.get('starter', ''), lesson.get('stdin', ''))
        if lesson.get('starterFails'):
            # A few missions start from broken code on purpose, to teach reading errors.
            if not starter.returncode:
                report('starterFails is set but the starter runs without an error')
            elif lesson.get('starterError') and lesson['starterError'] not in starter.stderr:
                report(f'the starter should fail with {lesson["starterError"]!r}')
        elif starter.returncode:
            report('starter crashes: ' + (starter.stderr.strip().splitlines() or ['?'])[-1])
        elif 'expects' in check and normalize_output(starter.stdout) == normalize_output(check['expects']):
            report('starter already prints the expected output')
        for fragment in check.get('value') or []:
            if flatten(fragment) not in flatten(solution):
                report(f'fragment {fragment!r} is not in the solution')
    elif kind == 'contains':
        values = check.get('value') or []
        for fragment in values if isinstance(values, list) else [values]:
            if flatten(fragment) not in flatten(solution):
                report(f'fragment {fragment!r} is not in the solution')
    elif kind == 'regex':
        values = check.get('value') or []
        for pattern in values if isinstance(values, list) else [values]:
            try:
                if not re.search(pattern, solution, re.M):
                    report(f'pattern {pattern!r} does not match the solution')
            except re.error as error:
                report(f'pattern {pattern!r} does not compile: {error}')
    elif kind == 'output':
        if str(check.get('value', '')).strip() not in solution:
            report('the expected output text is not in the solution')
    elif kind == 'choice':
        options, why = check.get('options', []), check.get('why', [])
        if not 3 <= len(options) <= 4:
            report('choice needs 3 or 4 options')
        if len(why) != len(options) or not all(str(w).strip() for w in why):
            report('choice needs one "why" per option')
        if not isinstance(check.get('answer'), int) or not 0 <= check['answer'] < len(options):
            report('choice "answer" must be the index of the right option')
        if not check.get('explain'):
            report('choice needs "explain"')
    elif kind == 'number':
        if not isinstance(check.get('answer'), (int, float)):
            report('number needs a numeric "answer"')
        if not isinstance(check.get('tolerance'), (int, float)) or check['tolerance'] < 0:
            report('number needs a "tolerance" of 0 or more')
        if 'unit' not in check:
            report('number needs a "unit" (it can be "")')
        if not check.get('explain'):
            report('number needs "explain" with the worked calculation')
    elif kind == 'prompt':
        rubric = check.get('rubric', [])
        try:
            for item in rubric:
                for pattern in item['any']:
                    re.compile(pattern)
        except (KeyError, re.error) as error:
            report(f'broken rubric: {error}')
            return
        if not 2 <= len(rubric) <= 6:
            report('prompt rubric needs 2 to 6 items')
        if not passes_rubric(check, solution):
            report('the model prompt (solution) fails its own rubric')
        if not check.get('alternative') or not passes_rubric(check, check['alternative']):
            report('"alternative" must be a second good prompt that passes the rubric')
        weak = check.get('weak')
        if not weak or all(any(re.search(p, weak, re.I) for p in item['any']) for item in rubric):
            report('"weak" must be a poor prompt that misses at least one rubric item')
    else:
        report(f'unknown check type {kind!r}')


def check_course(path, catalog_entry):
    problems = []
    course = json.loads(Path(path).read_text())
    seen = set()
    lessons = 0
    for chapter in course.get('chapters', []):
        for lesson in chapter.get('lessons', []):
            lessons += 1
            lesson_id = lesson.get('id', '?')
            if lesson_id in seen:
                problems.append(f'{lesson_id}: duplicate id')
            seen.add(lesson_id)
            check_lesson(lesson, lambda message, lid=lesson_id: problems.append(f'{lid}: {message}'))
    if catalog_entry:
        if catalog_entry.get('lessons') != lessons:
            problems.append(f'catalog says {catalog_entry.get("lessons")} missions, the file has {lessons}')
        if catalog_entry.get('chapters') != len(course.get('chapters', [])):
            problems.append(f'catalog says {catalog_entry.get("chapters")} chapters, the file has {len(course.get("chapters", []))}')
    else:
        problems.append('this course is not in catalog.json')
    return lessons, problems


def main():
    catalog = json.loads((COURSES / 'catalog.json').read_text())
    entries = {c['id']: c for c in catalog['courses']}
    paths = [Path(p) for p in sys.argv[1:]] or [COURSES / (c + '.json') for c in entries]
    total_problems = 0
    for path in paths:
        lessons, problems = check_course(path, entries.get(path.stem))
        total_problems += len(problems)
        status = 'ok' if not problems else f'{len(problems)} problem(s)'
        print(f'{path.stem}: {lessons} missions, {status}')
        for problem in problems:
            print('   ' + problem)
    print('All good.' if not total_problems else f'{total_problems} problem(s) found.')
    sys.exit(1 if total_problems else 0)


if __name__ == '__main__':
    main()
