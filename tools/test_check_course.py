"""Tests for check_course.py. Run from the repository root:

    python3 -m unittest discover -s tools -p 'test_*.py'
"""
import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_course as cc  # noqa: E402


def lesson(**overrides):
    base = {
        'id': 'm1', 'title': 'T', 'goal': 'G', 'theory': 'Use print.', 'task': 'Print hi.',
        'hint': 'print', 'xp': 20, 'starter': '', 'solution': 'print("hi")',
        'check': {'type': 'contains', 'value': ['print(']},
    }
    base.update(overrides)
    return base


def problems_of(item):
    found = []
    cc.check_lesson(item, found.append)
    return found


def course(course_id, lessons):
    return {'id': course_id, 'title': course_id, 'chapters': [{'title': 'C', 'lessons': lessons}]}


class CheckLessonTest(unittest.TestCase):
    def test_valid_contains_lesson_has_no_problems(self):
        self.assertEqual(problems_of(lesson()), [])

    def test_contains_starter_that_already_passes(self):
        found = problems_of(lesson(starter='print("hi")'))
        self.assertTrue(any('starter already' in p for p in found), found)

    def test_regex_starter_that_already_passes(self):
        item = lesson(starter='x = 1', solution='x = 2',
                      check={'type': 'regex', 'value': [r'^x = \d']})
        found = problems_of(item)
        self.assertTrue(any('starter already' in p for p in found), found)

    def test_runs_solution_that_never_finishes_is_reported(self):
        old = cc.RUN_TIMEOUT
        cc.RUN_TIMEOUT = 1
        try:
            item = lesson(solution='while True:\n    pass', starter='print(0)',
                          check={'type': 'runs', 'expects': '1'})
            found = problems_of(item)
        finally:
            cc.RUN_TIMEOUT = old
        self.assertTrue(any('did not finish' in p for p in found), found)

    def test_runs_wrong_output(self):
        item = lesson(solution='print(2)', starter='print(0)', check={'type': 'runs', 'expects': '1'})
        self.assertIn('solution output differs from check.expects', problems_of(item))


class CatalogTest(unittest.TestCase):
    def run_main(self, files, catalog):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for name, data in files.items():
                (root / name).write_text(json.dumps(data))
            (root / 'catalog.json').write_text(json.dumps({'courses': catalog}))
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                code = cc.main([], courses=root)
            return code, out.getvalue()

    def test_consistent_catalog_passes(self):
        code, out = self.run_main({'a.json': course('a', [lesson()])},
                                  [{'id': 'a', 'lessons': 1, 'chapters': 1}])
        self.assertEqual(code, 0, out)
        self.assertIn('All good.', out)

    def test_course_file_missing_from_catalog(self):
        code, out = self.run_main(
            {'a.json': course('a', [lesson()]), 'b.json': course('b', [lesson()])},
            [{'id': 'a', 'lessons': 1, 'chapters': 1}])
        self.assertEqual(code, 1, out)
        self.assertIn('b: ', out)
        self.assertIn('not in catalog.json', out)

    def test_search_index_is_not_a_course(self):
        code, out = self.run_main(
            {'a.json': course('a', [lesson()]), 'search-index.json': {'courses': {}, 'lessons': []}},
            [{'id': 'a', 'lessons': 1, 'chapters': 1}])
        self.assertEqual(code, 0, out)

    def test_catalog_entry_without_a_file(self):
        code, out = self.run_main({'a.json': course('a', [lesson()])},
                                  [{'id': 'a', 'lessons': 1, 'chapters': 1},
                                   {'id': 'ghost', 'lessons': 3, 'chapters': 1}])
        self.assertEqual(code, 1, out)
        self.assertIn('ghost', out)
        self.assertIn('no course file', out)

    def test_missing_path_argument_is_a_problem_not_a_crash(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = cc.main(['does-not-exist.json'])
        self.assertEqual(code, 1)
        self.assertIn('there is no course file does-not-exist.json', out.getvalue())
        self.assertNotIn('listed in catalog.json', out.getvalue())

    def test_wrong_lesson_count(self):
        code, out = self.run_main({'a.json': course('a', [lesson()])},
                                  [{'id': 'a', 'lessons': 2, 'chapters': 1}])
        self.assertEqual(code, 1)
        self.assertIn('catalog says 2 missions, the file has 1', out)


if __name__ == '__main__':
    unittest.main()
