import { existsSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import type { SeedBucket, SeedCourse } from "../src/lib/seed-types";

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
    academicYear: 2026,
    minUnits: 0,
    capUnits: 96,
    kind: "list",
    mode: "consuming",
    exclusive: false,
    members: [],
    subjects: [],
    minLevel: null,
    maxLevel: null,
    includeSpecialisationMembers: false,
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

  it("an overlay with includeSpecialisationMembers accepts a non-matching-subject specialisation member", () => {
    // The 2024 8000-level overlay's rule text widens to "or non-COMP courses
    // included in the Specialisations" — this is that widened predicate,
    // isolated from the real seed so it stays provable without depending on
    // the current catalogue having a non-COMP specialisation member.
    const buckets = [
      bucket({
        key: "comp8000",
        minUnits: 6,
        mode: "overlay",
        kind: "predicate",
        subjects: ["COMP"],
        minLevel: 8000,
        maxLevel: 8000,
        includeSpecialisationMembers: true,
        sortOrder: 1,
      }),
    ];
    const items = [planned("MATH6005", "2026-S2")];
    const catalogueWithMath = new Map(CATALOGUE);
    catalogueWithMath.set(
      "MATH6005",
      course("MATH6005", { subject: "MATH" }),
    );
    const withFlag = evaluateProgress(
      items,
      catalogueWithMath,
      buckets,
      ["MATH6005"],
      96,
    );
    expect(withFlag.buckets[0].allocatedUnits).toBe(6);

    // Without the flag (2025/2026's behaviour) the same non-COMP course is
    // rejected by the overlay even though it's still a specialisation member.
    const withoutFlag = evaluateProgress(
      items,
      catalogueWithMath,
      [{ ...buckets[0], includeSpecialisationMembers: false }],
      ["MATH6005"],
      96,
    );
    expect(withoutFlag.buckets[0].allocatedUnits).toBe(0);
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
