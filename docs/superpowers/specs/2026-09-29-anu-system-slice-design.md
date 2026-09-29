# Fine Print — C7 design

**Deliverable:** C7 · Week 8, "Build the ANU system you wish existed"
**Repo:** `comp4020-crit7-anpham-09`
**Cutoff:** Wed 30 September 2026, 13:30 (crit group Liùrú, Wed 15:30–17:00)
**Date written:** 2026-09-29

## The slice

A study planner for the **Master of Computing (7706)** that validates while you
plan instead of after you commit.

The ANU systems that produce this pain are Programs and Courses (which holds the
rules) and ISIS (which enforces them). Both know, at the moment you pick a
course, whether you are eligible for it and whether your plan will graduate you.
Neither tells you then. Two failures follow from that single withholding:

1. **Eligibility arrives too late.** You plan around a course, then discover a
   missing prerequisite, a session it isn't offered in, or a permission code you
   need to request from the College.
2. **Degree progress is invisible.** You cannot see which requirement buckets
   your plan fills, which are still owed, or how many units short you are.

These are one problem at two scopes — *can I take this course?* and *does this
plan graduate me?* — so one rules engine over one schema answers both.

## Stance

**The truth-teller.** The app surfaces what the real system has and buries:
every blocking reason named at the moment you add a course, every bucket filling
in view, permission codes flagged before you build a plan around a course.

It is a working tool, and the critique is by contrast: the data was always
there, so withholding it was a choice rather than a limitation. Nothing is
deliberately obstructed or parodied in behaviour — an app that withheld
information on purpose would risk reading as broken to a marker checking the
flow works.

