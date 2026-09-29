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

/** ANU holds a student to the program requirements of the Academic Year they
 *  commenced, and the Master of Computing's requirements differ structurally
 *  by year — not just renumbered courses, but a floor becoming a ceiling
 *  (`project`) and a predicate widening (`comp8000`, 2024 only). So a bucket
 *  is scoped to exactly one year; the same `key` recurs once per year it
 *  applies to, each with its own units and membership. */
export const ACADEMIC_YEARS = [2024, 2025, 2026] as const;
export type AcademicYear = (typeof ACADEMIC_YEARS)[number];
export const DEFAULT_ACADEMIC_YEAR: AcademicYear = 2026;

export function isAcademicYear(value: number): value is AcademicYear {
  return (ACADEMIC_YEARS as readonly number[]).includes(value);
}

export interface SeedBucket {
  key: string;
  /** The Academic Year this bucket's rule applies to. */
  academicYear: AcademicYear;
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
  /** `predicate` buckets only. The 2024 8000-level-COMP overlay's rule text
   *  widens to "or non-COMP courses included in the Specialisations" — 2025
   *  and 2026 are COMP-only. When true, a course that fails the subject/level
   *  predicate is still accepted if it's a member of the plan's chosen
   *  specialisation, regardless of level. Inert on this seed's catalogue,
   *  whose only specialisation happens to have no non-COMP members — but
   *  structurally correct for when one does. */
  includeSpecialisationMembers: boolean;
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
