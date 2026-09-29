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

Good is that no blocked course is ever shown without its reason. A bare "not
eligible" is the failure being replaced, so every verdict names what blocks
it: which prerequisite, which session, which permission code.

Good is also failing closed. An app whose claim is that it tells the truth
must never silently pass — a course the catalogue does not know is reported
as unknown, never as fine.

`spec/` enforces the mechanics of that: the nine eligibility and progress
cases, the four HTTP behaviours, the seed's internal consistency, and that
every route renders. What `spec/` cannot enforce is judgement — which
readings of ANU's prose are honest ones, which simplifications are safe to
make, and which gaps are worth naming rather than hiding. That judgement is
recorded below.

## Two modelling decisions

**Prerequisites are temporal.** A prerequisite is satisfied only by a course
completed in a strictly earlier term — except where ANU's own prose says
"completed **or be currently studying**" (or "currently enrolled in"), which
is modelled as a `concurrent: true` flag on that requirement group and allows
the same term. This exception is load-bearing, not cosmetic: COMP6120's real
requisite is "completed or be currently studying COMP6442", and a
strictly-earlier-only model would have falsely blocked a course ANU permits.
For an app whose whole claim is that it surfaces the truth, a false block is
worse than no check at all.

**Buckets constrain rather than partition.** A course allocated to one bucket
(say, the compulsory list) does not thereby leave the others' totals alone.
Each bucket carries a minimum, and some carry a maximum; the 8000-level-COMP
requirement is an **overlay** — it counts every 8000-level COMP course across
the whole plan towards its own 24-unit minimum, independent of which bucket
that course was allocated to. A course can be "spent" by one bucket's minimum
and still count towards the overlay. This is the honest reading of the
program's structure: the degree's rules are a set of simultaneous constraints
on the same 96 units, not a partition of those units into non-overlapping
piles.

## Data provenance

The catalogue is transcribed by hand from the live ANU Programs and Courses
pages (2026) into `src/data/seed.json`, and committed there — never scraped
at runtime. The plan that shaped this build sequenced a scraper (Task 10,
`scripts/scrape-pc.ts`) as a stretch goal to widen the catalogue beyond the
hand-transcribed set; it was cut, deliberately, in favour of the eligibility
and progress engines that the spec's published lines actually grade. The
seed that ships covers the **13 courses** the program's compulsory list,
foundational list, project list, HCC specialisation and a further-computing
overlay reference — real ANU data, just not the whole catalogue.

### Three simplifications applied to the requisite prose

Turning ANU's requisite paragraphs into the structured rules the engine
checks required three simplifications. Stating them is the point — the
app's whole claim is that it does not hide things:

1. **Program-enrolment clauses are dropped.** Every plan here is a Master of
   Computing plan, so a clause like "must be enrolled in the Master of
   Computing" is satisfied by construction. Where that was the *only*
   requirement (COMP6390, COMP8280, MATH6005), the structured rule is empty.
2. **Option codes outside this catalogue are dropped** from the structured
   rule, though they stay in the full prose shown alongside it. A plan can
   only ever contain a course this catalogue knows, so an out-of-catalogue
   option could never be satisfied and would only produce a false block.
3. **Incompatibility rules are not modelled at all.** "Incompatible with
   COMP2100" is a real ANU rule this app does not check. Every course record
   still carries its full requisite prose verbatim, so a reader can see the
   incompatibility even though the engine does not enforce it.

### A known limitation: allocation does not backtrack

Progress allocation is greedy — it walks a plan's items once, in bucket
sort order, and assigns each item to the first bucket it fits. This means an
already-invalid plan can name the wrong course as the surplus. Concretely:
the project bucket caps at 12 units. A plan holding COMP8715 (6u) and
COMP8830 (12u) allocates COMP8715 first, fills 6 of the 12 units, and then
has no room for COMP8830 — so COMP8830 is reported as unallocated, even
though COMP8830 alone would have filled the cap exactly and left COMP8715 as
the true surplus. The bucket's `exceeded` status still fires correctly in
this case — the plan genuinely is over cap — only the *name* attached to the
surplus can be wrong. It never misfires on a plan that is actually valid.
This is a wart, not a silent failure, and it is named here rather than fixed
because fixing it means backtracking search, which is out of scope for this
build.

### The specialisation list is partial

The Human Centred and Creative Computing specialisation's own page on
Programs and Courses was never fetched. Its member list is seeded with two
courses — COMP6390 and COMP8020 — that are justifiable from courses already
in this catalogue, not the specialisation's full membership. Treat the
specialisation bucket as under-complete by construction.

### Programs and Courses contradicts itself, twice

Two compulsory courses have two different titles depending on which part of
the same ANU site you read, and both are recorded here rather than quietly
resolved:

- **COMP7710** is *Programming Fundamentals* on its own course page and in
  the program's Study Options table, but *Structured Programming* in the
  program's Program Requirements section. Seeded as *Programming
  Fundamentals* — the course's own page, and the majority of the sources,
  win.
- **MATH6005** is *Discrete Mathematical Models* on its own course page, but
  *Discrete Mathematics Models* in the Program Requirements section. Seeded
  as *Discrete Mathematical Models* — again, the course's own page wins.

Neither is a transcription error in this repo; both are ANU's Programs and
Courses disagreeing with itself about the name of a compulsory course. That
is exactly the kind of quiet inconsistency this app exists to replace, so it
is named rather than smoothed over.

## What was not built

- **A scraper.** Task 10 was cut in favour of the engines the spec grades;
  the seed is real but hand-transcribed, not parsed, and covers 13 courses
  rather than the full catalogue.
- **Incompatibility checking.** Named above — a real ANU rule, deliberately
  out of scope.
- **Backtracking allocation.** Named above — the greedy allocator's known
  wart.
- **A full specialisation catalogue.** Only two HCC members are seeded.
- **Anything ANU calls a "requirement" but this program doesn't actually
  need checked at runtime**, such as program-enrolment clauses — dropped as
  satisfied by construction, not overlooked.
