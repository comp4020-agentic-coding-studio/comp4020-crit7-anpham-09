# Fine Print

A Master of Computing (7706) study planner that validates while you plan,
instead of after you commit.

ANU's Programs and Courses holds every enrolment rule, and ISIS enforces
them. Both know whether you're eligible and whether your plan will
graduate you — neither tells you. Fine Print surfaces that data when
useful: add a course and see what blocks it and what it counts towards.

## What good looks like here

Good is that no blocked course is ever shown without its reason: which
prerequisite, which session, which permission code. A bare "not eligible"
is the failure being replaced.

Good is also failing closed: a course the catalogue doesn't know is
reported unknown, never fine — an app claiming to tell the truth must
never silently pass.

`spec/` enforces the mechanics of both; it cannot enforce judgement —
which readings of ANU's prose are honest, which simplifications are safe,
which gaps are worth naming. That judgement is below.

## Two modelling decisions

**Prerequisites are temporal.** A prerequisite is satisfied only by a
course completed in a strictly earlier term — except where ANU's prose
says "completed **or be currently studying**" (or "currently enrolled
in"), modelled as a `concurrent: true` flag allowing the same term. This
is load-bearing — a strictly-earlier-only model would have falsely
blocked COMP6120's real requisite (completed or currently studying
COMP6442).

**Buckets constrain rather than partition.** A course in one bucket
doesn't leave others' totals alone. Each bucket carries a minimum, some a
maximum, and the 8000-level-COMP requirement is an **overlay**: it counts
every 8000-level COMP course toward its own 24-unit minimum regardless of
bucket, so one course can count twice.

## Data provenance

The original 16 courses are transcribed by hand from ANU Programs and
Courses into `src/data/seed.json`, never scraped at runtime: the
compulsory, foundational and project lists for all three years, the HCC
specialisation, and the further-computing overlay reference.

The catalogue covers the COMP and ENGN 6000–8000 courses ANU's
course-search API — pinned to the 2027 catalogue regardless of year
requested — still lists that also ran in 2026, plus the courses the
program rules reference — **72 courses**, the extra 56 machine-extracted
from each course's own `/2026/course/<code>` page. Not **guaranteed
complete** for 2026: the method drops a 2026 course missing from the 2027
index — it missed **COMP8410/COMP8715**, already seeded by hand.

**56 of the 72 have prerequisites this app does not model** — their
`requisiteNote` is real ANU prose, the same field the hand-verified 16
carry, but never converted into a structured `prereqs` rule, except
**ENGN6628/ENGN8823/ENGN8830**, whose ANU pages carry no requisite
section, so theirs is empty. An unconverted course must never look like
one with no prerequisite: every plan item for one of the 56 carries a
named `requisites-not-modelled` warning citing ANU's own wording, and its
catalogue-table cell reads "Not modelled" rather than "None".

Four variable-unit courses — **COMP8820/ENGN6200/ENGN8602/ENGN8999** —
are excluded: their unit value varies by enrolment, and this planner
assumes one fixed value per course, so seeding them would mean guessing a
number ANU doesn't fix.

`sessions` is read off each course's current Programs and Courses page,
not filtered to years this app models: a retired course still shows
whichever semester(s) its page last listed, not "no longer offered" —
COMP6250/COMP8260 still show 2025's semesters though ANU has since
stopped running them. Seventeen of the 56 additions have no session data
at all, so they render "—" and are blocked every term with "no semester
on record" — honest, disclosed here rather than left for a reader to
discover.

### Three simplifications applied to the requisite prose

1. **Program-enrolment clauses are dropped.** Every plan here is a Master of
   Computing plan, so "must be enrolled in the Master of Computing" is
   satisfied by construction. Where that was the *only* requirement
   (**COMP6250/COMP8260/COMP8280/MATH6005**), the structured rule is
   empty. COMP6390's requisite is an OR — Master of Computing enrolment,
   or 6 units of COMP6442/COMP6710/COMP6720 — so its rule is empty for
   the same reason, not because enrolment was its only clause.
2. **Out-of-catalogue codes are dropped only where they are OR-options** —
   one alternative among several, though the full prose still shows them.
   A plan can only contain a catalogued course, so such an option could
   never be satisfied, and dropping it only tightens the rule. An
   out-of-catalogue **AND-conjunct** is a separate requirement, so
   dropping it would weaken the rule instead; it's kept via whichever
   in-catalogue OR-options it has — COMP8410's two conjuncts each keep
   only their in-catalogue alternative(s) (COMP6240; COMP6730 or
   COMP6710).
3. **Incompatibility rules are not modelled at all.** "Incompatible with
   COMP2100" is a real ANU rule this app does not check, though the full
   prose is still shown.

### A known limitation: allocation does not backtrack

Progress allocation is greedy — one pass, bucket sort order, first fit —
so an already-invalid plan can name the wrong course as surplus. The
12-unit project bucket: holding COMP8715 (6u) and COMP8830 (12u)
allocates COMP8715 first, leaving no room for COMP8830, though COMP8830
alone would have filled the cap exactly. `exceeded` still fires correctly
— only the surplus's *name* can be wrong, never on a valid plan. Fixing
it needs backtracking search, out of scope here — named instead.

### Program requirements are scoped by the year you commenced

ANU holds a student to the program requirements of the Academic Year they
commenced, so this app seeds three years of buckets (2024, 2025, 2026); a
plan picks a commencement year (2026 default) and is evaluated against
that year's rules. The years differ in shape, not just numbers: the
compulsory list is **COMP6250/COMP6442/COMP6710/COMP8260** (24 units) for
2024/2025, **COMP6120/COMP6442/COMP7710/COMP8280** (30) for 2026; the
project bucket is a mandatory 12-unit floor for 2024/2025, an optional
12-unit cap of the same size for 2026; and only 2024's 8000-level-COMP
overlay also counts non-COMP specialisation courses — modelled, but
inert here, since the seeded specialisation has no non-COMP members, so
the flag changes zero verdicts. `spec/program-years.test.ts` proves the
same plan reports differently depending on which year applies.

### The specialisation list is partial

The Human Centred and Creative Computing specialisation's own Programs
and Courses page was never fetched; its member list is seeded with just
two courses already in this catalogue — COMP6390/COMP8020 — not the full
membership. The `specialisation` bucket needs 24 units and these two
supply only 12, so it stays permanently `unmet`, and no plan built here
can report the degree complete.

### Programs and Courses contradicts itself, twice

- **COMP7710**: *Programming Fundamentals* on its course page and Study
  Options table, but *Structured Programming* in Program Requirements —
  seeded as *Programming Fundamentals*, the majority reading.
- **MATH6005**: *Discrete Mathematical Models* on its course page, but
  *Discrete Mathematics Models* in Program Requirements — seeded as
  *Discrete Mathematical Models*, same reason.

Neither is a transcription error: ANU disagrees with itself on a
compulsory course's name, named here rather than smoothed over.

## What was not built

Incompatibility checking, backtracking allocation, a full specialisation
catalogue, and structured prerequisites for the 56 machine-extracted
courses: all named above, all deliberate cuts rather than things run out
of time for.
