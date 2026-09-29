import { describe, expect, it } from "vitest";
import { formatPrereqs, formatRequisiteNote } from "../src/lib/catalogue-display";

describe("formatPrereqs", () => {
  it("renders no prerequisite as None, not an empty string", () => {
    expect(formatPrereqs([])).toBe("None");
  });

  it("renders a single strictly-earlier option plainly", () => {
    expect(formatPrereqs([{ options: ["COMP6390"], concurrent: false }])).toBe("COMP6390");
  });

  it("ORs multiple options within a group", () => {
    expect(
      formatPrereqs([{ options: ["MATH6005", "COMP6260"], concurrent: false }]),
    ).toBe("MATH6005 or COMP6260");
  });

  it("annotates a concurrent group as satisfiable in the same term", () => {
    expect(formatPrereqs([{ options: ["COMP6442"], concurrent: true }])).toBe(
      "COMP6442 (may be taken in the same term)",
    );
  });

  it("says a course's prerequisites aren't modelled rather than rendering None", () => {
    // Empty groups plus modelled: false is exactly the machine-extracted
    // additions' shape (prereqs: [], requisitesModelled: false) — the
    // structured rule is empty for a different reason than "no
    // prerequisite exists", so it must never read the same as `[]` alone.
    // A non-empty requisiteNote here: this case is about the ordinary
    // unmodelled course, which does have real ANU prose to point at — the
    // empty-note case below is a separate scenario.
    const note = "You must have completed COMP2100.";
    expect(formatPrereqs([], false, note)).not.toBe(formatPrereqs([]));
    expect(formatPrereqs([], false, note)).toBe("Not modelled — see ANU's wording below");
  });

  it("says plainly that ANU's page has no requisite, rather than pointing at an empty disclosure", () => {
    // ENGN6628, ENGN8823 and ENGN8830 have requisiteNote: "" — their ANU
    // page carries no requisite section to transcribe. Pointing the reader
    // "below" to an empty paragraph would be a disclosure that discloses
    // nothing, so the cell states the fact instead.
    expect(formatPrereqs([], false, "")).toBe("ANU's page states no requisite for this course");
    expect(formatPrereqs([], false)).toBe("ANU's page states no requisite for this course");
  });

  it("ANDs multiple groups together", () => {
    // COMP6442's real requisite: strictly-earlier COMP7710, AND
    // (MATH6005 or COMP6260) which may be concurrent.
    expect(
      formatPrereqs([
        { options: ["COMP7710"], concurrent: false },
        { options: ["MATH6005", "COMP6260"], concurrent: true },
      ]),
    ).toBe("COMP7710; MATH6005 or COMP6260 (may be taken in the same term)");
  });
});

describe("formatRequisiteNote", () => {
  it("passes a real requisite note through unchanged", () => {
    const note = "You must have completed COMP2100.";
    expect(formatRequisiteNote(note)).toBe(note);
  });

  it("states plainly that ANU's page has no requisite, instead of an empty paragraph", () => {
    // ENGN6628, ENGN8823 and ENGN8830's requisiteNote is "" — their ANU
    // page has no requisite section at all. Rendering that straight would
    // be a <details> that expands to a blank paragraph: a disclosure
    // pointing at nothing.
    expect(formatRequisiteNote("")).toBe("ANU's page states no requisite for this course.");
  });

  it("treats a whitespace-only note the same as empty", () => {
    expect(formatRequisiteNote("   ")).toBe("ANU's page states no requisite for this course.");
  });
});
