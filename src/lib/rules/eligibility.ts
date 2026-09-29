import { type SeedCourse, sessionOf } from "../seed-types";

// Pure. No database, no DOM. Given one plan item, the catalogue, and every
// item in the plan, say whether it holds up and — this is the product —
// exactly what is wrong when it does not.

export interface PlanItem {
  courseCode: string;
  term: string;
  status: "completed" | "planned";
}

export type ReasonKind =
  | "missing-prereq"
  | "not-offered"
  | "duplicate"
  | "overload"
  | "permission-code"
  | "requisites-not-modelled"
  | "unknown";

export type Severity = "blocking" | "warning";

export interface Reason {
  kind: ReasonKind;
  severity: Severity;
  text: string;
}

export interface Verdict {
  code: string;
  term: string;
  ok: boolean;
  reasons: Reason[];
}

/** The standard full-time load. Not a ceiling — overloading is permitted
 *  with approval — so exceeding it warns rather than blocks. */
export const STANDARD_LOAD = 24;

export function evaluateItem(
  item: PlanItem,
  catalogue: Map<string, SeedCourse>,
  all: PlanItem[],
): Verdict {
  const reasons: Reason[] = [];
  const course = catalogue.get(item.courseCode);

  // Fail closed: an unrecognised code is never quietly fine.
  if (!course) {
    return {
      code: item.courseCode,
      term: item.term,
      ok: false,
      reasons: [
        {
          kind: "unknown",
          severity: "blocking",
          text: `${item.courseCode} isn't in the catalogue, so nothing about it can be checked.`,
        },
      ],
    };
  }

  if (all.filter((i) => i.courseCode === item.courseCode).length > 1) {
    reasons.push({
      kind: "duplicate",
      severity: "blocking",
      text: `${course.code} appears more than once in this plan.`,
    });
  }

  const session = sessionOf(item.term);
  if (!course.sessions.includes(session)) {
    const offered = course.sessions.length
      ? course.sessions.map((s) => (s === "S1" ? "Semester 1" : "Semester 2")).join(" and ")
      : "no semester on record";
    reasons.push({
      kind: "not-offered",
      severity: "blocking",
      text: `${course.code} isn't offered in ${session === "S1" ? "Semester 1" : "Semester 2"} — it runs in ${offered}.`,
    });
  }

  // Temporal: a prerequisite counts only from a strictly earlier term.
  // Terms are `<year>-<session>`, so lexical order is chronological order.
  for (const group of course.prereqs) {
    const satisfied = all.some(
      (other) =>
        group.options.includes(other.courseCode) &&
        (group.concurrent ? other.term <= item.term : other.term < item.term),
    );
    if (!satisfied) {
      const options = group.options.join(" or ");
      const when = group.concurrent
        ? `by ${item.term} — it may be taken alongside`
        : `before ${item.term}`;
      reasons.push({
        kind: "missing-prereq",
        severity: "blocking",
        text: `${options} must be completed ${when}.`,
      });
    }
  }

  // Warning, not blocking: an unmodelled course may well be fine, but this
  // app hasn't converted ANU's prose into a structured rule for it, so it
  // must never look identical to a course whose prerequisites are known and
  // clear. The verbatim note is shown alongside every course in the
  // catalogue table — that prose, not this app, is the authority here.
  if (!course.requisitesModelled) {
    reasons.push({
      kind: "requisites-not-modelled",
      severity: "warning",
      text: `${course.code}'s prerequisites aren't modelled by this app — read ANU's own wording for ${course.code} in the catalogue below before relying on this plan.`,
    });
  }

  if (course.needsPermissionCode) {
    reasons.push({
      kind: "permission-code",
      severity: "warning",
      text: `${course.code} needs a School of Computing permission code — request it before the enrolment window.`,
    });
  }

  const termUnits = all
    .filter((i) => i.term === item.term)
    .reduce((n, i) => n + (catalogue.get(i.courseCode)?.units ?? 0), 0);
  if (termUnits > STANDARD_LOAD) {
    reasons.push({
      kind: "overload",
      severity: "warning",
      text: `${item.term} is ${termUnits} units — over the standard ${STANDARD_LOAD}-unit load, which needs approval.`,
    });
  }

  return {
    code: course.code,
    term: item.term,
    ok: !reasons.some((r) => r.severity === "blocking"),
    reasons,
  };
}

/** Every planned item's verdict. Completed items are history: they satisfy
 *  prerequisites and count toward progress, but are not themselves checked. */
export function evaluatePlan(
  items: PlanItem[],
  catalogue: Map<string, SeedCourse>,
): Verdict[] {
  return items
    .filter((i) => i.status === "planned")
    .map((i) => evaluateItem(i, catalogue, items));
}
