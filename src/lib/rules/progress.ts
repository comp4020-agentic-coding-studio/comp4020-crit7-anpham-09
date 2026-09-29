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
