import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlanItem } from "../src/lib/rules/eligibility";

// This is the whole feature, proven end to end against the real seed: ANU
// holds a student to the program requirements of the Academic Year they
// commenced, and 2024/2025's Master of Computing structure genuinely differs
// from 2026's — not just renumbered courses, but the compulsory list's
// membership and the project bucket's floor-vs-ceiling shape. A build that
// ignores `academicYear` and always applies one year's buckets must fail
// every assertion below.
//
// `src/lib/db.ts` seeds and migrates at module load time against whatever
// `DATABASE_PATH` currently points at, so — same pattern as
// spec/catalogue.test.ts — each scenario gets a fresh temp file and a fresh
// module graph via `vi.resetModules()`.

function freshDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "program-years-test-"));
  return join(dir, "test.db");
}

async function bootAgainst(dbPath: string) {
  vi.resetModules();
  process.env.DATABASE_PATH = dbPath;
  const db = await import("../src/lib/db");
  const catalogue = await import("../src/lib/catalogue");
  const progress = await import("../src/lib/rules/progress");
  return { ...db, ...catalogue, ...progress };
}

afterEach(() => {
  delete process.env.DATABASE_PATH;
});

const planned = (courseCode: string, term: string): PlanItem => ({
  courseCode,
  term,
  status: "planned",
});

describe("Academic Year scoping", () => {
  it("the same plan reports a different compulsory-bucket outcome under 2024 rules than under 2026 rules", async () => {
    const {
      loadCatalogue,
      loadBuckets,
      loadSpecialisation,
      evaluateProgress,
      PROGRAM_TOTAL_UNITS,
    } = await bootAgainst(freshDbPath());

    const catalogue = loadCatalogue();
    const specialisation = loadSpecialisation(
      "human-centred-and-creative-computing",
    );

    // Exactly 2024/2025's compulsory list (COMP6250, COMP6442, COMP6710,
    // COMP8260) — none of these is 2026's compulsory list (COMP6120,
    // COMP6442, COMP7710, COMP8280) beyond the one course, COMP6442, both
    // years share.
    const items: PlanItem[] = [
      planned("COMP6250", "2026-S1"),
      planned("COMP6442", "2026-S1"),
      planned("COMP6710", "2026-S1"),
      planned("COMP8260", "2026-S2"),
    ];

    const under2024 = evaluateProgress(
      items,
      catalogue,
      loadBuckets(2024),
      specialisation?.members ?? [],
      PROGRAM_TOTAL_UNITS,
    );
    const under2026 = evaluateProgress(
      items,
      catalogue,
      loadBuckets(2026),
      specialisation?.members ?? [],
      PROGRAM_TOTAL_UNITS,
    );

    const compulsory2024 = under2024.buckets.find(
      (b: { key: string }) => b.key === "compulsory",
    )!;
    const compulsory2026 = under2026.buckets.find(
      (b: { key: string }) => b.key === "compulsory",
    )!;

    // 2024: all four courses land in the compulsory bucket (exclusive list),
    // filling its 24-unit requirement exactly.
    expect(compulsory2024.allocatedUnits).toBe(24);
    expect(compulsory2024.status).toBe("met");

    // 2026: only COMP6442 matches the compulsory list; the other three
    // aren't 2026 compulsory courses at all, so the bucket is short 24 of
    // its 30-unit requirement.
    expect(compulsory2026.allocatedUnits).toBe(6);
    expect(compulsory2026.status).toBe("unmet");

    // The whole point: identical plan, identical items, different bucket
    // report — this is what breaks if year scoping is ignored and one
    // year's buckets get applied regardless of commencementYear.
    expect(compulsory2024).not.toEqual(compulsory2026);
  });

  it("2024's project bucket is a required floor; 2026's is a cap with no floor", async () => {
    const { loadCatalogue, loadBuckets, loadSpecialisation, evaluateProgress, PROGRAM_TOTAL_UNITS } =
      await bootAgainst(freshDbPath());

    const catalogue = loadCatalogue();
    const specialisation = loadSpecialisation(
      "human-centred-and-creative-computing",
    );

    const buckets2024 = loadBuckets(2024);
    const buckets2026 = loadBuckets(2026);
    const project2024 = buckets2024.find((b) => b.key === "project");
    const project2026 = buckets2026.find((b) => b.key === "project");

    // The data-level shape this test exists to pin down: same cap, floor
    // dropped to zero in 2026. If a future edit collapses these back to
    // equal, this is the assertion that catches it.
    expect(project2024?.minUnits).toBe(12);
    expect(project2024?.capUnits).toBe(12);
    expect(project2026?.minUnits).toBe(0);
    expect(project2026?.capUnits).toBe(12);

    // A plan with no project course at all: 2024 leaves the requirement
    // unmet (a mandatory floor unfilled); 2026 reports the same empty
    // allocation as already met (there was never a floor to fill, only a
    // cap the plan hasn't approached).
    const emptyPlan: PlanItem[] = [];

    const under2024 = evaluateProgress(
      emptyPlan,
      catalogue,
      buckets2024,
      specialisation?.members ?? [],
      PROGRAM_TOTAL_UNITS,
    );
    const under2026 = evaluateProgress(
      emptyPlan,
      catalogue,
      buckets2026,
      specialisation?.members ?? [],
      PROGRAM_TOTAL_UNITS,
    );

    const projectReport2024 = under2024.buckets.find(
      (b: { key: string }) => b.key === "project",
    )!;
    const projectReport2026 = under2026.buckets.find(
      (b: { key: string }) => b.key === "project",
    )!;

    expect(projectReport2024.allocatedUnits).toBe(0);
    expect(projectReport2024.status).toBe("unmet");

    expect(projectReport2026.allocatedUnits).toBe(0);
    expect(projectReport2026.status).toBe("met");
  });
});
