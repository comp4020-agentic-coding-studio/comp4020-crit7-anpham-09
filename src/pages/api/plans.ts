import type { APIRoute } from "astro";
import { createPlan } from "../../lib/plans";
import { DEFAULT_ACADEMIC_YEAR, isAcademicYear } from "../../lib/seed-types";

// A plain HTML form POSTs here and is redirected to the new plan. The 303 is
// what makes this work with no client-side JavaScript at all.
//
// The content-type guard matters beyond form-parsing hygiene: spec/plan.test.ts's
// createPlan() test helper POSTs here with no body at all (just the required
// Origin header), and `request.formData()` on a bodyless request throws.
// Checking the content-type first lets that call fall through to the default
// year instead of erroring.
export const POST: APIRoute = async ({ request, redirect }) => {
  let commencementYear = DEFAULT_ACADEMIC_YEAR;
  if (request.headers.get("content-type")?.includes("form")) {
    const form = await request.formData();
    const submitted = Number(form.get("commencementYear"));
    if (isAcademicYear(submitted)) commencementYear = submitted;
  }
  const slug = createPlan(undefined, commencementYear);
  return redirect(`/plan/${slug}`, 303);
};
