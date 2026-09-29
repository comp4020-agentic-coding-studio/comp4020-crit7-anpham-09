# Fine Print

A Master of Computing (7706) study planner that validates while you plan,
instead of after you commit.

ANU's Programs and Courses holds every rule about what you may enrol in, and
ISIS enforces them. Both know, at the moment you pick a course, whether you
are eligible and whether your plan will graduate you. Neither tells you then.
Fine Print is that same data, surfaced at the moment it is useful: add a
course to a plan and see, immediately, what blocks it and what it counts
towards.

## What good looks like here

Good is that no blocked course is ever shown without its reason: which
prerequisite, which session, which permission code. A bare "not eligible"
is the failure being replaced.

Good is also failing closed: a course the catalogue does not know is
reported as unknown, never as fine — an app claiming to tell the truth must
never silently pass.

`spec/` enforces the mechanics of both. What it cannot enforce is judgement
— which readings of ANU's prose are honest, which simplifications are safe,
which gaps are worth naming rather than hiding. That judgement is below.

## Two modelling decisions

**Prerequisites are temporal.** A prerequisite is satisfied only by a course
completed in a strictly earlier term — except where ANU's own prose says
"completed **or be currently studying**" (or "currently enrolled in"), which
is modelled as a `concurrent: true` flag on that requirement group and
allows the same term instead. This exception is load-bearing: COMP6120's
real requisite is "completed or be currently studying COMP6442", and a
strictly-earlier-only model would have falsely blocked a course ANU permits.
A false block is worse than no check at all.

**Buckets constrain rather than partition.** A course allocated to one
bucket doesn't leave the others' totals alone. Each bucket carries a
minimum, some carry a maximum, and the 8000-level-COMP requirement is an
**overlay**: it counts every 8000-level COMP course across the plan toward
its own 24-unit minimum, independent of which bucket that course was
allocated to, so one course can be spent by one bucket and still count
there too. This is the honest reading: simultaneous constraints on the
same 96 units, not a partition of them.

## Data provenance

The catalogue is transcribed by hand from the live ANU Programs and Courses
pages (2026) into `src/data/seed.json`, and committed there — never scraped
at runtime. A scraper (`scripts/scrape-pc.ts`) was planned to widen the
catalogue; cut deliberately, in favour of the eligibility and progress
engines the spec's published lines actually grade.
The seed that ships covers **13 courses** — the compulsory, foundational
and project lists, the HCC specialisation, and the further-computing
overlay reference — real ANU data, just not the whole catalogue. All 13
are listed on the plan page's own catalogue table, so discovery is not
out of scope here — only the wider catalogue is.

### Three simplifications applied to the requisite prose

1. **Program-enrolment clauses are dropped.** Every plan here is a Master of
   Computing plan, so "must be enrolled in the Master of Computing" is
   satisfied by construction. Where that was the *only* requirement
   (COMP6390, COMP8280, MATH6005), the structured rule is empty.
2. **Out-of-catalogue codes are dropped only where they are OR-options** —
   one alternative among several — though they stay in the full prose shown
   alongside it. A plan can only ever contain a course this catalogue
   knows, so such an option could never be satisfied, and dropping it only
   tightens the rule. An out-of-catalogue **AND-conjunct** is a separate
   requirement, not an alternative, so dropping it would weaken the rule
   instead. Where the prose has that shape, the conjunct is kept via its
   in-catalogue equivalent — COMP8715 and COMP8830 both require COMP8260,
   seeded via COMP8280.
3. **Incompatibility rules are not modelled at all.** "Incompatible with
   COMP2100" is a real ANU rule this app does not check, though the full
   prose carrying it is still shown.

### A known limitation: allocation does not backtrack

Progress allocation is greedy — one pass over a plan's items, in bucket sort
order, first fit — so an already-invalid plan can name the wrong course as
the surplus. Concretely: the project bucket caps at 12 units, and a plan
holding COMP8715 (6u) and COMP8830 (12u) allocates COMP8715 first, fills 6
of the 12, and leaves no room for COMP8830, which is reported unallocated
even though it alone would have filled the cap exactly. The bucket's
`exceeded` status still fires correctly; only the surplus's *name* can be
wrong, and it never misfires on a valid plan. Fixing it means backtracking
search, out of scope for this build, so it is named here instead.

### The specialisation list is partial

The Human Centred and Creative Computing specialisation's own page on
Programs and Courses was never fetched. Its member list is seeded with two
courses — COMP6390 and COMP8020 — justifiable from courses already in this
catalogue, not the specialisation's full membership. A direct consequence:
the `specialisation` bucket needs 24 units and those two courses supply
only 12, so it is permanently `unmet` and no plan built against this seed
can currently report the degree complete.

### Programs and Courses contradicts itself, twice

- **COMP7710** is *Programming Fundamentals* on its own course page and in
  the program's Study Options table, but *Structured Programming* in the
  Program Requirements section; seeded as *Programming Fundamentals*, since
  the course's own page and the majority of sources agree.
- **MATH6005** is *Discrete Mathematical Models* on its own course page, but
  *Discrete Mathematics Models* in Program Requirements; seeded as *Discrete
  Mathematical Models* for the same reason.

Neither is a transcription error: both are ANU's own site disagreeing with
itself about a compulsory course's name — the kind of quiet inconsistency
this app exists to replace, so it is named rather than smoothed over.

## What was not built

Incompatibility checking, backtracking allocation, a full specialisation
catalogue, and the scraper: all named above, all deliberate cuts rather than
things run out of time for.
