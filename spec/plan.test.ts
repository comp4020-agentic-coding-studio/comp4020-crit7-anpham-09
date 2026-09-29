import { describe, expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");

// Drives the running app over HTTP, the same way the starter's guestbook
// test proved its plumbing. Test 2 is the published spec line "the core flow
// persists across a reload"; test 4 is the app's actual promise — that a
// blocked course says why.

async function createPlan(): Promise<string> {
  const res = await fetch(`${baseUrl}/api/plans`, {
    method: "POST",
    // Astro's CSRF check rejects a form POST with no matching Origin — a
    // request without this header gets 403, not 303. Verified against the
    // built server.
    headers: { origin: baseUrl },
    redirect: "manual",
  });
  expect(res.status).toBe(303);
  const location = res.headers.get("location");
  expect(location).toMatch(/^\/plan\//);
  return location as string;
}

describe("a plan", () => {
  it("is created and redirected to", async () => {
    const path = await createPlan();
    const page = await fetch(`${baseUrl}${path}`);
    expect(page.status).toBe(200);
  });

  it("survives a reload", async () => {
    const path = await createPlan();

    const form = new URLSearchParams({
      plan: path.replace("/plan/", ""),
      course: "COMP8410",
      term: "2027-S2",
      status: "planned",
      action: "add",
    });
    const post = await fetch(`${baseUrl}/api/plan-items`, {
      method: "POST",
      headers: { origin: baseUrl },
      body: form,
      redirect: "manual",
    });
    expect(post.status).toBe(303);

    // A completely fresh request: nothing carried over from the POST.
    const reloaded = await fetch(`${baseUrl}${path}`);
    const html = await reloaded.text();
    // "2027-S1" is the page's own term placeholder, so it's a false match on
    // an empty plan; "2027-S2" only appears if the posted item was actually
    // stored — the catalogue table (present on every plan page, even an
    // empty one) never renders a term, only "S1"/"S2" session labels, so
    // this stays a unique signal for persistence.
    //
    // "Data Mining" (COMP8410's catalogue title) is deliberately NOT used
    // here any more: the plan page now renders the whole seeded catalogue
    // as a table on every load, so "Data Mining" appears whether or not
    // this POST persisted anything — it would be a vacuous assertion. The
    // second, independent signal instead is the per-item "Remove" button,
    // which is only rendered for a course actually stored against this
    // plan (the catalogue table has no such button for any course).
    expect(html).toContain("2027-S2");
    expect(html).toContain("Remove COMP8410");
  });

  it("404s on an unknown slug", async () => {
    const res = await fetch(`${baseUrl}/plan/no-such-plan-here`);
    expect(res.status).toBe(404);
  });

  it("says why a course is blocked", async () => {
    // The demo plan carries COMP8020 without its prerequisite COMP6390.
    const res = await fetch(`${baseUrl}/plan/demo`);
    const html = await res.text();
    expect(html).toContain("COMP6390");
    expect(html).toMatch(/must be completed before/);
  });

  it("lists the seeded catalogue, not just what's already in the plan", async () => {
    // The demo plan only ever carries COMP6120 and COMP8020 (src/lib/plans.ts
    // seedDemoPlan). COMP6240 / "Relational Databases" is neither of those,
    // so it can only appear on the page via the catalogue table. If that
    // table is removed, this fails.
    const res = await fetch(`${baseUrl}/plan/demo`);
    const html = await res.text();
    expect(html).toContain("COMP6240");
    expect(html).toContain("Relational Databases");
  });

  it("warns, on the rendered page, that an added course's prerequisites aren't modelled", async () => {
    // COMP6034 (Network Security) is one of the 56 machine-extracted
    // additions: requisitesModelled: false, sessions: ["S2"]. Term chosen to
    // land in its one offered session (2028-S2) so this doesn't also trip
    // the "not-offered" reason and muddy the assertion — the point here is
    // the requisites-not-modelled warning alone, end to end over HTTP: the
    // engine (evaluateItem, src/lib/rules/eligibility.ts) pushes the
    // warning, and the page (src/pages/plan/[slug].astro) is what's
    // actually under test — it's the only thing standing between that
    // warning and a visitor. This does not touch the "2027-S2" /
    // "Remove COMP8410" plan created above; it's a separate plan.
    const path = await createPlan();

    const form = new URLSearchParams({
      plan: path.replace("/plan/", ""),
      course: "COMP6034",
      term: "2028-S2",
      status: "planned",
      action: "add",
    });
    const post = await fetch(`${baseUrl}/api/plan-items`, {
      method: "POST",
      headers: { origin: baseUrl },
      body: form,
      redirect: "manual",
    });
    expect(post.status).toBe(303);

    const reloaded = await fetch(`${baseUrl}${path}`);
    const html = await reloaded.text();
    // The exact reason text evaluateItem emits for
    // requisites-not-modelled — distinct from the catalogue table's "Not
    // modelled" cell, which renders for COMP6034 on every plan page
    // regardless of whether it was ever added, and so would be a vacuous
    // assertion on its own. Apostrophes come back HTML-escaped as `&#39;`
    // (Astro's default text escaping), so the expectation matches that, not
    // a literal apostrophe.
    expect(html).toContain(
      "COMP6034&#39;s prerequisites aren&#39;t modelled by this app — read ANU&#39;s own wording for COMP6034 in the catalogue below before relying on this plan.",
    );
  });
});
