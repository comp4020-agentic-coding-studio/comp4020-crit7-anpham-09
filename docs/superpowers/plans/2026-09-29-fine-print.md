# Fine Print Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Master of Computing (7706) study planner that names why each course is blocked and how the plan tracks against the degree's real requirement buckets, live at `https://comp4020-crit7-anpham-09.fly.dev/` before Wed 30 Sep 2026 13:30.

**Architecture:** Real ANU data is committed as `src/data/seed.json` and loaded into SQLite at boot; two pure functions (`eligibility`, `progress`) read plain data and never touch the database or the DOM; server-rendered Astro pages post plain HTML forms and re-render from SQLite.

**Tech Stack:** Astro 7 (`output: "server"`, Node standalone adapter), Drizzle ORM 0.45 + better-sqlite3 13, Vitest 4, Fly.io with a volume at `/data`.

**Spec:** `docs/superpowers/specs/2026-09-29-anu-system-slice-design.md`

## Global Constraints

- **Deadline: Wed 30 Sep 2026, 13:30.** Crit group Liùrú, Wed 15:30–17:00. Cutoff is two hours before the session.
- **Never commit a red state.** `pnpm check` (typecheck + tests) must pass before every commit. This is an existing `CLAUDE.md` rule.
- **Commit at the end of every task.** The published spec requires "commits that grew with the work".
- **When a check fails, read its output before changing anything.** Existing `CLAUDE.md` rule.
- **Behaviour lives in `src/lib/`, markup lives in the page.** Existing `CLAUDE.md` rule. `.astro` files own structure only.
- **A test for code not yet written must `await import()` behind an `existsSync` guard**, holding the specifier in a variable — `pnpm check` typechecks before it tests, so a static import of an unwritten module is a `ts(2307)` that stops the whole roster. Existing `CLAUDE.md` rule.
- **`astro check`, not `tsc`.** Existing `CLAUDE.md` rule.
- **Commit `pnpm-lock.yaml` when dependencies change.** CI installs frozen.
- **`.astro/` is generated and gitignored.** Never edit or commit it.
- **Astro eats whitespace between a text node and a following element** — write `is{" "}` before a link. Existing `CLAUDE.md` rule.
- **Add every new page to `spec/routes.ts`** or the invariants silently stop covering it.
- **No new runtime dependencies.** Everything below uses what `package.json` already ships.
- **Colour only ever comes from a custom property.** No literal hex in a rule body; dark mode is one `prefers-color-scheme` block redefining the tokens. Existing `CLAUDE.md` rule.
- **Judge colour separation in OKLab**, not RGB or hue angle. Existing `CLAUDE.md` rule.
- **Every transition and animation needs a `prefers-reduced-motion` escape.** Existing `CLAUDE.md` rule.
- **No `100vh`** — mobile Safari's address bar makes it lie. Use `dvh` with a fallback. Existing `CLAUDE.md` rule.
- **Interactive targets are at least 44x44px** (WCAG 2.5.5), counting the whole hit area. Existing `CLAUDE.md` rule.
- **No web font.** Existing `CLAUDE.md` rule.
- **Never tell a reviewer what not to flag.** Existing `CLAUDE.md` rule, and it cost this repo a missed finding in C5.
- **Program modelled: Master of Computing, code `7706`, 96 units.**
- **Never invent ANU data.** Every course title, unit value, session and requisite must come from a fetched Programs and Courses page. If a page was not fetched, do not guess the value — fetch it.

## Deviations from the spec

The spec sequenced the scrape (phase 1) before everything downstream, and named it the highest-risk phase. **This plan inverts that:** Task 2 hand-transcribes a verified seed from pages already fetched, which unblocks Tasks 3–7 immediately, and Task 10 adds the scraper to widen the catalogue. Same end state — real data, committed seed, a scrape script in the repo as provenance — with the deadline risk moved off the critical path. If Task 10 is cut, the data is still real, only transcribed rather than parsed; say so in `README.md`.

## File structure

| Path | Responsibility | Task |
|---|---|---|
| `src/lib/seed-types.ts` | Seed shapes + `levelOf` / `sessionOf` helpers. No I/O. | 2 |
| `src/data/seed.json` | The real ANU data, reviewable in a diff. | 2 |
| `src/lib/schema.ts` | Drizzle tables. Ground truth for the database. | 3 |
| `src/lib/db.ts` | Connection, boot migration, idempotent reference seeding. | 3 |
| `src/lib/catalogue.ts` | Reads reference tables back into the pure shapes. | 3 |
| `src/lib/rules/eligibility.ts` | `evaluateItem` → `Verdict`. Pure. | 4 |
| `src/lib/rules/progress.ts` | `evaluateProgress` → `ProgressReport`. Pure. | 5 |
| `src/lib/plans.ts` | Plan + plan-item persistence. The only module that writes. | 6 |
| `src/pages/index.astro` | Create or resume a plan. | 1, 6 |
| `src/pages/plan/[slug].astro` | The planner. Markup only. | 7 |
| `src/pages/api/plans.ts` | Create a plan → 303. | 6 |
| `src/pages/api/plan-items.ts` | Add / remove an item → 303. | 7 |
| `scripts/scrape-pc.ts` | Widen `seed.json` from Programs and Courses. | 10 |
| `spec/seed.test.ts` | The committed seed is internally consistent. | 2 |
| `spec/rules.test.ts` | The nine engine cases from the spec. | 4, 5 |
| `spec/plan.test.ts` | The four HTTP cases from the spec. | 7 |

---

## Task 0: Unblock the deploy

**This blocks Task 1 and cannot be worked around.** `mise.local.toml` is absent, so there is no `FLY_API_TOKEN`. `flyctl` v0.4.77 is installed and `origin` is set correctly.

**Files:**
- Create: `mise.local.toml` (gitignored — confirm with `git check-ignore mise.local.toml`)

- [ ] **Step 1: Find the Fly token the course sent you**

It was issued with the repo. Check the course email or Canvas. If it is genuinely lost, ask on the course forum immediately — this is the long pole and everything else is wasted without it.

- [ ] **Step 2: Write it**

```toml
[env]
FLY_API_TOKEN = "<the token the course sent you>"
```

- [ ] **Step 3: Verify it is gitignored and that Fly accepts it**

```bash
git check-ignore mise.local.toml && echo "ignored — good"
flyctl status -a comp4020-crit7-anpham-09
```

Expected: the app's machine and volume are listed. A 401 means the token is wrong. **Do not commit this file.**

---

## Task 1: Strip the starter, deploy a walking skeleton

Bank a green URL while it is cheap. This is the only spec line with no local substitute.

**Files:**
- Delete: `src/pages/api/messages.ts`, `src/pages/api/events.ts`, `src/lib/events.ts`, `spec/guestbook.test.ts`
- Modify: `src/lib/schema.ts`, `src/lib/db.ts`, `src/pages/index.astro`, `src/pages/readme.astro`, `README.md`
- Create: `drizzle/0001_*.sql` (generated)

**Interfaces:**
- Produces: `db` (a Drizzle instance) exported from `src/lib/db.ts`.

- [ ] **Step 1: Delete the guestbook plumbing**

```bash
git rm src/pages/api/messages.ts src/pages/api/events.ts src/lib/events.ts spec/guestbook.test.ts
```

- [ ] **Step 2: Empty the schema**

Replace the whole of `src/lib/schema.ts`:

```ts
// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts).
//
// Empty for one commit: the starter's guestbook is gone and Fine Print's
// tables arrive in Task 3.
export {};
```

- [ ] **Step 3: Reduce `src/lib/db.ts` to the connection and the migration**

Replace the whole file:

```ts
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly.
migrate(db, { migrationsFolder: "./drizzle" });
```

- [ ] **Step 4: Generate the drop migration**

```bash
pnpm db:generate
```

Expected: a new file under `drizzle/` dropping `messages`, plus an updated `drizzle/meta/_journal.json`.

- [ ] **Step 5: Replace the home page**

Replace the whole of `src/pages/index.astro`:

```astro
---
import "../styles.css";
---

<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Fine Print — ANU study planning that tells you now</title>
  </head>
  <body>
    <nav aria-label="site">
      <a href="/">Plan</a>
      <a href="/readme/">About</a>
    </nav>
    <main>
      <h1>Fine Print</h1>
      <p>
        A Master of Computing planner that tells you why a course is blocked
        while you are choosing it, not after you have built a plan around it.
      </p>
    </main>
  </body>
</html>
```

- [ ] **Step 6: Fix the nav label in `src/pages/readme.astro`**

Change the first nav link's text from `Guestbook` to `Plan` so the two pages agree. Leave everything else in that file alone — `readme.test.ts` depends on it.

- [ ] **Step 7: Replace `README.md` with a real first draft**

`readme.test.ts` asserts `/readme/` serves the whole of this file, so it must have real content, not the template comment.

```markdown
# Fine Print

A Master of Computing (7706) study planner that validates while you plan,
instead of after you commit.

ANU's Programs and Courses holds every rule about what you may enrol in, and
ISIS enforces them. Both know, at the moment you pick a course, whether you
are eligible and whether your plan will graduate you. Neither tells you then.
Fine Print is that same data, surfaced at the moment it is useful.

## What good looks like here

Good is that no blocked course is ever shown without its reason. A bare "not
eligible" is the failure being replaced, so every verdict names what blocks
it: which prerequisite, which session, which permission code.

Good is also failing closed. An app whose claim is that it tells the truth
must never silently pass — a course the catalogue does not know is reported
as unknown, never as fine.

This README is a first draft and is rewritten in Task 8.
```

- [ ] **Step 8: Run the checks**

```bash
pnpm check
```

Expected: PASS. The invariants walk `/` and `/readme/`, which both still exist; `readme.test.ts` finds the new README served whole.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "strip: retire the starter guestbook, leave a walking skeleton

The spec README says the guestbook plumbing retires with the starter. The
messages table, its API routes and the SSE bus are gone; what is left is the
connection, the boot migration, and two pages that satisfy the invariants."
```

- [ ] **Step 10: Deploy and verify live**

```bash
flyctl deploy --remote-only --ha=false -a comp4020-crit7-anpham-09
curl -sS -o /dev/null -w '%{http_code}\n' https://comp4020-crit7-anpham-09.fly.dev/
```

Expected: `200`. **Do not continue until this prints 200.** If it does not, read the deploy output — `flyctl logs -a comp4020-crit7-anpham-09` shows boot failures, and a migration error at boot is the likeliest cause.

---

## Task 2: Seed shapes and a verified seed

Hand-transcribed from Programs and Courses. Real data, no scraping on the critical path.

**Files:**
- Create: `src/lib/seed-types.ts`, `src/data/seed.json`, `spec/seed.test.ts`

**Interfaces:**
- Produces: types `Session`, `SeedCourse`, `SeedBucket`, `SeedSpecialisation`, `Seed`; functions `levelOf(code: string): number` and `sessionOf(term: string): Session`.

- [ ] **Step 1: Write the types and helpers**

Create `src/lib/seed-types.ts`:

```ts
// The shapes of the committed reference data. No I/O: these are the plain
// structures the rules engines consume, whether they came from seed.json or
// from a read of the database.

