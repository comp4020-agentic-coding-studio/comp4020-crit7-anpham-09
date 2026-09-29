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

    // The consuming buckets' required units don't add up to more than the
    // program total — they may under-count (units left for electives), but
    // never over-commit the plan. Checked per Academic Year: each year has
    // its own full set of buckets, so summing across years would massively
    // over-count against the one program total.
    const { ACADEMIC_YEARS } = await import(TYPES);
    for (const year of ACADEMIC_YEARS) {
      const consuming = seed.buckets.filter(
        (b: { mode: string; academicYear: number }) =>
          b.mode === "consuming" && b.academicYear === year,
      );
      const required = consuming.reduce(
        (n: number, b: { minUnits: number }) => n + b.minUnits,
        0,
      );
      expect(required, `academicYear ${year}`).toBeLessThanOrEqual(
        seed.program.totalUnits,
      );
    }
  });

  it("has exactly one bucket per (key, academicYear) and every year carries the same set of keys", async () => {
    const seedUrl = new URL(SEED, import.meta.url);
    const seed = JSON.parse(readFileSync(seedUrl, "utf8"));
    const { ACADEMIC_YEARS } = await import(TYPES);

    const seen = new Set<string>();
    for (const b of seed.buckets as { key: string; academicYear: number }[]) {
      const id = `${b.key}@${b.academicYear}`;
      expect(seen.has(id), `duplicate bucket ${id}`).toBe(false);
      seen.add(id);
      expect(ACADEMIC_YEARS, b.key).toContain(b.academicYear);
    }

    const keysByYear = new Map<number, Set<string>>();
    for (const b of seed.buckets as { key: string; academicYear: number }[]) {
      const set = keysByYear.get(b.academicYear) ?? new Set<string>();
      set.add(b.key);
      keysByYear.set(b.academicYear, set);
    }
    const [firstYear, ...restYears] = ACADEMIC_YEARS as number[];
    const firstKeys = [...(keysByYear.get(firstYear) ?? [])].sort();
    for (const year of restYears) {
      const keys = [...(keysByYear.get(year) ?? [])].sort();
      expect(keys, `academicYear ${year}`).toEqual(firstKeys);
    }
  });
});
