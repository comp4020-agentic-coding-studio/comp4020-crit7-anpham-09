import type { BucketReport } from "./rules/progress";

// A bucket whose rule is a MAXIMUM (e.g. `project`, capped at 12 units) has
// `minUnits` (and so `requiredUnits`) of 0 — there is nothing to require, only
// a ceiling not to exceed. Rendered the same way as a minimum-style bucket
// that reads `allocated/required`, that becomes `6/0u`: true, and meaningless
// to a reader. A bucket is max-style when it has no minimum but does have a
// cap; render it against that cap instead.
export function isMaxStyleBucket(
  bucket: Pick<BucketReport, "requiredUnits" | "capUnits">,
): boolean {
  return bucket.requiredUnits === 0 && bucket.capUnits > 0;
}

/** What the "Units" column of the progress table should read for one bucket. */
export function bucketUnitsLabel(bucket: BucketReport): string {
  if (isMaxStyleBucket(bucket)) {
    return `${bucket.allocatedUnits} / ${bucket.capUnits}u max`;
  }
  return `${bucket.allocatedUnits} / ${bucket.requiredUnits}u`;
}
