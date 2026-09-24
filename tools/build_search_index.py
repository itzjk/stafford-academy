"""Builds academy/courses/search-index.json, the offline knowledge Zerack uses
to answer questions about anything the courses teach.

Run it after adding or editing a course:

    python3 tools/build_search_index.py

For every mission it stores the title, the goal, a short summary of the
theory and its most distinctive keywords (TF-IDF), so the helper can find the
mission that teaches a topic without loading every course file.
"""
import json
import math
import re
from collections import Counter
from pathlib import Path

COURSES = Path(__file__).resolve().parent.parent / 'academy' / 'courses'
KEYWORDS_PER_LESSON = 30
SUMMARY_CHARS = 320

STOPWORDS = set("""
a about above after again against all also am an and any are as at be because been before being below between both but by
can could did do does doing done down during each else even every few for from further get gets got had has have having he her
here hers him his how i if in into is it its itself just keep know let like make makes many may me more most much must my
new no nor not now of off on once one only or other our out over own same she should so some such than that the their them
then there these they this those through to too two under until up us use used uses using very want was way we were what
when where which while who whom why will with would you your yours yourself first next last each back right left still
line lines code thing things part number numbers time run runs print prints call calls mission task write
""".split())

# Undoes the most common English endings so "filters" matches "filter".
def stem(word):
    for suffix, keep in (('ies', 'y'), ('ing', ''), ('ed', ''), ('es', ''), ('s', '')):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)] + keep
    return word

def words(text):
    text = re.sub(r'```.*?```', ' ', text or '', flags=re.S)
    for w in re.findall(r'[a-z][a-z0-9_]{2,}', text.lower()):
        if w not in STOPWORDS:
            yield stem(w)

def summary(theory):
    text = re.sub(r'```.*?```', ' ', theory or '', flags=re.S)
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) <= SUMMARY_CHARS:
        return text
    cut = text[:SUMMARY_CHARS]
    end = max(cut.rfind('. '), cut.rfind('? '), cut.rfind('! '))
    return (cut[: end + 1] if end > 120 else cut.rsplit(' ', 1)[0] + ' ...').strip()

catalog = json.loads((COURSES / 'catalog.json').read_text())
docs = []
for course in catalog['courses']:
    data = json.loads((COURSES / (course['id'] + '.json')).read_text())
    for chapter in data['chapters']:
        for lesson in chapter['lessons']:
            counts = Counter()
            for w in words(lesson.get('title', '')):
                counts[w] += 4
            for w in words(lesson.get('goal', '')):
                counts[w] += 2
            for w in words(lesson.get('theory', '')):
                counts[w] += 1
            docs.append((course, lesson, counts))

document_frequency = Counter()
for _, _, counts in docs:
    document_frequency.update(counts.keys())
total = len(docs)

# Weights are TF-IDF on one shared scale, so a mission that is about a
# topic outweighs one that only mentions it. The scale puts a strong keyword
# (the 95th percentile of every mission's best one) near 1.
scored_all = []
for course, lesson, counts in docs:
    scored = {w: math.log(1 + n) * math.log(total / document_frequency[w]) for w, n in counts.items()}
    scored_all.append(sorted(scored.items(), key=lambda kv: -kv[1])[:KEYWORDS_PER_LESSON])
peaks = sorted(top[0][1] for top in scored_all if top)
scale = peaks[int(len(peaks) * 0.95)] if peaks else 1

lessons = []
for (course, lesson, counts), top in zip(docs, scored_all):
    peak = scale
    lessons.append({
        'c': course['id'],
        'l': lesson['id'],
        't': lesson.get('title', ''),
        'g': lesson.get('goal', ''),
        's': summary(lesson.get('theory', '')),
        'k': {w: round(v / peak, 2) for w, v in top if v > 0},
    })

index = {'courses': {c['id']: c['title'] for c in catalog['courses']}, 'lessons': lessons}
out = COURSES / 'search-index.json'
out.write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'{len(lessons)} missions indexed, {out.stat().st_size // 1024} KB -> {out}')