export type Session = "S1" | "S2";

/** One requirement. `options` is an OR — any of them satisfies the group.
 *  `concurrent` true means the prerequisite may sit in the SAME term
 *  ("completed or currently studying"); false means strictly earlier. */
export interface PrereqGroup {
  options: string[];
  concurrent: boolean;
}

export interface SeedCourse {
  code: string;
  title: string;
  units: number;
  subject: string;
  /** The requisite prose, verbatim from Programs and Courses, kept so any
   *  structured conversion can be checked against its source. */
  requisiteNote: string;
  needsPermissionCode: boolean;
  sessions: Session[];
  /** An AND of ORs: every group must be satisfied. */
  prereqs: PrereqGroup[];
}

export type BucketKind = "list" | "predicate";
export type BucketMode = "consuming" | "overlay";

export interface SeedBucket {
  key: string;
  label: string;
  /** Units required. A bucket below this is `unmet`. */
  minUnits: number;
  /** Allocation ceiling. Non-exclusive buckets overflow past it into the
   *  next bucket; exclusive buckets report `exceeded` instead. */
  capUnits: number;
  kind: BucketKind;
  mode: BucketMode;
  /** When true, a member of this bucket can be allocated nowhere else. */
  exclusive: boolean;
  /** `list` buckets only. The `specialisation` bucket is the exception: its
   *  members come from the plan's chosen specialisation at evaluation time,
   *  so this stays empty. */
  members: string[];
  /** `predicate` buckets only. Empty means any subject. */
  subjects: string[];
  minLevel: number | null;
  maxLevel: number | null;
  /** Allocation order. Lower runs first; most specific first. */
  sortOrder: number;
}

export interface SeedSpecialisation {
  key: string;
  label: string;
  members: string[];
}

export interface Seed {
  program: { code: string; label: string; totalUnits: number };
  courses: SeedCourse[];
  buckets: SeedBucket[];
  specialisations: SeedSpecialisation[];
}

/** COMP8410 -> 8000. Derived from the code so no one hand-types a level. */
export function levelOf(code: string): number {
  const digits = /\d+/.exec(code)?.[0];
  if (!digits) return 0;
  return Number(digits[0]) * 1000;
}

/** "2027-S1" -> "S1". Terms are `<year>-<session>` and sort lexically, which
 *  is also their chronological order — that is what lets the temporal
 *  prerequisite check be a plain string comparison. */
export function sessionOf(term: string): Session {
  return term.endsWith("S1") ? "S1" : "S2";
}
```

- [ ] **Step 2: Write the failing seed test**

Create `spec/seed.test.ts`. It guards the one thing that silently ruins everything downstream — a seed that references a course it does not contain.

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SEED = "../src/data/seed.json";
const TYPES = "../src/lib/seed-types";

describe("the committed seed", () => {
  it("is internally consistent", async () => {
    const seedUrl = new URL(SEED, import.meta.url);
    expect(existsSync(seedUrl)).toBe(true);
    // Read and parse rather than `await import()`: Node 24 requires an
    // import attribute for JSON modules, which a dynamic specifier held in
    // a variable cannot carry.
    const seed = JSON.parse(readFileSync(seedUrl, "utf8"));
    const { levelOf } = await import(TYPES);

    const codes = new Set(seed.courses.map((c: { code: string }) => c.code));

    // Every referenced code exists as a course.
    const referenced: string[] = [
      ...seed.courses.flatMap((c: { prereqs: { options: string[] }[] }) =>
        c.prereqs.flatMap((g) => g.options),
      ),
      ...seed.buckets.flatMap((b: { members: string[] }) => b.members),
      ...seed.specialisations.flatMap((s: { members: string[] }) => s.members),
    ];
    for (const code of referenced) {
      expect(codes, `${code} is referenced but not in courses`).toContain(code);
    }

    // No duplicate course codes.
    expect(codes.size).toBe(seed.courses.length);

    // Every course has a real unit value, a subject, and at least one session.
    for (const course of seed.courses) {
      expect(course.units, course.code).toBeGreaterThan(0);
      expect(course.subject, course.code).toMatch(/^[A-Z]{4}$/);
      expect(course.sessions.length, course.code).toBeGreaterThan(0);
      expect(levelOf(course.code), course.code).toBeGreaterThanOrEqual(1000);
    }

    // The consuming buckets' required units reach the program total.
    const consuming = seed.buckets.filter(
      (b: { mode: string }) => b.mode === "consuming",
    );
    const required = consuming.reduce(
      (n: number, b: { minUnits: number }) => n + b.minUnits,
      0,
    );
    expect(required).toBeLessThanOrEqual(seed.program.totalUnits);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
pnpm test -- spec/seed.test.ts
```

Expected: FAIL — `src/data/seed.json` does not exist.

- [ ] **Step 4: Use the verified data — do not re-fetch**

**Every course's title, unit value, sessions, permission-code flag, verbatim
requisite prose and structured `prereqs` have already been fetched from the
live 2026 pages and checked. They are in:**

`.superpowers/sdd/2026-09-29-fine-print/verified-course-data.md`

Read that file and transcribe its 13 courses into `seed.json` exactly as given.
It also records the three simplification rules applied when turning requisite
prose into structure, and two places where Programs and Courses contradicts
itself — all five facts belong in `README.md` at Task 8.

Only if a value there looks wrong should you re-fetch the page it came from.
The original URLs, for reference:

```
https://programsandcourses.anu.edu.au/2026/course/comp6120
https://programsandcourses.anu.edu.au/2026/course/comp6260
https://programsandcourses.anu.edu.au/2026/course/comp6390
https://programsandcourses.anu.edu.au/2026/course/comp6442
https://programsandcourses.anu.edu.au/2026/course/comp7710
https://programsandcourses.anu.edu.au/2026/course/comp8280
https://programsandcourses.anu.edu.au/2026/course/comp8410
https://programsandcourses.anu.edu.au/2026/course/comp8715
https://programsandcourses.anu.edu.au/2026/course/comp8830
https://programsandcourses.anu.edu.au/2026/course/math6005
https://programsandcourses.anu.edu.au/2026/specialisation/HCCC-SPEC
```

If `HCCC-SPEC` 404s, find the Human Centred and Creative Computing specialisation from the links on `https://programsandcourses.anu.edu.au/2026/program/7706XMCOMP`.

The extraction recipe, per page:

| Field | Where on the page |
|---|---|
| `title` | the `h1` |
| `units` | the "Unit Value" line in the sidebar |
| `subject` | the first four letters of the code |
| `sessions` | the "Offered in" line, and the Offerings table — `First Semester` → `S1`, `Second Semester` → `S2` |
| `requisiteNote` | the whole of "Requisite and Incompatibility", verbatim |
| `needsPermissionCode` | true when that section mentions a permission code |
| `prereqs` | the course codes in that prose, as an AND of ORs |

- [ ] **Step 5: Write the seed**

Create `src/data/seed.json`. **COMP8020 below is fully verified** — its page was read and every field is transcribed from it. Use it as the worked example for the rest; fill the other courses from Step 4's fetches with the same rigour.

```json
{
  "program": {
    "code": "7706",
    "label": "Master of Computing",
    "totalUnits": 96
  },
  "courses": [
    {
      "code": "COMP8020",
      "title": "Advanced Topics in Human-Centred and Creative Computing",
      "units": 6,
      "subject": "COMP",
      "requisiteNote": "To enrol in this course, you must have completed COMP6390. Additional Prerequisite courses for the Advanced Topic will be listed on the SoCo website when the course topic is announced. Students who meet the prerequisites can request a permission code from the College.",
      "needsPermissionCode": true,
      "sessions": ["S2"],
      "prereqs": [{ "options": ["COMP6390"], "concurrent": false }]
    }
  ],
  "buckets": [
    {
      "key": "compulsory",
      "label": "Compulsory courses",
      "minUnits": 30,
      "capUnits": 30,
      "kind": "list",
      "mode": "consuming",
      "exclusive": true,
      "members": ["COMP6120", "COMP6442", "COMP7710", "COMP8280"],
      "subjects": [],
      "minLevel": null,
      "maxLevel": null,
      "sortOrder": 1
    },
    {
      "key": "foundational",
      "label": "Foundational courses",
      "minUnits": 6,
      "capUnits": 6,
      "kind": "list",
      "mode": "consuming",
      "exclusive": false,
      "members": ["MATH6005", "COMP6260"],
      "subjects": [],
      "minLevel": null,
      "maxLevel": null,
      "sortOrder": 2
    },
    {
      "key": "project",
      "label": "Project courses",
      "minUnits": 0,
      "capUnits": 12,
      "kind": "list",
      "mode": "consuming",
      "exclusive": true,
      "members": ["COMP8715", "COMP8830"],
      "subjects": [],
      "minLevel": null,
      "maxLevel": null,
      "sortOrder": 3
    },
    {
      "key": "specialisation",
      "label": "Specialisation",
      "minUnits": 24,
      "capUnits": 24,
      "kind": "list",
      "mode": "consuming",
      "exclusive": false,
      "members": [],
      "subjects": [],
      "minLevel": null,
      "maxLevel": null,
      "sortOrder": 4
    },
    {
      "key": "further",
      "label": "Further computing and engineering",
      "minUnits": 18,
      "capUnits": 18,
      "kind": "predicate",
      "mode": "consuming",
      "exclusive": false,
      "members": [],
      "subjects": ["COMP", "ENGN"],
      "minLevel": 6000,
      "maxLevel": 8000,
      "sortOrder": 5
    },
    {
      "key": "elective",
      "label": "Electives",
      "minUnits": 6,
      "capUnits": 18,
      "kind": "predicate",
      "mode": "consuming",
      "exclusive": false,
      "members": [],
      "subjects": [],
      "minLevel": null,
      "maxLevel": null,
      "sortOrder": 6
    },
    {
      "key": "comp8000",
      "label": "8000-level COMP",
      "minUnits": 24,
      "capUnits": 96,
      "kind": "predicate",
      "mode": "overlay",
      "exclusive": false,
      "members": [],
      "subjects": ["COMP"],
      "minLevel": 8000,
      "maxLevel": 8000,
      "sortOrder": 7
    }
  ],
  "specialisations": [
    {
      "key": "human-centred-and-creative-computing",
      "label": "Human Centred and Creative Computing",
      "members": ["COMP8020"]
    }
  ]
}
```