Rejected alternatives: *the pessimist* (rank plan fragility — needs a dependency
graph, answers a question not asked); *the honest bureaucrat* (reproduce ISIS's
obstruction as satire — spends the risk budget on tone); *earnest planner* (no
stance — leaves the brief's provocation unanswered).

One idea is kept from the pessimist: every blocked course names **what
specifically blocks it**, which the validator computes anyway.

## Core flow

The flow that must survive a reload:

1. Land on `/` and create a plan. It gets a slug: `/plan/quiet-lyrebird`.
2. Mark completed courses against past terms.
3. Add courses into future terms.
4. Each change re-validates and re-renders: per-course verdicts, per-bucket
   progress.
5. Reload the URL — the plan is exactly as it was left.

**No accounts and no login.** The slug is the credential. This is a deliberate
cut: the deliverable models a planning tool, not an identity system.

## Data

### Provenance

Real ANU data, scraped once from Programs and Courses, curated, and committed as
`src/data/seed.json`. The app reads the committed seed at boot; it never scrapes
at runtime. `scripts/scrape-pc.ts` stays in the repo as provenance and as
evidence of how the work was grounded.

Requisites on Programs and Courses are free-form prose, not data. General prose
parsing is out of scope. For a bounded course set the prose is converted to
structured rules once, at build time, and the raw prose is retained in
`courses.requisite_note` so any conversion can be checked against its source.

### Reference tables (read-only at runtime)

| Table | Columns |
|---|---|
| `courses` | `code` (PK), `title`, `units`, `subject`, `level`, `requisite_note`, `needs_permission_code` |
| `offerings` | `course_code`, `session` (`S1`/`S2`) |
| `prereq_groups` | `id`, `course_code` — **all** groups for a course must be satisfied |
| `prereq_options` | `group_id`, `course_code` — **any** option in a group satisfies it |
| `buckets` | `program_code`, `key`, `label`, `min_units`, `max_units`, `kind` (`list`/`predicate`), `mode` (`consuming`/`overlay`), and for `predicate` buckets: `subjects` (CSV, e.g. `COMP,ENGN`; empty means any), `min_level`, `max_level` |
| `bucket_members` | `bucket_key`, `course_code` — for `list` buckets |

`courses.level` is derived once at seed time from the first digit of the numeric
part of the code (`COMP8410` → `8000`), not stored per-course by hand.

A `term` is `<year>-<session>` (`2026-S2`). The session for an offering check is
the suffix of the term, so `2027-S1` checks against an `S1` offering row. Terms
sort lexically, which is also their chronological order — this is what makes the
temporal prerequisite check a simple string comparison.

The `prereq_groups` / `prereq_options` pair encodes "X and (Y or Z)" as an AND of
ORs, which covers ANU's requisite shapes without general parsing. COMP8020 is one
group with one option: COMP6390.

### Plan tables (mutable)

| Table | Columns |
|---|---|
| `plans` | `id`, `slug` (unique), `program_code`, `specialisation_key`, `created_at` |
| `plan_items` | `id`, `plan_id`, `course_code`, `term` (e.g. `2026-S2`), `status` (`completed`/`planned`) |

### Master of Computing (7706) requirements — as seeded

Total: **96 units.**

| Key | Rule | Mode |
|---|---|---|
| `compulsory` | 30u — COMP6120, COMP6442, COMP7710 (12u), COMP8280 | consuming, list |
| `foundational` | min 6u from {MATH6005, COMP6260} | consuming, list |
| `project` | **max** 12u from {COMP8715 ×2, COMP8830} | consuming, list |
| `specialisation` | 24u from the chosen specialisation's list | consuming, list |
| `further` | 18u, COMP or ENGN, level 6000/7000/8000 | consuming, predicate |
| `elective` | 6u, any course | consuming, predicate |
| `comp8000` | **min 24u** of 8000-level COMP | **overlay** |

Seed the **Human Centred and Creative Computing** specialisation first (it is the
one COMP8020 sits in). Further specialisations are optional scope.

`plans.specialisation_key` defaults to `human-centred-and-creative-computing`
when a plan is created without a choice, so the `specialisation` bucket always
has a member list to allocate against and the engine never has to handle a null
specialisation.

## Two modelling decisions

### Prerequisites are temporal

A prerequisite is satisfied only by a plan item in an **earlier** term. This is
the real rule and the one the existing systems enforce silently — the ordering
problem is undiscoverable until you try to enrol. Making `term` part of the check
is what turns "you are missing COMP6390" into "you are missing COMP6390 **before
2026-S2**".

### Buckets constrain, they do not partition

The tempting model — every course lands in exactly one bucket, and the buckets
sum to 96 — does not hold. `foundational` is a minimum, `project` is a maximum,
and `comp8000` is a **minimum overlay** satisfied by courses that already count
toward another bucket.

So the engine:

- allocates each course to at most one **consuming** bucket, greedily, in
  specificity order: `compulsory`, `foundational`, `project`, `specialisation`,
  `further`, `elective`;
- enforces maxima and reports unmet minima;
- counts **overlay** buckets across the whole plan, independent of allocation;
- reports total units against 96.

This is the substance of the deliverable, and the choice of constraints over a
partition is the thing to be able to defend at the crit.

## Architecture

The boundary that matters: **the rules engines never touch the database or the
DOM.** They are pure functions over plain data, which makes them fast to test and
consistent with the existing `CLAUDE.md` rule that behaviour lives in `src/lib/`.

```
scripts/scrape-pc.ts  ──one-shot, by hand──▶  src/data/seed.json  (committed)
                                                       │
                                                  seeded at boot
                                                       ▼
src/lib/db.ts ──────────── SQLite (/data/app.db) ── reference + plan tables
                                                       │
                                            reads rows, passes plain data
                                                       ▼
src/lib/rules/eligibility.ts  ─┐
src/lib/rules/progress.ts     ─┴──▶  pure functions, no I/O
                                                       │
                                                       ▼
src/pages/plan/[slug].astro  ── SSR: renders verdicts + progress
src/pages/api/plan-items.ts  ── POST add / POST remove → 303 back
```

### Files

| Path | Job |
|---|---|
| `scripts/scrape-pc.ts` | Fetch Programs and Courses, write `src/data/seed.json`. Run by hand; output committed. |
| `src/data/seed.json` | The real ANU data, reviewable in a diff. |
| `src/lib/schema.ts` | Drizzle tables above. Guestbook `messages` removed. |
| `src/lib/db.ts` | Existing boot migration, plus idempotent reference seeding. |
| `src/lib/rules/eligibility.ts` | `(course, planItems, term) → Verdict`. Pure. |
| `src/lib/rules/progress.ts` | `(planItems, program) → BucketReport[]`. Pure. |
| `src/lib/plans.ts` | Plan and plan-item persistence. The only module that writes. |
| `src/pages/index.astro` | Create or resume a plan. |
| `src/pages/plan/[slug].astro` | The planner. Markup only; logic imported. |
| `src/pages/api/plan-items.ts` | Add/remove, then `303` back to the plan. |
| `src/pages/readme.astro` | Kept — `readme.test.ts` depends on it. |

**Removed with the starter** (the spec README says the guestbook plumbing retires
with it): `src/pages/api/messages.ts`, `src/pages/api/events.ts`,
`src/lib/events.ts`, `spec/guestbook.test.ts`, and the `messages` table.
`pnpm db:generate` writes the drop migration.

### Request flow

A submitted "add COMP8410 to 2027-S1" writes one row and redirects. The following
GET re-reads every item for the plan, hands them and the catalogue to the two
pure engines, and renders the result.

**No client-side state, no SSE, no fetch.** Plain form POSTs mean the app works
with JavaScript off, which keeps the axe accessibility floor and the invariants
satisfied and makes the live demo robust. Re-validating the whole plan per
request is fine at this size (tens of rows).

### Verdicts

`eligibility` returns a verdict carrying **named reasons**, never a bare boolean.
This is where the stance lives.

| Reason | Severity | Example text |
|---|---|---|
| `missing-prereq` | blocking | "COMP6390 must be completed before 2027-S1" |
| `not-offered` | blocking | "COMP8410 isn't offered in Semester 1" |
| `duplicate` | blocking | "Already in this plan" |
| `overload` | warning | "This term is 30 units — over the standard 24-unit load" |
| `permission-code` | warning | "Needs a School of Computing permission code" |

`overload` is a warning rather than a block because 24 units is the *standard*
full-time load, not a hard ceiling — overloading is permitted with approval.
Treating it as blocking would be the app inventing a rule, which is the opposite
of the stance.
| `unknown` | blocking | "Not in the catalogue" |

`progress` returns, per bucket: allocated units, the requirement, a status of
met / unmet / exceeded, and **which courses landed there**, so the allocation is
inspectable rather than a number to be trusted.

### Error handling — fail closed

For an app whose claim is that it tells the truth, a silent pass is the worst
available bug.

- A course the catalogue does not know yields an explicit `unknown` verdict,
  never `ok`.
- Missing or malformed `seed.json` **fails the boot loudly**. An app serving an
  empty catalogue looks healthy and reports every plan as fine — precisely the
  failure being critiqued.
- An unknown plan slug returns a real 404 page, not an empty plan.
- The rules engines never throw; bad input produces a reason. A 500 on a
  validation edge case during the crit is an avoidable loss.

## Deployment

Already wired by the template and requiring no new work: `fly.toml` mounts a
volume at `/data`, `DATABASE_PATH=/data/app.db`, and `src/lib/db.ts` runs
migrations at boot. Persistence across reload, restart and redeploy is a property
of the inherited platform.

`auto_stop_machines = "stop"` means the first request after idle is a cold start.
**Load the URL once before the crit session** so the demo is warm.

## Testing

### Inherited, kept green

`invariants.test.ts` (navigation landmark, exactly one `h1`, document language,
title, mobile viewport, image alt text, axe-core floor) and `readme.test.ts`
(`/readme/` serves the whole of `README.md`).

`spec/routes.ts` must be updated with the new routes. Because the invariants only
visit routes listed there, the app **seeds one demo plan with the fixed slug
`demo`** so `/plan/demo` is always walkable. Routes covered: `/`, `/plan/demo`,
`/readme/`.

The demo plan is seeded at boot only if that slug is absent, and carries a few
items including at least one blocked course — so the invariants walk a page with
real content, and a human opening the deployed URL sees the app working rather
than an empty state. It is editable like any other plan; nothing depends on its
contents staying fixed.

### `spec/rules.test.ts` — pure, no server

1. Prerequisite in an earlier term → `ok`.
2. Prerequisite in the **same** term → blocked. (The temporal rule; the case a
   naive implementation gets wrong.)
3. Prerequisite absent → reason names both the course and the term.
4. Course not offered in that session → `not-offered`.
5. Permission code surfaces as a **warning**, not a block.
6. An 8000-level COMP course consumed by the `specialisation` bucket **still**
   counts toward the `comp8000` overlay.
7. 18u of project courses → `exceeded`.
8. Zero foundational units → `unmet`.
9. A plan is **complete** when every consuming bucket's minimum is met, no
   maximum is exceeded, every overlay minimum is met, and total units ≥ 96.
   Assert all four conditions, and assert that failing any one of them reports
   incomplete.

### `spec/plan.test.ts` — HTTP against the running app

Mirrors how `guestbook.test.ts` proved persistence.

1. Create a plan → `303` to `/plan/<slug>`.
2. Add a course → a **fresh GET** still shows it. *(This is the "persists across
   a reload" spec line, asserted.)*
3. Unknown slug → `404`.
4. A blocked course **renders its reason text in the page.**

Test 4 asserts the product's promise — that the app says *why* — rather than an
implementation detail, so it should survive a rewrite of the engine.

Per `CLAUDE.md`: a test for code not yet written must hold its specifier in a
variable and `await import()` behind an `existsSync` guard, because typecheck runs
before tests in `pnpm check`.

### Published spec line → coverage

| Spec line | Covered by |
|---|---|
| loads at its `*.fly.dev` URL by the cutoff | deploy and manual verification; no local substitute |
| models a slice of a real ANU system, wired end to end | human judgement at the crit |
| the core flow persists across a reload | `spec/plan.test.ts` #2 |
| the repo shows the process | incremental commits, `PROCESS.md`, `reflections/crit-7.md`, `pnpm check:evidence` |
| you can account for how you directed, grounded and corrected the work | the crit conversation; `scripts/scrape-pc.ts` and `CLAUDE.md` are the artefacts |

## Out of scope

No authentication or accounts. No scraping at runtime. No timetable clashes or
room data. No fees. No programs other than 7706. No SSE or realtime. No plan
fragility ranking. No editing the catalogue through the UI.

Each is a defensible cut, which is worth more at a crit than a half-built version
of any of them.

## Sequence

**Deploy in the first hour, not the last.** "Loads at its `*.fly.dev` URL" is the
only spec line with no local substitute, and it fails for infrastructural reasons
that are cheap to find early.

| # | Work | Est. |
|---|---|---|
| 0 | Strip the guestbook, one plain page, **deploy and verify live** | 30m |
| 1 | `scrape-pc.ts` → `seed.json`; review the data by eye | 90m |
| 2 | Schema, migration, idempotent boot seeding | 45m |
| 3 | Rules engines, test-first | 90m |
| 4 | Pages and the add/remove API | 90m |
| 5 | `plan.test.ts`, `routes.ts`, invariants green | 45m |
| 6 | `README.md`, `PROCESS.md`, `reflections/crit-7.md` | 45m |
| 7 | Redeploy, verify live, warm the machine | 30m |

Commit at every phase and never commit a red state — already a `CLAUDE.md` rule,
and also what produces the "commits that grew with the work" the spec asks for.

### If behind

Cut in this order: further specialisations (hardcode Human Centred and Creative
Computing), then the `comp8000` overlay rule, then scrape breadth (25–30 courses
is sufficient; the catalogue does not need to be complete).

**Never cut phases 6 or 7.** Documentation and deployment are spec lines;
bucket coverage is not.

### Known risk

Phase 1 is the one that bites: scrapes run long, and 90 minutes against an
unfamiliar page structure is optimistic. If it passes two hours, stop and
hand-transcribe the seed for ~25 courses from pages already fetched. The data is
still real, only transcribed rather than parsed, and nothing downstream changes.

### Known data caveat

Programs and Courses is internally inconsistent about COMP7710: the Program
Requirements section calls it *Structured Programming* and the Study Options
table calls it *Programming Fundamentals*. Seed the Program Requirements wording
and note the discrepancy in `README.md` — a real artefact of the system being
replaced, and worth mentioning at the crit.
