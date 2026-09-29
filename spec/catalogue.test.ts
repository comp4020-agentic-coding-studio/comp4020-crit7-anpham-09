import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Seed } from "../src/lib/seed-types";

// `src/lib/db.ts` reads `DATABASE_PATH` and runs the migration + boot
// seeding at module load time, so each scenario below points it at a fresh
// temp file and re-imports the module fresh via `vi.resetModules()` — a
// static top-level import would only ever seed once, against whatever
// database happened to exist when this file was first loaded.
//
// This is deliberately separate from the database the built server in
// `spec/global-setup.ts` runs against: that server exercises boot seeding
// generically (it would fail to serve anything on an empty catalogue), but
// asserts nothing about `concurrent`, sort stability, or idempotency
// specifically. Those are the properties this file exists to pin down.

const seed = JSON.parse(
  readFileSync(new URL("../src/data/seed.json", import.meta.url), "utf8"),
) as Seed;

function freshDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "catalogue-test-"));
  return join(dir, "test.db");
}

async function bootAgainst(dbPath: string) {
  vi.resetModules();
  process.env.DATABASE_PATH = dbPath;
  const db = await import("../src/lib/db");
  const catalogue = await import("../src/lib/catalogue");
  const schema = await import("../src/lib/schema");
  return { ...db, ...catalogue, ...schema };
}

afterEach(() => {
  delete process.env.DATABASE_PATH;
});

describe("catalogue: db-layer round trip", () => {
  it("round-trips every course from seed.json through loadCatalogue(), concurrent flag included", async () => {
    const { loadCatalogue } = await bootAgainst(freshDbPath());
    const cat = loadCatalogue();

    expect(cat.size).toBe(13);
    expect(cat.size).toBe(seed.courses.length);

    for (const course of seed.courses) {
      const got = cat.get(course.code);
      expect(got, `missing course ${course.code}`).toBeDefined();
      expect(got!.title).toBe(course.title);
      expect(got!.units).toBe(course.units);
      expect(got!.subject).toBe(course.subject);
      expect(got!.requisiteNote).toBe(course.requisiteNote);
      expect(got!.needsPermissionCode).toBe(course.needsPermissionCode);
      expect([...got!.sessions].sort()).toEqual([...course.sessions].sort());
      expect(got!.prereqs.length, course.code).toBe(course.prereqs.length);
      for (let i = 0; i < course.prereqs.length; i++) {
        expect(got!.prereqs[i].concurrent, `${course.code} group ${i}`).toBe(
          course.prereqs[i].concurrent,
        );
        expect([...got!.prereqs[i].options].sort()).toEqual(
          [...course.prereqs[i].options].sort(),
        );
      }
    }

    // COMP6120: one group, concurrent: true — "completed or currently studying".
    const comp6120 = cat.get("COMP6120");
    expect(comp6120?.prereqs).toEqual([{ options: ["COMP6442"], concurrent: true }]);

    // COMP6442: two groups — the first strictly earlier, the second concurrent.
    const comp6442 = cat.get("COMP6442");
    expect(comp6442?.prereqs.length).toBe(2);
    expect(comp6442?.prereqs[0]).toEqual({ options: ["COMP7710"], concurrent: false });
    expect(comp6442?.prereqs[1].concurrent).toBe(true);
    expect([...(comp6442?.prereqs[1].options ?? [])].sort()).toEqual([
      "COMP6260",
      "MATH6005",
    ]);
  });

  it("loadBuckets() sorts ascending by sortOrder; the specialisation bucket has no stored members", async () => {
    const { loadBuckets } = await bootAgainst(freshDbPath());
    const buckets = loadBuckets();

    expect(buckets.length).toBe(7);
    expect(buckets.length).toBe(seed.buckets.length);
    const orders = buckets.map((b) => b.sortOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));

    // Members come from the plan's chosen specialisation at evaluation time,
    // not from a stored bucket_members row — this stays empty by design.
    const specialisation = buckets.find((b) => b.key === "specialisation");
    expect(specialisation).toBeDefined();
    expect(specialisation?.members).toEqual([]);
  });

  it("boot seeding is idempotent: re-running it against the same file leaves row counts unchanged", async () => {
    const dbPath = freshDbPath();

    const first = await bootAgainst(dbPath);
    expect(first.loadCatalogue().size).toBe(13);
    expect(first.loadBuckets().length).toBe(7);
    const firstMeta = first.db.select().from(first.seedMeta).all();
    expect(firstMeta.length).toBe(1);

    // Fresh module graph, same underlying file: the module-scope
    // `seedReferenceData()` call runs again on import.
    const second = await bootAgainst(dbPath);
    expect(second.loadCatalogue().size).toBe(13);
    expect(second.loadBuckets().length).toBe(7);
    const secondMeta = second.db.select().from(second.seedMeta).all();
    expect(secondMeta.length).toBe(1);
    expect(secondMeta[0].hash).toBe(firstMeta[0].hash);
  });

  it("plans and plan_items survive re-seeding untouched", async () => {
    const dbPath = freshDbPath();

    const first = await bootAgainst(dbPath);
    first.db
      .insert(first.plans)
      .values({
        slug: "test-plan",
        programCode: "7706",
        specialisationKey: "human-centred-and-creative-computing",
      })
      .run();
    const plan = first.db.select().from(first.plans).all()[0];
    first.db
      .insert(first.planItems)
      .values({
        planId: plan.id,
        courseCode: "COMP6120",
        term: "2026-S2",
        status: "planned",
      })
      .run();

    const second = await bootAgainst(dbPath);
    const plansAfter = second.db.select().from(second.plans).all();
    const itemsAfter = second.db.select().from(second.planItems).all();
    expect(plansAfter).toEqual([plan]);
    expect(itemsAfter.length).toBe(1);
    expect(itemsAfter[0].courseCode).toBe("COMP6120");
  });

  it("loadBuckets() sorts even when the physical row order is reversed", async () => {
    // Regression test for a vacuous-assertion bug: seed.json already lists
    // buckets in ascending sortOrder, seeding inserts them in file order, and
    // a plain SELECT returns SQLite rows in rowid (insertion) order — so
    // "assert the output equals its own sorted copy" passes whether or not
    // loadBuckets() actually sorts. This test breaks that by physically
    // reversing the stored row order first, so a missing `.sort()` in
    // loadBuckets() would come back descending and fail here.
    const { db, buckets, loadBuckets } = await bootAgainst(freshDbPath());

    const rows = db.select().from(buckets).all();
    expect(rows.length).toBe(7);
    const reversed = [...rows].sort((a, b) => b.sortOrder - a.sortOrder);

    db.delete(buckets).run();
    for (const row of reversed) {
      db.insert(buckets).values(row).run();
    }

    // Confirm the sabotage worked: a plain SELECT now yields descending.
    const rawAfter = db.select().from(buckets).all().map((b) => b.sortOrder);
    expect(rawAfter).toEqual([7, 6, 5, 4, 3, 2, 1]);

    const result = loadBuckets();
    expect(result.map((b) => b.sortOrder)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(result.map((b) => b.key)).toEqual([
      "compulsory",
      "foundational",
      "project",
      "specialisation",
      "further",
      "elective",
      "comp8000",
    ]);
  });

});
