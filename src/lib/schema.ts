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

export const buckets = sqliteTable("buckets", {
  key: text().primaryKey(),
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
  sortOrder: int("sort_order").notNull(),
});

export const bucketMembers = sqliteTable(
  "bucket_members",
  {
    bucketKey: text("bucket_key").notNull(),
    courseCode: text("course_code").notNull(),
  },
  (t) => [primaryKey({ columns: [t.bucketKey, t.courseCode] })],
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
