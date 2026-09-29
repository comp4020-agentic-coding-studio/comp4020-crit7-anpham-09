import { and, eq } from "drizzle-orm";
import { DEFAULT_SPECIALISATION, db, PROGRAM_CODE } from "./db";
import type { PlanItem } from "./rules/eligibility";
import { planItems, plans } from "./schema";
import { DEFAULT_ACADEMIC_YEAR, type AcademicYear } from "./seed-types";

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

export function createPlan(
  specialisationKey?: string,
  commencementYear: AcademicYear = DEFAULT_ACADEMIC_YEAR,
): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = makeSlug();
    if (findPlan(slug)) continue;
    db.insert(plans)
      .values({
        slug,
        programCode: PROGRAM_CODE,
        specialisationKey: specialisationKey ?? DEFAULT_SPECIALISATION,
        commencementYear,
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
