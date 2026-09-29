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
  /** False for a machine-extracted course whose `requisiteNote` prose has
   *  not been converted into a structured `prereqs` rule — see
   *  `SeedCourse.requisitesModelled`. Defaults true: existing rows predate
   *  this column and were all hand-verified. */
  requisitesModelled: int("requisites_modelled", { mode: "boolean" })
    .notNull()
    .default(true),
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

// A bucket's rule is scoped to one Academic Year (ANU holds a student to the
// year they commenced), so the same `key` (e.g. "compulsory") recurs once per
// year with different units and membership — the primary key has to carry
// the year alongside the key.
export const buckets = sqliteTable(
  "buckets",
  {
    key: text().notNull(),
    academicYear: int("academic_year").notNull().default(2026),
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
    /** See `SeedBucket.includeSpecialisationMembers`: the 2024 8000-level
     *  overlay's predicate widens to accept non-COMP specialisation members. */
    includeSpecialisationMembers: int("include_specialisation_members", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    sortOrder: int("sort_order").notNull(),
  },
  (t) => [primaryKey({ columns: [t.key, t.academicYear] })],
);

export const bucketMembers = sqliteTable(
  "bucket_members",
  {
    bucketKey: text("bucket_key").notNull(),
    academicYear: int("academic_year").notNull().default(2026),
    courseCode: text("course_code").notNull(),
  },
  (t) => [primaryKey({ columns: [t.bucketKey, t.academicYear, t.courseCode] })],
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
  /** The Academic Year the student commenced — ANU holds them to that year's
   *  requirements, not the current one. Existing rows predate this column
   *  and were all implicitly created under 2026, hence the default. */
  commencementYear: int("commencement_year").notNull().default(2026),
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
