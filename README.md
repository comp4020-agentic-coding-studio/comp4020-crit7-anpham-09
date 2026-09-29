# Fine Print

A Master of Computing (7706) study planner that validates while you plan,
instead of after you commit.

ANU's Programs and Courses holds every enrolment rule, and ISIS enforces
them. Both know whether you're eligible and whether your plan will
graduate you — neither tells you then. Fine Print surfaces that same data
at the moment it's useful: add a course and see immediately what blocks
it and what it counts towards.

## What good looks like here

Good is that no blocked course is ever shown without its reason: which
prerequisite, which session, which permission code. A bare "not eligible"
is the failure being replaced.

Good is also failing closed: a course the catalogue doesn't know is
reported unknown, never fine — an app claiming to tell the truth must
never silently pass.

`spec/` enforces the mechanics of both; it cannot enforce judgement — which
readings of ANU's prose are honest, which simplifications are safe, which
gaps are worth naming rather than hiding. That judgement is below.

## Two modelling decisions

**Prerequisites are temporal.** A prerequisite is satisfied only by a
course completed in a strictly earlier term — except where ANU's prose
says "completed **or be currently studying**" (or "currently enrolled
in"), modelled as a `concurrent: true` flag allowing the same term
instead. This is load-bearing — a strictly-earlier-only model would have
falsely blocked COMP6120's real requisite (completed or currently
studying COMP6442).

**Buckets constrain rather than partition.** A course allocated to one
bucket doesn't leave the others' totals alone. Each bucket carries a
minimum, some a maximum, and the 8000-level-COMP requirement is an
**overlay**: it counts every 8000-level COMP course toward its own
24-unit minimum regardless of bucket, so one course can count twice —
simultaneous constraints, not a partition.

## Data provenance

The original 16 courses are transcribed by hand from ANU Programs and
Courses into `src/data/seed.json`, never scraped at runtime: the
compulsory, foundational and project lists for all three Academic Years,
the HCC specialisation, and the further-computing overlay reference.

The catalogue now covers every other COMP and ENGN course at 6000–8000
level offered in 2026, plus the courses the program rules reference —
**72 courses**, the extra 56 machine-extracted from each course's own
`/2026/course/<code>` page, all appearing in the plan page's catalogue
table.

**56 of the 72 have prerequisites this app does not model** — their
`requisiteNote` is real ANU prose, the same field the hand-verified 16
carry, but never converted into a structured `prereqs` rule. An
unconverted course must never look like one with no prerequisite: every
plan item for one of the 56 carries a named `requisites-not-modelled`
warning citing ANU's own wording, and its catalogue-table cell reads "Not
modelled" rather than "None".

Four variable-unit courses — **COMP8820, ENGN6200, ENGN8602, ENGN8999** —
are excluded: their unit value varies by enrolment, and this planner
assumes one fixed value per course, so seeding them would mean guessing a
number ANU itself doesn't fix.

`sessions` is read off each course's current Programs and Courses page,
not filtered to the years this app models, so a course retired after 2025
still shows whichever semester(s) its page last listed rather than "no
longer offered". COMP6250 and COMP8260 are the live examples: both still
display 2025's semesters though ANU stopped running them since.

Seventeen of the 56 additions have no session data at all — their pages
list no First or Second Semester offering — so they render "—" and are
blocked in every term with "no semester on record": honest behaviour,
disclosed here rather than left for a reader to discover.

### Three simplifications applied to the requisite prose

1. **Program-enrolment clauses are dropped.** Every plan here is a Master of
   Computing plan, so "must be enrolled in the Master of Computing" is
   satisfied by construction. Where that was the *only* requirement
   (COMP6250, COMP6390, COMP8260, COMP8280, MATH6005), the structured
   rule is empty.
2. **Out-of-catalogue codes are dropped only where they are OR-options** —
   one alternative among several, though the full prose still shows them.
   A plan can only contain a course this catalogue knows, so such an
   option could never be satisfied and dropping it only tightens the
   rule. An out-of-catalogue **AND-conjunct** is a separate requirement,
   so dropping it would weaken the rule instead; it's kept via whichever
   of its own OR-options are in-catalogue — COMP8410's two conjuncts each
   keep only their in-catalogue alternative(s) (COMP6240; COMP6730 or
   COMP6710).
3. **Incompatibility rules are not modelled at all.** "Incompatible with
   COMP2100" is a real ANU rule this app does not check, though the full
   prose carrying it is still shown.

### A known limitation: allocation does not backtrack

Progress allocation is greedy — one pass, bucket sort order, first fit — so
an already-invalid plan can name the wrong course as the surplus. The
project bucket caps at 12 units; a plan holding COMP8715 (6u) and
COMP8830 (12u) allocates COMP8715 first, leaving no room for COMP8830,
though COMP8830 alone would have filled the cap exactly. The bucket's
`exceeded` status still fires correctly — only the surplus's *name* can be
wrong, never on a valid plan. Fixing it needs backtracking search, out of
scope here, so it's named instead.

### Program requirements are scoped by the year you commenced

ANU holds a student to the program requirements of the Academic Year they
commenced, so this app seeds three years' worth of buckets (2024, 2025,
2026) rather than one; creating a plan picks a commencement year (2026 by
default) and the plan page evaluates that year's rules. The years differ
in shape, not just numbers: 2024/2025's compulsory list is COMP6250,
COMP6442, COMP6710 and COMP8260 for 24 units, 2026's is COMP6120,
COMP6442, COMP7710 and COMP8280 for 30; 2024/2025's project bucket is a
mandatory 12-unit floor, 2026's an optional 12-unit cap of the same size;
and 2024's 8000-level-COMP overlay also counts non-COMP specialisation
courses, which 2025 and 2026 don't. `spec/program-years.test.ts` proves
the same plan reports differently depending on which year applies.

### The specialisation list is partial

The Human Centred and Creative Computing specialisation's own Programs and
Courses page was never fetched; its member list is seeded with just two
courses already in this catalogue — COMP6390 and COMP8020 — not the full
membership. The `specialisation` bucket needs 24 units and these two
supply only 12, so it stays permanently `unmet`, and no plan built here
can report the degree complete.

### Programs and Courses contradicts itself, twice

- **COMP7710** is *Programming Fundamentals* on its course page and Study
  Options table, but *Structured Programming* in Program Requirements;
  seeded as *Programming Fundamentals*, since its own page and the
  majority of sources agree.
- **MATH6005** is *Discrete Mathematical Models* on its course page, but
  *Discrete Mathematics Models* in Program Requirements; seeded as
  *Discrete Mathematical Models* for the same reason.

Neither is a transcription error: ANU's own site disagrees with itself
about a compulsory course's name, named here rather than smoothed over.

## What was not built

Incompatibility checking, backtracking allocation, a full specialisation
catalogue, and structured prerequisites for the 56 machine-extracted
courses: all named above, all deliberate cuts rather than things run out
of time for.
