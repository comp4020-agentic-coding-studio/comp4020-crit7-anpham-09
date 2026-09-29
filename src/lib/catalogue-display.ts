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
 *  such as program-enrolment or incompatibility clauses; see README.
 *
 *  `modelled` (default true, for the hand-verified courses that call this
 *  with one argument) marks a course whose `requisiteNote` was never
 *  converted into a structured rule at all — its `groups` is always empty,
 *  but for a different reason than "no prerequisite exists", so it must
 *  never render as "None". "None" is a claim; an unmodelled course earns no
 *  claim, only a pointer to ANU's own wording below. */
export function formatPrereqs(groups: PrereqGroup[], modelled = true): string {
  if (!modelled) return "Not modelled — see ANU's wording below";
  if (groups.length === 0) return "None";
  return groups
    .map((group) => {
      const options = group.options.join(" or ");
      return group.concurrent ? `${options} (may be taken in the same term)` : options;
    })
    .join("; ");
}