Two notes on the buckets above, both deliberate and both worth being able to defend:

- `elective` has `capUnits` 18 against `minUnits` 6. The program's listed minima total 84 of 96 units; the remaining 12 are free choice, and the elective bucket is where they land.
- `project` has `minUnits` 0 because the program states it as a maximum, not a requirement. It is `exclusive` so that a plan carrying 18 units of project courses reports `exceeded` rather than quietly spilling the surplus into `further`, which would accept them on subject and level.

- [ ] **Step 6: Run the test to verify it passes**

```bash
pnpm test -- spec/seed.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/seed-types.ts src/data/seed.json spec/seed.test.ts
git commit -m "seed: real Master of Computing reference data

Transcribed from Programs and Courses: courses with their unit values,
sessions and requisites, and the program's seven requirement buckets. The
requisite prose is kept verbatim alongside the structured prereqs so the
conversion can be checked against its source.

Buckets carry an allocation cap separately from their required minimum,
because the program's rules constrain rather than partition: foundational is
a floor, project is a ceiling, and the 8000-level COMP rule is an overlay
satisfied by courses that already count elsewhere."
```

---

## Task 3: Schema, migration, boot seeding, catalogue reads

**Files:**
- Modify: `src/lib/schema.ts`, `src/lib/db.ts`
- Create: `src/lib/catalogue.ts`, `drizzle/0002_*.sql` (generated)

**Interfaces:**
- Consumes: `Seed`, `SeedCourse`, `SeedBucket`, `SeedSpecialisation`, `levelOf` from `src/lib/seed-types.ts` (Task 2).
- Produces: tables `courses`, `offerings`, `prereqGroups`, `prereqOptions`, `buckets`, `bucketMembers`, `specialisations`, `specialisationMembers`, `seedMeta`, `plans`, `planItems`; and from `src/lib/catalogue.ts`: `loadCatalogue(): Map<string, SeedCourse>`, `loadBuckets(): SeedBucket[]`, `loadSpecialisation(key: string): SeedSpecialisation | undefined`, `PROGRAM_TOTAL_UNITS: number`.

- [ ] **Step 1: Write the schema**

Replace the whole of `src/lib/schema.ts`:

```ts
import { sql } from "drizzle-orm";
import { int, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate`, and commit both this file and the migration.
//
// Two halves. The reference tables are real ANU data, replaced wholesale from
// src/data/seed.json whenever that file changes. The plan tables are the
// user's, and seeding never touches them.

export const courses = sqliteTable("courses", {
  code: text().primaryKey(),
  title: text().notNull(),
  units: int().notNull(),
  subject: text().notNull(),
  level: int().notNull(),
  requisiteNote: text("requisite_note").notNull().default(""),
  needsPermissionCode: int("needs_permission_code", { mode: "boolean" })
    .notNull()
    .default(false),
});

export const offerings = sqliteTable(
  "offerings",
  {
    courseCode: text("course_code").notNull(),
    session: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.courseCode, t.session] })],
);

export const prereqGroups = sqliteTable("prereq_groups", {
  id: int().primaryKey({ autoIncrement: true }),
  courseCode: text("course_code").notNull(),
  /** True when the prerequisite may be taken in the same term. */
  concurrent: int({ mode: "boolean" }).notNull().default(false),
});

export const prereqOptions = sqliteTable("prereq_options", {
  id: int().primaryKey({ autoIncrement: true }),
  groupId: int("group_id").notNull(),
  courseCode: text("course_code").notNull(),
});

export const buckets = sqliteTable("buckets", {
  key: text().primaryKey(),
  programCode: text("program_code").notNull(),
  label: text().notNull(),
  minUnits: int("min_units").notNull(),
  capUnits: int("cap_units").notNull(),
  kind: text().notNull(),
  mode: text().notNull(),
  exclusive: int({ mode: "boolean" }).notNull().default(false),
  subjects: text().notNull().default(""),
  minLevel: int("min_level"),
  maxLevel: int("max_level"),
  sortOrder: int("sort_order").notNull(),
});

export const bucketMembers = sqliteTable(
  "bucket_members",
  {
    bucketKey: text("bucket_key").notNull(),
    courseCode: text("course_code").notNull(),
  },
  (t) => [primaryKey({ columns: [t.bucketKey, t.courseCode] })],
);

export const specialisations = sqliteTable("specialisations", {
  key: text().primaryKey(),
  label: text().notNull(),
});

export const specialisationMembers = sqliteTable(
  "specialisation_members",
  {
    specialisationKey: text("specialisation_key").notNull(),
    courseCode: text("course_code").notNull(),
  },
  (t) => [primaryKey({ columns: [t.specialisationKey, t.courseCode] })],
);

// One row. Holds a hash of the seed so boot seeding is idempotent: same
// hash, skip; different hash, replace every reference row in one transaction.
export const seedMeta = sqliteTable("seed_meta", {
  id: int().primaryKey(),
  hash: text().notNull(),
});

