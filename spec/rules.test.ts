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
