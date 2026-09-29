# Process overview

## What I built

Fine Print: a Master of Computing (7706) study planner that validates while
you plan — per-course eligibility with named blocking reasons, and degree
progress against the program's real requirement buckets — instead of after
you commit, which is what ISIS does today.

## How I got here

Design picked a truth-teller stance over three rejected alternatives: the
pessimist (ranks plan fragility, answers a question nobody asked), the
honest bureaucrat (satirises ISIS's obstruction, spends the risk budget on
tone), and an earnest planner with no stance at all
([`003d2d7`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-anpham-09/commit/003d2d7)).
One idea survived from the rejected pessimist: every blocked course names
what specifically blocks it.

The plan sequenced a scrape before the engines it would feed. Fetching and
reading all 13 courses' real requisite prose first, then hand-transcribing
rather than scraping at build time, broke three planning assumptions before
any engine code existed — the load-bearing one being COMP6120's "completed
**or be currently studying** COMP6442", which a strictly-earlier
prerequisite model would have falsely blocked
([`d559053...261b120`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-anpham-09/compare/d559053...261b120)).

The sharpest correction came from not trusting a green test. The
`loadBuckets()` sort assertion passed, but only because the seed arrives
pre-sorted — it could never have failed. Deleting the sort call entirely and
rerunning the suite left every test green, which is what exposed the blind
spot; the fix now sabotages the row order first and asserts the sort
recovers it
([`d62eba2`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-anpham-09/commit/d62eba2)).