export const plans = sqliteTable("plans", {
  id: int().primaryKey({ autoIncrement: true }),
  slug: text().notNull().unique(),
  programCode: text("program_code").notNull(),
  specialisationKey: text("specialisation_key").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const planItems = sqliteTable("plan_items", {
  id: int().primaryKey({ autoIncrement: true }),
  planId: int("plan_id").notNull(),
  courseCode: text("course_code").notNull(),
  /** `<year>-<session>`, e.g. 2026-S2. Sorts lexically into chronological order. */
  term: text().notNull(),
  /** "completed" | "planned" */
  status: text().notNull(),
});
```

- [ ] **Step 2: Generate the migration**

```bash
pnpm db:generate
```

Expected: a new file under `drizzle/` creating all eleven tables.

- [ ] **Step 3: Add idempotent seeding to `src/lib/db.ts`**

Keep everything already in the file. **Put the `import` lines at the top of the file, above the existing ones** — ES imports hoist, but `astro check` and every future reader expect them there — and append the rest below the existing code.

If `astro check` rejects the JSON import attribute, the fallback is `JSON.parse(readFileSync(new URL("../data/seed.json", import.meta.url), "utf8"))`. Prefer the import: it is what gets the seed bundled into `dist/`, which the Docker image needs.

```ts
import { createHash } from "node:crypto";
import seedData from "../data/seed.json" with { type: "json" };
import { levelOf, type Seed } from "./seed-types";
import {
  bucketMembers,
  buckets,
  courses,
  offerings,
  prereqGroups,
  prereqOptions,
  seedMeta,
  specialisationMembers,
  specialisations,
} from "./schema";

const seed = seedData as Seed;

// Fail closed. An app that serves an empty catalogue looks healthy and
// reports every plan as fine, which is exactly the failure being critiqued.
if (!seed.courses?.length || !seed.buckets?.length) {
  throw new Error("src/data/seed.json is missing or empty — refusing to boot");
}

function seedReferenceData(): void {
  const hash = createHash("sha256")
    .update(JSON.stringify(seed))
    .digest("hex");
  const current = db.select().from(seedMeta).get();
  if (current?.hash === hash) return;

  db.transaction((tx) => {
    // Reference data only. Plans are never touched.
    tx.delete(prereqOptions).run();
    tx.delete(prereqGroups).run();
    tx.delete(offerings).run();
    tx.delete(bucketMembers).run();
    tx.delete(buckets).run();
    tx.delete(specialisationMembers).run();
    tx.delete(specialisations).run();
    tx.delete(courses).run();

    for (const course of seed.courses) {
      tx.insert(courses)
        .values({
          code: course.code,
          title: course.title,
          units: course.units,
          subject: course.subject,
          level: levelOf(course.code),
          requisiteNote: course.requisiteNote,
          needsPermissionCode: course.needsPermissionCode,
        })
        .run();
      for (const session of course.sessions) {
        tx.insert(offerings)
          .values({ courseCode: course.code, session })
          .run();
      }
      for (const group of course.prereqs) {
        const row = tx
          .insert(prereqGroups)
          .values({ courseCode: course.code, concurrent: group.concurrent })
          .returning()
          .get();
        for (const option of group.options) {
          tx.insert(prereqOptions)
            .values({ groupId: row.id, courseCode: option })
            .run();
        }
      }
    }

    for (const bucket of seed.buckets) {
      tx.insert(buckets)
        .values({
          key: bucket.key,
          programCode: seed.program.code,
          label: bucket.label,
          minUnits: bucket.minUnits,
          capUnits: bucket.capUnits,
          kind: bucket.kind,
          mode: bucket.mode,
          exclusive: bucket.exclusive,
          subjects: bucket.subjects.join(","),
          minLevel: bucket.minLevel,
          maxLevel: bucket.maxLevel,
          sortOrder: bucket.sortOrder,
        })
        .run();
      for (const code of bucket.members) {
        tx.insert(bucketMembers)
          .values({ bucketKey: bucket.key, courseCode: code })
          .run();
      }
    }

    for (const spec of seed.specialisations) {
      tx.insert(specialisations)
        .values({ key: spec.key, label: spec.label })
        .run();
      for (const code of spec.members) {
        tx.insert(specialisationMembers)
          .values({ specialisationKey: spec.key, courseCode: code })
          .run();
      }
    }

    tx.delete(seedMeta).run();
    tx.insert(seedMeta).values({ id: 1, hash }).run();
  });
}

seedReferenceData();

export const PROGRAM_CODE = seed.program.code;
export const PROGRAM_LABEL = seed.program.label;
export const PROGRAM_TOTAL_UNITS = seed.program.totalUnits;
export const DEFAULT_SPECIALISATION = "human-centred-and-creative-computing";
```

- [ ] **Step 4: Write the catalogue reader**

Create `src/lib/catalogue.ts`:

```ts
import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  bucketMembers,
  buckets,
  courses,
  offerings,
  prereqGroups,
  prereqOptions,
  specialisationMembers,
  specialisations,
} from "./schema";
import type {
  PrereqGroup,
  SeedBucket,
  SeedCourse,
  SeedSpecialisation,
  Session,
} from "./seed-types";

// Reads the reference tables back into the plain shapes the rules engines
// consume. This is the only place that knows both the database and those
// shapes — the engines themselves stay free of I/O.

export function loadCatalogue(): Map<string, SeedCourse> {
  const sessionsByCourse = new Map<string, Session[]>();
  for (const row of db.select().from(offerings).all()) {
    const list = sessionsByCourse.get(row.courseCode) ?? [];
    list.push(row.session as Session);
    sessionsByCourse.set(row.courseCode, list);
  }

  const optionsByGroup = new Map<number, string[]>();
  for (const row of db.select().from(prereqOptions).all()) {
    const list = optionsByGroup.get(row.groupId) ?? [];
    list.push(row.courseCode);
    optionsByGroup.set(row.groupId, list);
  }

  const groupsByCourse = new Map<string, PrereqGroup[]>();
  for (const row of db.select().from(prereqGroups).all()) {
    const list = groupsByCourse.get(row.courseCode) ?? [];
    list.push({
      options: optionsByGroup.get(row.id) ?? [],
      concurrent: row.concurrent,
    });
    groupsByCourse.set(row.courseCode, list);
  }

  const out = new Map<string, SeedCourse>();
  for (const row of db.select().from(courses).all()) {
    out.set(row.code, {
      code: row.code,
      title: row.title,
      units: row.units,
      subject: row.subject,
      requisiteNote: row.requisiteNote,
      needsPermissionCode: row.needsPermissionCode,
      sessions: sessionsByCourse.get(row.code) ?? [],
      prereqs: groupsByCourse.get(row.code) ?? [],
    });
  }
  return out;
}

export function loadBuckets(): SeedBucket[] {
  const membersByBucket = new Map<string, string[]>();
  for (const row of db.select().from(bucketMembers).all()) {
    const list = membersByBucket.get(row.bucketKey) ?? [];
    list.push(row.courseCode);
    membersByBucket.set(row.bucketKey, list);
  }

  return db
    .select()
    .from(buckets)
    .all()
    .map((row) => ({
      key: row.key,
      label: row.label,
      minUnits: row.minUnits,
      capUnits: row.capUnits,
      kind: row.kind as SeedBucket["kind"],
      mode: row.mode as SeedBucket["mode"],
      exclusive: row.exclusive,
      members: membersByBucket.get(row.key) ?? [],
      subjects: row.subjects ? row.subjects.split(",") : [],
      minLevel: row.minLevel,
      maxLevel: row.maxLevel,
      sortOrder: row.sortOrder,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function loadSpecialisation(
  key: string,
): SeedSpecialisation | undefined {
  const row = db
    .select()
    .from(specialisations)
    .where(eq(specialisations.key, key))
    .get();
  if (!row) return undefined;
  const members = db
    .select()
    .from(specialisationMembers)
    .where(eq(specialisationMembers.specialisationKey, key))
    .all()
    .map((m) => m.courseCode);
  return { key: row.key, label: row.label, members };
}
```

- [ ] **Step 5: Run the checks**

```bash
pnpm check
```

Expected: PASS. The build boots the server, which runs the migration and the seeding; a throw here means the seed is malformed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "db: reference schema, boot seeding, catalogue reads

Eleven tables: eight for the real ANU reference data, one for the seed hash,
two for plans. Seeding is idempotent on a hash of seed.json — same hash and
it skips, different hash and every reference row is replaced in one
transaction. Plans are never touched by it.

The app refuses to boot on an empty seed. Serving an empty catalogue would
look healthy while reporting every plan as fine, which is the exact failure
this app exists to criticise."
```

---

## Task 4: The eligibility engine

**Files:**
- Create: `src/lib/rules/eligibility.ts`, `spec/rules.test.ts`

**Interfaces:**
- Consumes: `SeedCourse`, `sessionOf` from `src/lib/seed-types.ts` (Task 2).
- Produces: types `PlanItem { courseCode: string; term: string; status: "completed" | "planned" }`, `ReasonKind`, `Severity`, `Reason { kind; severity; text }`, `Verdict { code; term; ok; reasons }`; functions `evaluateItem(item: PlanItem, catalogue: Map<string, SeedCourse>, all: PlanItem[]): Verdict` and `evaluatePlan(items: PlanItem[], catalogue: Map<string, SeedCourse>): Verdict[]`; constant `STANDARD_LOAD: number`.

**Decision this task locks in:** only `planned` items are evaluated. A `completed` item is history — it still satisfies prerequisites and still counts toward progress, but it is not itself checked for eligibility.

- [ ] **Step 1: Write the failing tests**

Create `spec/rules.test.ts` with the eligibility half (the progress half is appended in Task 5):

```ts
import { existsSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import type { SeedCourse } from "../src/lib/seed-types";

const ELIGIBILITY = "../src/lib/rules/eligibility";

// A small hand-built catalogue: the engine is pure, so the tests do not need
// the real seed and are not coupled to its contents.
function course(code: string, over: Partial<SeedCourse> = {}): SeedCourse {
  return {
    code,
    title: code,
    units: 6,
    subject: code.slice(0, 4),
    requisiteNote: "",
    needsPermissionCode: false,
    sessions: ["S1", "S2"],
    prereqs: [],
    ...over,
  };
}

const CATALOGUE = new Map<string, SeedCourse>(
  [
    course("COMP6390"),
    course("COMP8020", {
      sessions: ["S2"],
      prereqs: [{ options: ["COMP6390"], concurrent: false }],
    }),
    course("COMP6120", {
      prereqs: [{ options: ["COMP6442"], concurrent: true }],
    }),
    course("COMP6442"),
    course("COMP8410", { sessions: ["S2"] }),
    course("COMP8600", { needsPermissionCode: true }),
  ].map((c) => [c.code, c]),
);

// Resolved dynamically below, so the type cannot be known statically.
let evaluateItem: (...args: any[]) => any;

beforeAll(async () => {
  expect(existsSync(new URL(`${ELIGIBILITY}.ts`, import.meta.url))).toBe(true);
  ({ evaluateItem } = await import(ELIGIBILITY));
});

const planned = (courseCode: string, term: string) =>
  ({ courseCode, term, status: "planned" }) as const;
const done = (courseCode: string, term: string) =>
  ({ courseCode, term, status: "completed" }) as const;

describe("eligibility", () => {
  it("passes a prerequisite completed in an earlier term", () => {
    const items = [done("COMP6390", "2026-S1"), planned("COMP8020", "2026-S2")];
    const verdict = evaluateItem(items[1], CATALOGUE, items);
    expect(verdict.reasons.filter((r: { kind: string }) => r.kind === "missing-prereq")).toHaveLength(0);
  });

  it("blocks a prerequisite sitting in the same term", () => {
    const items = [planned("COMP6390", "2026-S2"), planned("COMP8020", "2026-S2")];
    const verdict = evaluateItem(items[1], CATALOGUE, items);
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons.map((r: { kind: string }) => r.kind)).toContain("missing-prereq");
  });

  it("names both the missing course and the term", () => {
    const items = [planned("COMP8020", "2026-S2")];
    const verdict = evaluateItem(items[0], CATALOGUE, items);
    const reason = verdict.reasons.find((r: { kind: string }) => r.kind === "missing-prereq");
    expect(reason.text).toContain("COMP6390");
    expect(reason.text).toContain("2026-S2");
  });

  it("blocks a course not offered in that session", () => {
    const items = [planned("COMP8410", "2027-S1")];
    const verdict = evaluateItem(items[0], CATALOGUE, items);
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons.map((r: { kind: string }) => r.kind)).toContain("not-offered");
  });

  it("treats a permission code as a warning, not a block", () => {
    const items = [planned("COMP8600", "2026-S2")];
    const verdict = evaluateItem(items[0], CATALOGUE, items);
    const reason = verdict.reasons.find((r: { kind: string }) => r.kind === "permission-code");
    expect(reason.severity).toBe("warning");
    expect(verdict.ok).toBe(true);
  });

  it("reports an unknown course as unknown, never as fine", () => {
    const items = [planned("COMP9999", "2026-S2")];
    const verdict = evaluateItem(items[0], CATALOGUE, items);
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons.map((r: { kind: string }) => r.kind)).toContain("unknown");
  });

  it("warns on a term over the standard 24-unit load", () => {
    const items = [
      planned("COMP6390", "2026-S2"),
      planned("COMP8410", "2026-S2"),
      planned("COMP8600", "2026-S2"),
      planned("COMP8020", "2026-S2"),
      planned("COMP8020", "2026-S2"),
    ];
    const verdict = evaluateItem(items[0], CATALOGUE, items);
    const reason = verdict.reasons.find((r: { kind: string }) => r.kind === "overload");
    expect(reason.severity).toBe("warning");
  });

  it("allows a concurrent prerequisite in the same term", () => {
    // COMP6120's real requisite reads "completed or be currently studying
    // COMP6442", so the same term must satisfy it. Blocking here would be
    // the app inventing a stricter rule than ANU's.
    const items = [planned("COMP6442", "2026-S2"), planned("COMP6120", "2026-S2")];
    const verdict = evaluateItem(items[1], CATALOGUE, items);
    expect(verdict.reasons.filter((r: { kind: string }) => r.kind === "missing-prereq")).toHaveLength(0);
  });

  it("still blocks a concurrent prerequisite that is in a later term", () => {
    const items = [planned("COMP6442", "2027-S1"), planned("COMP6120", "2026-S2")];
    const verdict = evaluateItem(items[1], CATALOGUE, items);
    expect(verdict.reasons.map((r: { kind: string }) => r.kind)).toContain("missing-prereq");
  });

  it("blocks a duplicate", () => {
    const items = [planned("COMP8410", "2026-S2"), planned("COMP8410", "2027-S2")];
    const verdict = evaluateItem(items[0], CATALOGUE, items);
    expect(verdict.reasons.map((r: { kind: string }) => r.kind)).toContain("duplicate");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test -- spec/rules.test.ts
```

Expected: FAIL — the `existsSync` assertion fails because `src/lib/rules/eligibility.ts` does not exist.

- [ ] **Step 3: Implement**

Create `src/lib/rules/eligibility.ts`:

```ts
import { type SeedCourse, sessionOf } from "../seed-types";

// Pure. No database, no DOM. Given one plan item, the catalogue, and every
// item in the plan, say whether it holds up and — this is the product —
// exactly what is wrong when it does not.

export interface PlanItem {
  courseCode: string;
  term: string;
  status: "completed" | "planned";
}

export type ReasonKind =
  | "missing-prereq"
  | "not-offered"
  | "duplicate"
  | "overload"
  | "permission-code"
  | "unknown";

export type Severity = "blocking" | "warning";

export interface Reason {
  kind: ReasonKind;
  severity: Severity;
  text: string;
}

export interface Verdict {
  code: string;
  term: string;
  ok: boolean;
  reasons: Reason[];
}

/** The standard full-time load. Not a ceiling — overloading is permitted
 *  with approval — so exceeding it warns rather than blocks. */
export const STANDARD_LOAD = 24;

export function evaluateItem(
  item: PlanItem,
  catalogue: Map<string, SeedCourse>,
  all: PlanItem[],
): Verdict {
  const reasons: Reason[] = [];
  const course = catalogue.get(item.courseCode);

  // Fail closed: an unrecognised code is never quietly fine.
  if (!course) {
    return {
      code: item.courseCode,
      term: item.term,
      ok: false,
      reasons: [
        {
          kind: "unknown",
          severity: "blocking",
          text: `${item.courseCode} isn't in the catalogue, so nothing about it can be checked.`,
        },
      ],
    };
  }

  if (all.filter((i) => i.courseCode === item.courseCode).length > 1) {
    reasons.push({
      kind: "duplicate",
      severity: "blocking",
      text: `${course.code} appears more than once in this plan.`,
    });
  }

  const session = sessionOf(item.term);
  if (!course.sessions.includes(session)) {
    const offered = course.sessions.length
      ? course.sessions.map((s) => (s === "S1" ? "Semester 1" : "Semester 2")).join(" and ")
      : "no semester on record";
    reasons.push({
      kind: "not-offered",
      severity: "blocking",
      text: `${course.code} isn't offered in ${session === "S1" ? "Semester 1" : "Semester 2"} — it runs in ${offered}.`,
    });
  }

  // Temporal: a prerequisite counts only from a strictly earlier term.
  // Terms are `<year>-<session>`, so lexical order is chronological order.
  for (const group of course.prereqs) {
    const satisfied = all.some(
      (other) =>
        group.options.includes(other.courseCode) &&
        (group.concurrent ? other.term <= item.term : other.term < item.term),
    );
    if (!satisfied) {
      const options = group.options.join(" or ");
      const when = group.concurrent
        ? `by ${item.term} — it may be taken alongside`
        : `before ${item.term}`;
      reasons.push({
        kind: "missing-prereq",
        severity: "blocking",
        text: `${options} must be completed ${when}.`,
      });
    }
  }

  if (course.needsPermissionCode) {
    reasons.push({
      kind: "permission-code",
      severity: "warning",
      text: `${course.code} needs a School of Computing permission code — request it before the enrolment window.`,
    });
  }

  const termUnits = all
    .filter((i) => i.term === item.term)
    .reduce((n, i) => n + (catalogue.get(i.courseCode)?.units ?? 0), 0);
  if (termUnits > STANDARD_LOAD) {
    reasons.push({
      kind: "overload",
      severity: "warning",
      text: `${item.term} is ${termUnits} units — over the standard ${STANDARD_LOAD}-unit load, which needs approval.`,
    });
  }

  return {
    code: course.code,
    term: item.term,
    ok: !reasons.some((r) => r.severity === "blocking"),
    reasons,
  };
}

