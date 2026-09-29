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
    expect(await reloaded.text()).toContain("COMP8410");
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
});
