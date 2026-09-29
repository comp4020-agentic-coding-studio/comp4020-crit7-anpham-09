import type { PrereqGroup } from "./seed-types";

// Formatting a `PrereqGroup[]` into prose is behaviour, not markup — it goes
// here so it has its own unit test, per the repo's "behaviour lives in
// src/lib/, markup lives in the page" rule.

/** Renders the structured (AND-of-ORs) prerequisite groups for one course as
 *  readable prose for the catalogue table. Groups are ANDed together
 *  (joined "; "), the options inside a group are ORed ("or"), and a
 *  `concurrent: true` group is annotated as satisfiable in the same term.
 *  A course with no structured prerequisite renders as "None" rather than an
 *  empty cell — its full requisite note (shown alongside, verbatim from
 *  Programs and Courses) may still carry conditions this app doesn't model,
 *  such as program-enrolment or incompatibility clauses; see README. */
export function formatPrereqs(groups: PrereqGroup[]): string {
  if (groups.length === 0) return "None";
  return groups
    .map((group) => {
      const options = group.options.join(" or ");
      return group.concurrent ? `${options} (may be taken in the same term)` : options;
    })
    .join("; ");
}