/** Every planned item's verdict. Completed items are history: they satisfy
 *  prerequisites and count toward progress, but are not themselves checked. */
export function evaluatePlan(
  items: PlanItem[],
  catalogue: Map<string, SeedCourse>,
): Verdict[] {
  return items
    .filter((i) => i.status === "planned")
    .map((i) => evaluateItem(i, catalogue, items));
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test -- spec/rules.test.ts
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rules/eligibility.ts spec/rules.test.ts
git commit -m "rules: eligibility, with named reasons

A verdict carries reasons, never a bare boolean — a bare 'not eligible' is
the failure this app replaces. Prerequisites are temporal: satisfied only by
an item in a strictly earlier term, which is the rule the real system
enforces silently.

Permission codes and overload warn rather than block. 24 units is the
standard load, not a ceiling, and blocking it would be the app inventing a
rule it does not have."
```

---

## Task 5: The progress engine

**Files:**
- Create: `src/lib/rules/progress.ts`
- Modify: `spec/rules.test.ts`

**Interfaces:**
- Consumes: `SeedBucket`, `SeedCourse`, `levelOf` from `src/lib/seed-types.ts` (Task 2); `PlanItem` from `src/lib/rules/eligibility.ts` (Task 4).
- Produces: types `BucketReport { key; label; requiredUnits; capUnits; allocatedUnits; courses; status; mode }`, `ProgressReport { buckets; totalUnits; requiredTotal; unallocated; complete }`; function `evaluateProgress(items: PlanItem[], catalogue: Map<string, SeedCourse>, buckets: SeedBucket[], specialisationMembers: string[], totalUnits: number): ProgressReport`.

- [ ] **Step 1: Append the failing tests to `spec/rules.test.ts`**

Add these imports at the top of the existing file, alongside the others:

```ts
import type { SeedBucket } from "../src/lib/seed-types";
```

Then append the following. A second `beforeAll` in the same file is fine — Vitest runs both, and keeping them separate means Task 5 does not have to edit Task 4's block:

```ts
const PROGRESS = "../src/lib/rules/progress";

// Resolved dynamically below, so the type cannot be known statically.
let evaluateProgress: (...args: any[]) => any;

beforeAll(async () => {
  expect(existsSync(new URL(`${PROGRESS}.ts`, import.meta.url))).toBe(true);
  ({ evaluateProgress } = await import(PROGRESS));
});

function bucket(over: Partial<SeedBucket> & { key: string }): SeedBucket {
  return {
    label: over.key,
    minUnits: 0,
    capUnits: 96,
    kind: "list",
    mode: "consuming",
    exclusive: false,
    members: [],
    subjects: [],
    minLevel: null,
    maxLevel: null,
    sortOrder: 1,
    ...over,
  };
}

describe("progress", () => {
  it("counts an 8000-level COMP course toward the overlay even when the specialisation consumed it", () => {
    const buckets = [
      bucket({ key: "specialisation", minUnits: 24, capUnits: 24, sortOrder: 1 }),
      bucket({
        key: "comp8000",
        minUnits: 24,
        mode: "overlay",
        kind: "predicate",
        subjects: ["COMP"],
        minLevel: 8000,
        maxLevel: 8000,
        sortOrder: 2,
      }),
    ];
    const items = [planned("COMP8020", "2026-S2")];
    const report = evaluateProgress(items, CATALOGUE, buckets, ["COMP8020"], 96);

    const spec = report.buckets.find((b: { key: string }) => b.key === "specialisation");
    const overlay = report.buckets.find((b: { key: string }) => b.key === "comp8000");
    expect(spec.allocatedUnits).toBe(6);
    expect(overlay.allocatedUnits).toBe(6);
  });

  it("reports an exclusive bucket over its cap as exceeded", () => {
    const buckets = [
      bucket({
        key: "project",
        minUnits: 0,
        capUnits: 12,
        exclusive: true,
        members: ["COMP6390", "COMP8410", "COMP8600"],
      }),
    ];
    const items = [
      planned("COMP6390", "2026-S1"),
      planned("COMP8410", "2026-S2"),
      planned("COMP8600", "2027-S1"),
    ];
    const report = evaluateProgress(items, CATALOGUE, buckets, [], 96);
    const project = report.buckets.find((b: { key: string }) => b.key === "project");
    expect(project.allocatedUnits).toBe(12);
    expect(project.status).toBe("exceeded");
    expect(report.unallocated).toContain("COMP8600");
  });

  it("reports an unfilled minimum as unmet", () => {
    const buckets = [bucket({ key: "foundational", minUnits: 6, capUnits: 6, members: ["COMP6390"] })];
    const report = evaluateProgress([], CATALOGUE, buckets, [], 96);
    expect(report.buckets[0].status).toBe("unmet");
  });

  it("overflows a non-exclusive bucket into the next one", () => {
    const buckets = [
      bucket({ key: "foundational", minUnits: 6, capUnits: 6, members: ["COMP6390", "COMP8410"], sortOrder: 1 }),
      bucket({ key: "elective", minUnits: 6, capUnits: 18, kind: "predicate", sortOrder: 2 }),
    ];
    const items = [planned("COMP6390", "2026-S1"), planned("COMP8410", "2026-S2")];
    const report = evaluateProgress(items, CATALOGUE, buckets, [], 96);
    expect(report.buckets.find((b: { key: string }) => b.key === "foundational").allocatedUnits).toBe(6);
    expect(report.buckets.find((b: { key: string }) => b.key === "elective").allocatedUnits).toBe(6);
  });

  it("is complete only when every minimum is met, nothing is exceeded, and the total is reached", () => {
    const buckets = [bucket({ key: "elective", minUnits: 12, capUnits: 12, kind: "predicate" })];
    const items = [planned("COMP6390", "2026-S1"), planned("COMP8410", "2026-S2")];

    const short = evaluateProgress(items, CATALOGUE, buckets, [], 96);
    expect(short.complete).toBe(false);
    expect(short.totalUnits).toBe(12);

    const reached = evaluateProgress(items, CATALOGUE, buckets, [], 12);
    expect(reached.complete).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test -- spec/rules.test.ts
```

Expected: FAIL — `src/lib/rules/progress.ts` does not exist.

- [ ] **Step 3: Implement**

Create `src/lib/rules/progress.ts`:

```ts
import { levelOf, type SeedBucket, type SeedCourse } from "../seed-types";
import type { PlanItem } from "./eligibility";

// Pure. The program's rules constrain rather than partition: `foundational`
// is a floor, `project` is a ceiling, and the 8000-level COMP rule is an
// overlay satisfied by courses that already count somewhere else. So
// consuming buckets allocate greedily in specificity order, overlays are
// counted independently across the whole plan, and anything nothing will
// take is reported rather than dropped.

export interface BucketReport {
  key: string;
  label: string;
  requiredUnits: number;
  capUnits: number;
  allocatedUnits: number;
  courses: string[];
  status: "met" | "unmet" | "exceeded";
  mode: SeedBucket["mode"];
}

export interface ProgressReport {
  buckets: BucketReport[];
  totalUnits: number;
  requiredTotal: number;
  /** Courses no bucket would take — usually an exclusive bucket over cap. */
  unallocated: string[];
  complete: boolean;
}

function accepts(
  bucket: SeedBucket,
  course: SeedCourse,
  specialisationMembers: string[],
): boolean {
  if (bucket.kind === "list") {
    const members =
      bucket.key === "specialisation" ? specialisationMembers : bucket.members;
    return members.includes(course.code);
  }
  if (bucket.subjects.length && !bucket.subjects.includes(course.subject)) {
    return false;
  }
  const level = levelOf(course.code);
  if (bucket.minLevel !== null && level < bucket.minLevel) return false;
  if (bucket.maxLevel !== null && level > bucket.maxLevel) return false;
  return true;
}

export function evaluateProgress(
  items: PlanItem[],
  catalogue: Map<string, SeedCourse>,
  buckets: SeedBucket[],
  specialisationMembers: string[],
  totalUnits: number,
): ProgressReport {
  const consuming = buckets
    .filter((b) => b.mode === "consuming")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const overlays = buckets.filter((b) => b.mode === "overlay");

  const allocated = new Map<string, string[]>();
  const units = new Map<string, number>();
  for (const bucket of buckets) {
    allocated.set(bucket.key, []);
    units.set(bucket.key, 0);
  }

  const exceeded = new Set<string>();
  const unallocated: string[] = [];
  let totalAllocatedUnits = 0;

  // Both completed and planned items count toward progress.
  for (const item of items) {
    const course = catalogue.get(item.courseCode);
    if (!course) continue;
    totalAllocatedUnits += course.units;

    // A member of an exclusive bucket can be allocated nowhere else, so a
    // surplus is a rule violation rather than something that spills onward.
    const exclusiveHome = consuming.find(
      (b) => b.exclusive && accepts(b, course, specialisationMembers),
    );
    const candidates = exclusiveHome ? [exclusiveHome] : consuming;

    let placed = false;
    for (const bucket of candidates) {
      if (!accepts(bucket, course, specialisationMembers)) continue;
      if ((units.get(bucket.key) ?? 0) + course.units > bucket.capUnits) {
        if (bucket.exclusive) exceeded.add(bucket.key);
        continue;
      }
      units.set(bucket.key, (units.get(bucket.key) ?? 0) + course.units);
      allocated.get(bucket.key)?.push(course.code);
      placed = true;
      break;
    }
    if (!placed) unallocated.push(course.code);
  }

  // Overlays see the whole plan, regardless of where a course was allocated.
  for (const overlay of overlays) {
    for (const item of items) {
      const course = catalogue.get(item.courseCode);
      if (!course) continue;
      if (!accepts(overlay, course, specialisationMembers)) continue;
      units.set(overlay.key, (units.get(overlay.key) ?? 0) + course.units);
      allocated.get(overlay.key)?.push(course.code);
    }
  }

  const reports: BucketReport[] = buckets.map((bucket) => {
    const allocatedUnits = units.get(bucket.key) ?? 0;
    const status: BucketReport["status"] = exceeded.has(bucket.key)
      ? "exceeded"
      : allocatedUnits >= bucket.minUnits
        ? "met"
        : "unmet";
    return {
      key: bucket.key,
      label: bucket.label,
      requiredUnits: bucket.minUnits,
      capUnits: bucket.capUnits,
      allocatedUnits,
      courses: allocated.get(bucket.key) ?? [],
      status,
      mode: bucket.mode,
    };
  });

  return {
    buckets: reports,
    totalUnits: totalAllocatedUnits,
    requiredTotal: totalUnits,
    unallocated,
    complete:
      reports.every((r) => r.status === "met") &&
      totalAllocatedUnits >= totalUnits,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test -- spec/rules.test.ts
```

Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rules/progress.ts spec/rules.test.ts
git commit -m "rules: degree progress by constraint, not partition

Consuming buckets allocate greedily in specificity order and overflow when
they are not exclusive; exclusive buckets over cap report exceeded and the
surplus is listed as unallocated rather than silently spilling into a bucket
that would accept it on subject and level.

Overlays are counted across the whole plan independently of allocation,
which is what the program's minimum-24-units-of-8000-level-COMP rule
actually means."
```

---

## Task 6: Plans — persistence, create, resume

**Files:**
- Create: `src/lib/plans.ts`, `src/pages/api/plans.ts`
- Modify: `src/pages/index.astro`, `src/lib/db.ts`

**Interfaces:**
- Consumes: `db`, `PROGRAM_CODE`, `DEFAULT_SPECIALISATION` from `src/lib/db.ts` (Tasks 1, 3); `plans`, `planItems` from `src/lib/schema.ts` (Task 3); `PlanItem` from `src/lib/rules/eligibility.ts` (Task 4).
- Produces: `createPlan(specialisationKey?: string): string` (returns the slug), `findPlan(slug: string): { id: number; slug: string; specialisationKey: string } | undefined`, `listItems(planId: number): PlanItem[]`, `listItemRows(planId: number): { id: number; planId: number; courseCode: string; term: string; status: string }[]`, `addItem(planId: number, courseCode: string, term: string, status: "completed" | "planned"): void`, `removeItem(planId: number, itemId: number): void`, `ensureDemoPlan(): void`, `bootstrapDemoPlan(): Promise<void>` (from `db.ts`), `DEMO_SLUG`.

- [ ] **Step 1: Write the plans module**

Create `src/lib/plans.ts`:

```ts
import { and, eq } from "drizzle-orm";
import { DEFAULT_SPECIALISATION, db, PROGRAM_CODE } from "./db";
import type { PlanItem } from "./rules/eligibility";
import { planItems, plans } from "./schema";

// The only module that writes. Everything else reads.

export const DEMO_SLUG = "demo";

// Readable slugs, because the slug is the credential — a plan URL is the
// only way back into a plan, so it has to survive being typed off a screen.
const ADJECTIVES = ["quiet", "bright", "steady", "amber", "wandering", "patient"];
const NOUNS = ["lyrebird", "wattle", "currawong", "brindabella", "kurrajong", "rosella"];

function makeSlug(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `${a}-${n}-${suffix}`;
}

export function createPlan(specialisationKey?: string): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = makeSlug();
    if (findPlan(slug)) continue;
    db.insert(plans)
      .values({
        slug,
        programCode: PROGRAM_CODE,
        specialisationKey: specialisationKey ?? DEFAULT_SPECIALISATION,
      })
      .run();
    return slug;
  }
  throw new Error("could not allocate a unique plan slug");
}

export function findPlan(slug: string) {
  return db.select().from(plans).where(eq(plans.slug, slug)).get();
}

export function listItems(planId: number): PlanItem[] {
  return db
    .select()
    .from(planItems)
    .where(eq(planItems.planId, planId))
    .all()
    .map((row) => ({
      courseCode: row.courseCode,
      term: row.term,
      status: row.status as PlanItem["status"],
    }));
}

export function listItemRows(planId: number) {
  return db.select().from(planItems).where(eq(planItems.planId, planId)).all();
}

export function addItem(
  planId: number,
  courseCode: string,
  term: string,
  status: "completed" | "planned",
): void {
  db.insert(planItems).values({ planId, courseCode, term, status }).run();
}

export function removeItem(planId: number, itemId: number): void {
  db.delete(planItems)
    .where(and(eq(planItems.planId, planId), eq(planItems.id, itemId)))
    .run();
}

// The invariants only visit routes listed in spec/routes.ts, so one plan has
// to exist at a fixed slug for /plan/demo to be walkable. It also means the
// deployed URL greets a visitor with the app working rather than an empty
// state. Seeded only when absent; editable like any other plan.
export function ensureDemoPlan(): void {
  if (findPlan(DEMO_SLUG)) return;
  db.insert(plans)
    .values({
      slug: DEMO_SLUG,
      programCode: PROGRAM_CODE,
      specialisationKey: DEFAULT_SPECIALISATION,
    })
    .run();
  const plan = findPlan(DEMO_SLUG);
  if (!plan) return;
  // One completed course and one blocked course, so the page has real
  // content and the truth-teller behaviour is visible without typing.
  addItem(plan.id, "COMP6120", "2026-S1", "completed");
  addItem(plan.id, "COMP8020", "2026-S2", "planned");
}
```

**Note on the demo plan's items:** `COMP6120` and `COMP8020` must both exist in `seed.json`. `COMP8020` is blocked there because its prerequisite `COMP6390` is absent from the plan — that is deliberate, and it is what Task 7's fourth HTTP test asserts against.

- [ ] **Step 2: Call `ensureDemoPlan` at boot**

Append to `src/lib/db.ts`, after the `seedReferenceData()` call. Import it lazily inside a function to avoid a circular import, since `plans.ts` imports from `db.ts`:

```ts
// Deferred: plans.ts imports from this module, so the call cannot sit at the
// top level of the import graph.
export async function bootstrapDemoPlan(): Promise<void> {
  const { ensureDemoPlan } = await import("./plans");
  ensureDemoPlan();
}
```

Then call it from `src/pages/index.astro`'s frontmatter (Step 4 below), which runs on every request and is cheap because `ensureDemoPlan` returns immediately once the plan exists.

- [ ] **Step 3: Write the create endpoint**

Create `src/pages/api/plans.ts`:

```ts
import type { APIRoute } from "astro";
import { createPlan } from "../../lib/plans";

// A plain HTML form POSTs here and is redirected to the new plan. The 303 is
// what makes this work with no client-side JavaScript at all.
export const POST: APIRoute = async ({ redirect }) => {
  const slug = createPlan();
  return redirect(`/plan/${slug}`, 303);
};
```

- [ ] **Step 4: Rewrite the home page**

Replace the whole of `src/pages/index.astro`:

```astro
---
import { bootstrapDemoPlan, PROGRAM_LABEL } from "../lib/db";
import { DEMO_SLUG } from "../lib/plans";
import "../styles.css";

await bootstrapDemoPlan();
---

<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Fine Print — ANU study planning that tells you now</title>
  </head>
  <body>
    <nav aria-label="site">
      <a href="/">Plan</a>
      <a href={`/plan/${DEMO_SLUG}`}>Example</a>
      <a href="/readme/">About</a>
    </nav>
    <main>
      <h1>Fine Print</h1>
      <p>
        Programs and Courses knows whether you may enrol in a course. ISIS
        knows whether your plan will graduate you. Both tell you after you
        have decided. This is the same data, at the moment it is useful.
      </p>
      <p>
        Plans are for the {PROGRAM_LABEL}. There is no login: the plan's
        address is the only way back into it, so keep the link.
      </p>
      <form method="post" action="/api/plans">
        <button>Start a plan</button>
      </form>
      <p>
        Or open the{" "}
        <a href={`/plan/${DEMO_SLUG}`}>example plan</a> to see what a blocked
        course looks like.
      </p>
    </main>
  </body>
</html>
```

- [ ] **Step 5: Run the checks**

```bash
pnpm check
```

Expected: PASS. `/plan/demo` does not exist as a route yet, so do not add it to `spec/routes.ts` until Task 7 — the invariants would 404 on it.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "plans: create, resume, and a seeded example

No accounts: the slug is the credential, so slugs are readable enough to be
typed off a screen. A demo plan is seeded at a fixed slug so the invariants
have a plan page to walk and the deployed URL shows the app working rather
than an empty state."
```

---

## Task 7: The plan page, the item API, and the HTTP spec

**Files:**
- Create: `src/pages/plan/[slug].astro`, `src/pages/api/plan-items.ts`, `spec/plan.test.ts`
- Modify: `spec/routes.ts`, `src/styles.css`

**Interfaces:**
- Consumes: `findPlan`, `listItems`, `listItemRows`, `addItem`, `removeItem`, `DEMO_SLUG` from `src/lib/plans.ts` (Task 6); `loadCatalogue`, `loadBuckets`, `loadSpecialisation` from `src/lib/catalogue.ts` (Task 3); `evaluatePlan` from `src/lib/rules/eligibility.ts` (Task 4); `evaluateProgress` from `src/lib/rules/progress.ts` (Task 5); `PROGRAM_TOTAL_UNITS` from `src/lib/db.ts` (Task 3).

- [ ] **Step 1: Write the failing HTTP tests**

Create `spec/plan.test.ts`:

```ts
import { describe, expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");

// Drives the running app over HTTP, the same way the starter's guestbook
// test proved its plumbing. Test 2 is the published spec line "the core flow
// persists across a reload"; test 4 is the app's actual promise — that a
// blocked course says why.

async function createPlan(): Promise<string> {
  const res = await fetch(`${baseUrl}/api/plans`, {
    method: "POST",
    redirect: "manual",
  });
  expect(res.status).toBe(303);
  const location = res.headers.get("location");
  expect(location).toMatch(/^\/plan\//);
  return location as string;
}

describe("a plan", () => {
  it("is created and redirected to", async () => {
    const path = await createPlan();
    const page = await fetch(`${baseUrl}${path}`);
    expect(page.status).toBe(200);
  });

  it("survives a reload", async () => {
    const path = await createPlan();

    const form = new URLSearchParams({
      plan: path.replace("/plan/", ""),
      course: "COMP8410",
      term: "2027-S2",
      status: "planned",
      action: "add",
    });
    const post = await fetch(`${baseUrl}/api/plan-items`, {
      method: "POST",
      body: form,
      redirect: "manual",
    });
    expect(post.status).toBe(303);

    // A completely fresh request: nothing carried over from the POST.
    const reloaded = await fetch(`${baseUrl}${path}`);
    expect(await reloaded.text()).toContain("COMP8410");
  });

  it("404s on an unknown slug", async () => {
    const res = await fetch(`${baseUrl}/plan/no-such-plan-here`);
    expect(res.status).toBe(404);
  });

  it("says why a course is blocked", async () => {
    // The demo plan carries COMP8020 without its prerequisite COMP6390.
    const res = await fetch(`${baseUrl}/plan/demo`);
    const html = await res.text();
    expect(html).toContain("COMP6390");
    expect(html).toMatch(/must be completed before/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test -- spec/plan.test.ts
```

Expected: FAIL — `/api/plans` exists but `/plan/<slug>` and `/api/plan-items` do not.

- [ ] **Step 3: Write the item endpoint**

Create `src/pages/api/plan-items.ts`:

```ts
import type { APIRoute } from "astro";
import { addItem, findPlan, removeItem } from "../../lib/plans";

// Add or remove one item, then redirect back to the plan. The GET that
// follows re-reads every item and re-renders — no client-side state.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const slug = String(form.get("plan") ?? "");
  const plan = findPlan(slug);
  if (!plan) return new Response("No such plan", { status: 404 });

  const action = String(form.get("action") ?? "add");

  if (action === "remove") {
    const itemId = Number(form.get("item"));
    if (Number.isInteger(itemId)) removeItem(plan.id, itemId);
    return redirect(`/plan/${slug}`, 303);
  }

  const course = String(form.get("course") ?? "").trim().toUpperCase();
  const term = String(form.get("term") ?? "").trim();
  const status = form.get("status") === "completed" ? "completed" : "planned";

  // Shape only. Whether the course exists is the catalogue's business, and
  // an unrecognised code is reported on the page as `unknown` rather than
  // rejected here — the app's job is to say what is wrong, not to refuse.
  if (/^[A-Z]{4}\d{4}$/.test(course) && /^\d{4}-S[12]$/.test(term)) {
    addItem(plan.id, course, term, status);
  }
  return redirect(`/plan/${slug}`, 303);
};
```

- [ ] **Step 4: Write the plan page**

Create `src/pages/plan/[slug].astro`:

```astro
---
import { PROGRAM_LABEL, PROGRAM_TOTAL_UNITS } from "../../lib/db";
import { loadBuckets, loadCatalogue, loadSpecialisation } from "../../lib/catalogue";
import { findPlan, listItemRows, listItems } from "../../lib/plans";
import { evaluatePlan } from "../../lib/rules/eligibility";
import { evaluateProgress } from "../../lib/rules/progress";
import "../../styles.css";

const { slug } = Astro.params;
const plan = slug ? findPlan(slug) : undefined;
if (!plan) {
  return new Response("No such plan", { status: 404 });
}

const catalogue = loadCatalogue();
const buckets = loadBuckets();
const specialisation = loadSpecialisation(plan.specialisationKey);

const rows = listItemRows(plan.id);
const items = listItems(plan.id);
const verdicts = new Map(
  evaluatePlan(items, catalogue).map((v) => [`${v.code}@${v.term}`, v]),
);
const progress = evaluateProgress(
  items,
  catalogue,
  buckets,
  specialisation?.members ?? [],
  PROGRAM_TOTAL_UNITS,
);

const terms = [...new Set(rows.map((r) => r.term))].sort();
---

<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{`Plan ${plan.slug} — Fine Print`}</title>
  </head>
  <body>
    <nav aria-label="site">
      <a href="/">Plan</a>
      <a href="/readme/">About</a>
    </nav>
    <main>
      <h1>{`Plan ${plan.slug}`}</h1>
      <p>
        {PROGRAM_LABEL}, {specialisation?.label ?? "no specialisation"}. This
        page is the only way back in, so keep the address.
      </p>

      <section aria-labelledby="courses">
        <h2 id="courses">Courses</h2>
        {terms.length === 0 && <p>Nothing planned yet. Add a course below.</p>}
        {
          terms.map((term) => (
            <article>
              <h3>{term}</h3>
              <ul>
                {rows
                  .filter((row) => row.term === term)
                  .map((row) => {
                    const verdict = verdicts.get(`${row.courseCode}@${row.term}`);
                    const course = catalogue.get(row.courseCode);
                    return (
                      <li>
                        <strong>{row.courseCode}</strong>{" "}
                        {course?.title ?? "not in the catalogue"}
                        {row.status === "completed" && <span> — completed</span>}
                        {verdict && verdict.reasons.length > 0 && (
                          <ul>
                            {verdict.reasons.map((reason) => (
                              <li data-severity={reason.severity}>
                                {reason.severity === "blocking" ? "Blocked: " : "Note: "}
                                {reason.text}
                              </li>
                            ))}
                          </ul>
                        )}
                        <form method="post" action="/api/plan-items">
                          <input type="hidden" name="plan" value={plan.slug} />
                          <input type="hidden" name="item" value={row.id} />
                          <input type="hidden" name="action" value="remove" />
                          <button>Remove {row.courseCode}</button>
                        </form>
                      </li>
                    );
                  })}
              </ul>
            </article>
          ))
        }
      </section>

      <section aria-labelledby="add">
        <h2 id="add">Add a course</h2>
        <form method="post" action="/api/plan-items">
          <input type="hidden" name="plan" value={plan.slug} />
          <label for="course">Course code</label>
          <input id="course" name="course" required pattern="[A-Za-z]{4}[0-9]{4}" placeholder="COMP8410" />
          <label for="term">Term</label>
          <input id="term" name="term" required pattern="[0-9]{4}-S[12]" placeholder="2027-S1" />
          <label for="status">Status</label>
          <select id="status" name="status">
            <option value="planned">Planned</option>
            <option value="completed">Already completed</option>
          </select>
          <button>Add</button>
        </form>
      </section>

      <section aria-labelledby="progress">
        <h2 id="progress">Degree progress</h2>
        <p>
          {progress.totalUnits} of {progress.requiredTotal} units.
          {progress.complete ? " This plan completes the degree." : " Not yet complete."}
        </p>
        <table>
          <caption>Requirement buckets, and which courses landed in each</caption>
          <thead>
            <tr>
              <th scope="col">Requirement</th>
              <th scope="col">Units</th>
              <th scope="col">Status</th>
              <th scope="col">Courses</th>
            </tr>
          </thead>
          <tbody>
            {
              progress.buckets.map((bucket) => (
                <tr>
                  <th scope="row">
                    {bucket.label}
                    {bucket.mode === "overlay" && <span> (counted across the plan)</span>}
                  </th>
                  <td>{bucket.allocatedUnits} / {bucket.requiredUnits}</td>
                  <td data-status={bucket.status}>{bucket.status}</td>
                  <td>{bucket.courses.join(", ") || "—"}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
        {
          progress.unallocated.length > 0 && (
            <p>
              Counting toward nothing: {progress.unallocated.join(", ")}. A
              requirement that caps its units will not absorb the surplus.
            </p>
          )
        }
      </section>
    </main>
  </body>
</html>
```

- [ ] **Step 5: Add the routes**

Replace the whole of `spec/routes.ts`:

```ts
// The routes the invariants run against. When you add a page, add its route
// here, or the invariants stop covering it.
export const ROUTES = ["/", "/plan/demo", "/readme/"];
```

- [ ] **Step 6: Add enough CSS to read the verdicts**

Append to `src/styles.css`:

**`CLAUDE.md` forbids a literal hex in a rule body — colour only ever comes
from a custom property, and dark mode is one `prefers-color-scheme` block
redefining the tokens.** Follow the token names already in `src/styles.css` if
it defines any; otherwise add these to its `:root`.

```css
:root {
  --colour-blocking: oklch(0.52 0.19 25);
  --colour-warning: oklch(0.55 0.12 75);
  --colour-rule: oklch(0.87 0 0);
}

@media (prefers-color-scheme: dark) {
  :root {
    --colour-blocking: oklch(0.72 0.16 25);
    --colour-warning: oklch(0.78 0.11 75);
    --colour-rule: oklch(0.35 0 0);
  }
}

/* Severity is carried in the markup, not in colour alone: each reason is
   prefixed with "Blocked:" or "Note:" in the text, so the distinction
   survives greyscale and a screen reader. Colour is reinforcement. */
[data-severity="blocking"] {
  border-left: 3px solid var(--colour-blocking);
  padding-left: 0.6rem;
}
[data-severity="warning"] {
  border-left: 3px solid var(--colour-warning);
  padding-left: 0.6rem;
}
[data-status="unmet"],
[data-status="exceeded"] {
  font-weight: 600;
}
table {
  border-collapse: collapse;
  width: 100%;
}
th,
td {
  border-bottom: 1px solid var(--colour-rule);
  padding: 0.4rem 0.5rem;
  text-align: left;
  vertical-align: top;
}
```

The remove buttons must clear a 44x44px hit area (WCAG 2.5.5, and a
`CLAUDE.md` rule). If the default button box is smaller, grow it with
padding or an absolutely positioned `::after`.

- [ ] **Step 7: Run everything**

```bash
pnpm check
```

Expected: PASS. If the axe floor complains, read the rule it names — a table without a caption or a form control without a label are the two likely ones, and both are already handled above.

- [ ] **Step 8: Commit and deploy**

```bash
git add -A
git commit -m "plan: the page, the item API, and the HTTP spec

Plain form POSTs and a 303 back: no client-side state, so the app works with
JavaScript off and the whole plan revalidates from SQLite on every request.

The fourth HTTP test asserts the product's promise rather than its wiring —
that a blocked course renders the reason it is blocked. It should survive a
rewrite of the engine behind it."

flyctl deploy --remote-only --ha=false -a comp4020-crit7-anpham-09
curl -sS -o /dev/null -w '%{http_code}\n' https://comp4020-crit7-anpham-09.fly.dev/plan/demo
```

Expected: `200`.

---

## Task 8: The documents the spec asks for

Three of the five published spec lines are documentation. This task is not optional and must not be cut.

**Files:**
- Modify: `README.md`, `PROCESS.md`, `CLAUDE.md`
- Create: `reflections/crit-7.md`

- [ ] **Step 1: Check what the evidence script wants**

```bash
cat scripts/check-evidence.ts
pnpm check:evidence
```

Read its output and satisfy what it asks for. It is the course's own check on process evidence.

- [ ] **Step 2: Rewrite `README.md`**

Replace the Task 1 draft. It must cover, because `/readme/` is what a marker reads before touching the app: what the thing is and what it is for; what good looks like here and what you decided; what you read while deciding; what you chose **not** to build; which parts of good are enforced by `spec/` and which are judgement calls. Include:

- The two modelling decisions — prerequisites are temporal, buckets constrain rather than partition — and why each is the honest reading of the program's rules.
- The data provenance: transcribed from Programs and Courses, committed as `src/data/seed.json`, never scraped at runtime. **Say plainly whether Task 10 ran**; if it did not, say the seed is hand-transcribed and how many courses it covers.
- **Two places Programs and Courses contradicts itself**, both recorded in `.superpowers/sdd/2026-09-29-fine-print/verified-course-data.md`: COMP7710 is *Programming Fundamentals* on its own page and in Study Options but *Structured Programming* in the Program Requirements; MATH6005 is *Discrete Mathematical Models* on its own page but *Discrete Mathematics Models* in the Program Requirements. Both were seeded from the course's own page. Say so — a system that disagrees with itself about the name of a compulsory course is exactly the kind of thing this app exists to surface.
- **The three simplifications applied to requisite prose** (program-enrolment clauses dropped as satisfied by construction, out-of-catalogue option codes dropped, incompatibility rules not modelled at all). The app's claim is that it does not hide things, so these must be stated, not buried.
- That the specialisation member list is partial.
- The cut list from the spec, as cuts you made rather than things you ran out of time for.

- [ ] **Step 3: Write `PROCESS.md`**

**150–300 words** — a crit week's `PROCESS.md` is short, in proportion to one
week of work. Read
`.superpowers/sdd/2026-09-29-fine-print/docs-requirements.md` first: it lists
exactly what `pnpm check:evidence` enforces, including the commit-citation
link format, which is mechanical and easy to get subtly wrong.

An overview of how the work actually went: the brainstorm that chose this slice over room booking and Wattle, the stance decision and the three alternatives rejected, the inversion of the spec's scrape-first sequence into transcribe-first, and where the agent went wrong and how you corrected it. The spec line is "you can account for how you directed, grounded and corrected the work" — this is that account, and the honest failures are worth more in it than a clean narrative.

- [ ] **Step 4: Write `reflections/crit-7.md`**

The week's reflection. Check `reflections/` for the shape earlier weeks used and follow it.

- [ ] **Step 5: Add what you learned to `CLAUDE.md`**

Append any rule this week produced that would help next week — anything about Drizzle, SQLite on Fly, boot-time seeding, or the Astro SSR patterns here that cost you time to discover.

- [ ] **Step 6: Verify the README is served whole**

```bash
pnpm check
```

Expected: PASS. `readme.test.ts` fails if `/readme/` serves a trimmed copy.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs: README, process overview, and the week's reflection"
```

---

## Task 9: Ship and verify

- [ ] **Step 1: Confirm the tree is clean and everything is pushed**

```bash
pnpm check && git status --short && git push
```

- [ ] **Step 2: Deploy**

```bash
flyctl deploy --remote-only --ha=false -a comp4020-crit7-anpham-09
```

- [ ] **Step 3: Verify every route serves on the real URL**

```bash
for p in / /plan/demo /readme/; do
  printf '%s -> ' "$p"
  curl -sS -o /dev/null -w '%{http_code}\n' "https://comp4020-crit7-anpham-09.fly.dev$p"
done
```

Expected: `200` three times.

- [ ] **Step 4: Verify the core flow against the deployed app, in a real browser**

Use the `agent-browser` CLI — the rendered page is the truth, and your mental model of it is not. Create a plan, add a course, **reload**, confirm it is still there, and confirm a blocked course shows its reason.

- [ ] **Step 5: Flip the repo public**

**The plan previously missed this, and it is a submission requirement.** The
assessment page: "Before your cutoff, flip the repo public with the course
`/ship` skill — the day before your crit is the norm." The whole repo goes
public, commit history and CI logs included.

```
/comp4020:ship
```

- [ ] **Step 6: Confirm CI is green on the public repo**

Flipping public turns CI on, and it deploys on every push to `main`. **Green
checks at the cutoff sweep are worth half that week's shipped mark**, so a red
CI run costs marks even with a working site.

```bash
gh run list --limit 3
gh run watch
```

- [ ] **Step 7: Run the course's own preflight**

```
/comp4020:preflight
```

- [ ] **Step 8: Warm the machine before the session**

`auto_stop_machines = "stop"` means the first request after idle is a cold start. Load the URL a few minutes before 15:30 so the demo is warm.

---

## Task 10: Widen the catalogue with a scraper (stretch)

**Cut this first if you are behind.** The seed is already real data; this widens it and adds the provenance script the spec's evidence table names.

**Files:**
- Create: `scripts/scrape-pc.ts`, `scripts/scrape-pc.test.ts`
- Modify: `src/data/seed.json`

- [ ] **Step 1: Write the failing parser test**

`vitest.config.ts` already includes `scripts/**/*.test.ts`. Test the pure extraction against a fixture string, not the network — the network is not a test dependency.

```ts
import { existsSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

const SCRAPER = "./scrape-pc";

// Resolved dynamically below.
let extractPrereqs: (...args: any[]) => any;
// Resolved dynamically below.
let extractUnits: (...args: any[]) => any;

beforeAll(async () => {
  expect(existsSync(new URL(`${SCRAPER}.ts`, import.meta.url))).toBe(true);
  ({ extractPrereqs, extractUnits } = await import(SCRAPER));
});

describe("the Programs and Courses parser", () => {
  it("pulls a single prerequisite out of the prose", () => {
    const prose = "To enrol in this course, you must have completed COMP6390.";
    expect(extractPrereqs(prose)).toEqual([
      { options: ["COMP6390"], concurrent: false },
    ]);
  });

  it("reads an OR group as one group with two options", () => {
    const prose = "You must have completed COMP1100 or COMP1130.";
    expect(extractPrereqs(prose)).toEqual([
      { options: ["COMP1100", "COMP1130"], concurrent: false },
    ]);
  });

  it("reads an AND of two requirements as two groups", () => {
    const prose = "You must have completed COMP6262 and COMP6442.";
    expect(extractPrereqs(prose)).toEqual([
      { options: ["COMP6262"], concurrent: false },
      { options: ["COMP6442"], concurrent: false },
    ]);
  });

  it("marks 'or be currently studying' as concurrent", () => {
    const prose =
      "To enrol in this course you must have successfully completed or be currently studying COMP6442.";
    expect(extractPrereqs(prose)).toEqual([
      { options: ["COMP6442"], concurrent: true },
    ]);
  });

  it("reads the unit value", () => {
    expect(extractUnits("Unit Value 6 units")).toBe(6);
    expect(extractUnits("Unit Value 12 units")).toBe(12);
  });
});
```

- [ ] **Step 2: Run to verify it fails, then implement**

Write `scripts/scrape-pc.ts` exporting `extractPrereqs(prose: string): string[][]` and `extractUnits(text: string): number`, plus a `main()` that fetches each course URL, extracts the fields, and writes `src/data/seed.json`.

**The parser is best-effort and must say so.** Where the prose does not match a known shape, emit the course with `prereqs: []` and the full prose in `requisiteNote`, and print a warning naming the course. A silently-dropped prerequisite is the same class of bug the app exists to criticise, so it must be loud.

- [ ] **Step 3: Run it, then read every line of the diff**

```bash
node scripts/scrape-pc.ts
git diff src/data/seed.json
```

**Do not commit a seed you have not read.** Spot-check three courses against their live pages.

- [ ] **Step 4: Run the checks and commit**

```bash
pnpm check
git add -A
git commit -m "scrape: widen the catalogue from Programs and Courses

The parser is best-effort and warns rather than guessing: a requisite whose
prose it does not recognise keeps its full text and an empty structured
prereq list. Every generated line was read before committing."
```

---

## Sequence and cuts

| Task | Work | Est. | Cut? |
|---|---|---|---|
| 0 | Fly token | 10m | **Blocker** |
| 1 | Strip starter, deploy skeleton | 30m | Never |
| 2 | Seed types + verified seed | 75m | Never |
| 3 | Schema, migration, seeding, reads | 45m | Never |
| 4 | Eligibility engine | 60m | Never |
| 5 | Progress engine | 60m | Never |
| 6 | Plans, create, resume | 40m | Never |
| 7 | Plan page, item API, HTTP spec | 80m | Never |
| 8 | README, PROCESS, reflection | 45m | **Never** |
| 9 | Ship and verify | 25m | **Never** |
| 10 | Scraper | 60m | **Cut first** |

Total without Task 10: **7h10m.**

**If behind, cut in this order:** Task 10 entirely; then the `comp8000` overlay (drop the bucket from `seed.json` — the engine handles its absence and one `rules.test.ts` case goes with it); then the seed's breadth, down to the ten courses the buckets reference plus two electives.

**Never cut Tasks 8 or 9.** Documentation and deployment are published spec lines; catalogue breadth is not.
