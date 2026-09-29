# Fine Print

A Master of Computing (7706) study planner that validates while you plan,
instead of after you commit.

ANU's Programs and Courses holds every rule about what you may enrol in,
and ISIS enforces them. Both know, when you pick a course, whether you're
eligible and whether your plan will graduate you — neither tells you then.
Fine Print is that same data, surfaced at the moment it's useful: add a
course to a plan and see, immediately, what blocks it and what it counts
towards.

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
instead. This is load-bearing: COMP6120's real requisite is "completed or
be currently studying COMP6442", and a strictly-earlier-only model would
have falsely blocked a course ANU permits. A false block is worse than no
check at all.

**Buckets constrain rather than partition.** A course allocated to one
bucket doesn't leave the others' totals alone. Each bucket carries a
minimum, some a maximum, and the 8000-level-COMP requirement is an
**overlay**: it counts every 8000-level COMP course across the plan toward
its own 24-unit minimum regardless of bucket, so one course can count
twice. This is the honest reading: simultaneous constraints on the same 96
units, not a partition of them.

## Data provenance

The catalogue is transcribed by hand from the live ANU Programs and Courses
pages into `src/data/seed.json`, committed there — never scraped at
runtime. A scraper (`scripts/scrape-pc.ts`) was planned to widen the
catalogue, cut deliberately in favour of the eligibility and progress
engines the spec actually grades.
The seed that ships covers **16 courses**: the compulsory, foundational
and project lists for all three Academic Years this app models, the HCC
specialisation, and the further-computing overlay reference — real ANU
data, just not the whole catalogue. All 16 appear in the plan page's
catalogue table, so only the wider catalogue is out of scope.

### Three simplifications applied to the requisite prose

1. **Program-enrolment clauses are dropped.** Every plan here is a Master of
   Computing plan, so "must be enrolled in the Master of Computing" is
   satisfied by construction. Where that was the *only* requirement
   (COMP6250, COMP6390, COMP8260, COMP8280, MATH6005), the structured
   rule is empty.
2. **Out-of-catalogue codes are dropped only where they are OR-options** —
   one alternative among several — though the full prose alongside still
   shows them. A plan can only ever contain a course this catalogue knows,
   so such an option could never be satisfied, and dropping it only
   tightens the rule. An out-of-catalogue **AND-conjunct** is a separate
   requirement, so dropping it would weaken the rule instead; there, the
   conjunct is kept via whichever of its own OR-options are in-catalogue —
   COMP8410's two conjuncts each keep only their in-catalogue
   alternative(s) (COMP6240; COMP6730 or COMP6710).
3. **Incompatibility rules are not modelled at all.** "Incompatible with
   COMP2100" is a real ANU rule this app does not check, though the full
   prose carrying it is still shown.

### A known limitation: allocation does not backtrack

Progress allocation is greedy — one pass, bucket sort order, first fit — so
an already-invalid plan can name the wrong course as the surplus.
Concretely: the project bucket caps at 12 units, and a plan holding
COMP8715 (6u) and COMP8830 (12u) allocates COMP8715 first, filling 6 of
the 12 and leaving no room for COMP8830, reported unallocated even though
it alone would have filled the cap exactly. The bucket's `exceeded` status
still fires correctly; only the surplus's *name* can be wrong, and never
on a valid plan. Fixing it needs backtracking search, out of scope here,
so it's named instead.

### Program requirements are scoped by the year you commenced

ANU holds a student to the program requirements of the Academic Year they
commenced, not the current one, so this app seeds three years' worth of
buckets (2024, 2025, 2026) rather than one. Creating a plan picks a
commencement year (2026 by default), and the plan page evaluates and names
that year's rules, not a fixed one. The years differ in shape, not just
course numbers: 2024/2025's compulsory list is COMP6250, COMP6442,
COMP6710 and COMP8260 for 24 units, where 2026's is COMP6120, COMP6442,
COMP7710 and COMP8280 for 30; 2024/2025's project bucket is a mandatory
12-unit floor, where 2026's is an optional 12-unit cap of the same size;
and 2024's 8000-level-COMP overlay also counts non-COMP specialisation
courses, which 2025 and 2026 do not. `spec/program-years.test.ts` proves
the same plan reports differently depending on which year applies.

### The specialisation list is partial

The Human Centred and Creative Computing specialisation's own Programs and
Courses page was never fetched. Its member list is seeded with two courses
already in this catalogue — COMP6390 and COMP8020 — not the
specialisation's full membership. The `specialisation` bucket needs 24
units and these two supply only 12, so it stays permanently `unmet`, and
no plan built here can report the degree complete.

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
catalogue, and the scraper: all named above, all deliberate cuts rather
than things run out of time for.
