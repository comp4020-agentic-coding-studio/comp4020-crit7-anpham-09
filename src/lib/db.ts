import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import seedData from "../data/seed.json" with { type: "json" };
import { levelOf, type Seed } from "./seed-types";
import {
  bucketMembers,
  buckets,
  courses,
  offerings,
  prereqGroups,
  prereqOptions,
  seedMeta,
  specialisationMembers,
  specialisations,
} from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly.
migrate(db, { migrationsFolder: "./drizzle" });

const seed = seedData as Seed;

// Fail closed. An app that serves an empty catalogue looks healthy and
// reports every plan as fine, which is exactly the failure being critiqued.
if (!seed.courses?.length || !seed.buckets?.length) {
  throw new Error("src/data/seed.json is missing or empty — refusing to boot");
}

function seedReferenceData(): void {
  const hash = createHash("sha256")
    .update(JSON.stringify(seed))
    .digest("hex");
  const current = db.select().from(seedMeta).get();
  if (current?.hash === hash) return;

  db.transaction((tx) => {
    // Reference data only. Plans are never touched.
    tx.delete(prereqOptions).run();
    tx.delete(prereqGroups).run();
    tx.delete(offerings).run();
    tx.delete(bucketMembers).run();
    tx.delete(buckets).run();
    tx.delete(specialisationMembers).run();
    tx.delete(specialisations).run();
    tx.delete(courses).run();

    for (const course of seed.courses) {
      tx.insert(courses)
        .values({
          code: course.code,
          title: course.title,
          units: course.units,
          subject: course.subject,
          level: levelOf(course.code),
          requisiteNote: course.requisiteNote,
          needsPermissionCode: course.needsPermissionCode,
          requisitesModelled: course.requisitesModelled,
        })
        .run();
      for (const session of course.sessions) {
        tx.insert(offerings)
          .values({ courseCode: course.code, session })
          .run();
      }
      for (const group of course.prereqs) {
        const row = tx
          .insert(prereqGroups)
          .values({ courseCode: course.code, concurrent: group.concurrent })
          .returning()
          .get();
        for (const option of group.options) {
          tx.insert(prereqOptions)
            .values({ groupId: row.id, courseCode: option })
            .run();
        }
      }
    }

    for (const bucket of seed.buckets) {
      tx.insert(buckets)
        .values({
          key: bucket.key,
          academicYear: bucket.academicYear,
          programCode: seed.program.code,
          label: bucket.label,
          minUnits: bucket.minUnits,
          capUnits: bucket.capUnits,
          kind: bucket.kind,
          mode: bucket.mode,
          exclusive: bucket.exclusive,
          subjects: bucket.subjects.join(","),
          minLevel: bucket.minLevel,
          maxLevel: bucket.maxLevel,
          includeSpecialisationMembers: bucket.includeSpecialisationMembers,
          sortOrder: bucket.sortOrder,
        })
        .run();
      for (const code of bucket.members) {
        tx.insert(bucketMembers)
          .values({
            bucketKey: bucket.key,
            academicYear: bucket.academicYear,
            courseCode: code,
          })
          .run();
      }
    }

    for (const spec of seed.specialisations) {
      tx.insert(specialisations)
        .values({ key: spec.key, label: spec.label })
        .run();
      for (const code of spec.members) {
        tx.insert(specialisationMembers)
          .values({ specialisationKey: spec.key, courseCode: code })
          .run();
      }
    }

    tx.delete(seedMeta).run();
    tx.insert(seedMeta).values({ id: 1, hash }).run();
  });
}

seedReferenceData();

export const PROGRAM_CODE = seed.program.code;
export const PROGRAM_LABEL = seed.program.label;
export const PROGRAM_TOTAL_UNITS = seed.program.totalUnits;
export const DEFAULT_SPECIALISATION = "human-centred-and-creative-computing";

// Deferred: plans.ts imports from this module, so the call cannot sit at the
// top level of the import graph.
export async function bootstrapDemoPlan(): Promise<void> {
  const { ensureDemoPlan } = await import("./plans");
  ensureDemoPlan();
}
