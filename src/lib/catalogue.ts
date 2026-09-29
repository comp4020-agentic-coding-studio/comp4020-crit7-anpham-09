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
  AcademicYear,
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
      requisitesModelled: row.requisitesModelled,
    });
  }
  return out;
}

/** Buckets are scoped to one Academic Year — ANU holds a student to the
 *  requirements of the year they commenced, and the same bucket `key`
 *  (e.g. "compulsory") recurs once per year with different units and
 *  membership. `academicYear` picks which year's rule set to load. */
export function loadBuckets(academicYear: AcademicYear): SeedBucket[] {
  const membersByBucket = new Map<string, string[]>();
  for (const row of db
    .select()
    .from(bucketMembers)
    .where(eq(bucketMembers.academicYear, academicYear))
    .all()) {
    const list = membersByBucket.get(row.bucketKey) ?? [];
    list.push(row.courseCode);
    membersByBucket.set(row.bucketKey, list);
  }

  return db
    .select()
    .from(buckets)
    .where(eq(buckets.academicYear, academicYear))
    .all()
    .map((row) => ({
      key: row.key,
      academicYear: row.academicYear as AcademicYear,
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
      includeSpecialisationMembers: row.includeSpecialisationMembers,
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
