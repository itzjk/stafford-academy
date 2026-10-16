"""Tests for build_search_index.py. Run from the repository root:

    python3 -m unittest discover -s tools -p 'test_*.py'
"""
import contextlib
import io
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_search_index as bsi  # noqa: E402

REAL = Path(__file__).resolve().parent.parent / 'academy' / 'courses'


class SearchIndexTest(unittest.TestCase):
    def setUp(self):
        self.folder = Path(tempfile.mkdtemp())
        catalog = {'courses': [{'id': 'a', 'title': 'Course A', 'lessons': 2, 'chapters': 1}]}
        lessons = [
            {'id': 'a1', 'title': 'Filters and kernels', 'goal': 'Blur an image', 'theory': 'A kernel slides over the image.'},
            {'id': 'a2', 'title': 'Loops', 'goal': 'Repeat work', 'theory': 'A while loop repeats until its condition is false.'},
        ]
        (self.folder / 'catalog.json').write_text(json.dumps(catalog))
        (self.folder / 'a.json').write_text(json.dumps({'id': 'a', 'chapters': [{'lessons': lessons}]}))

    def tearDown(self):
        shutil.rmtree(self.folder)

    def run_main(self, *args):
        out = io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            code = bsi.main(list(args), courses=self.folder)
        return code, out.getvalue()

    def test_build_writes_an_index_of_every_mission(self):
        code, _ = self.run_main()
        self.assertEqual(code, 0)
        index = json.loads((self.folder / 'search-index.json').read_text())
        self.assertEqual([m['l'] for m in index['lessons']], ['a1', 'a2'])
        self.assertEqual(index['courses'], {'a': 'Course A'})

    def test_check_passes_on_a_fresh_index_and_writes_nothing(self):
        self.run_main()
        before = (self.folder / 'search-index.json').stat().st_mtime_ns
        code, out = self.run_main('--check')
        self.assertEqual(code, 0, out)
        self.assertEqual((self.folder / 'search-index.json').stat().st_mtime_ns, before)

    def test_check_fails_when_a_mission_changed(self):
        self.run_main()
        data = json.loads((self.folder / 'a.json').read_text())
        data['chapters'][0]['lessons'][1]['title'] = 'Recursion'
        (self.folder / 'a.json').write_text(json.dumps(data))
        code, out = self.run_main('--check')
        self.assertEqual(code, 1)
        self.assertIn('out of date', out)

    def test_check_fails_when_the_index_is_missing(self):
        code, out = self.run_main('--check')
        self.assertEqual(code, 1)
        self.assertFalse((self.folder / 'search-index.json').exists())

    def test_committed_index_is_up_to_date(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            code = bsi.main(['--check'], courses=REAL)
        self.assertEqual(code, 0, out.getvalue())


if __name__ == '__main__':
    unittest.main()
