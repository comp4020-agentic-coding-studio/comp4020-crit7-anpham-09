import { describe, expect, it } from "vitest";
import { formatPrereqs } from "../src/lib/catalogue-display";

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
    expect(formatPrereqs([], false)).not.toBe(formatPrereqs([]));
    expect(formatPrereqs([], false)).toBe("Not modelled — see ANU's wording below");
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
