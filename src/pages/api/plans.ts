import type { APIRoute } from "astro";
import { createPlan } from "../../lib/plans";

// A plain HTML form POSTs here and is redirected to the new plan. The 303 is
// what makes this work with no client-side JavaScript at all.
export const POST: APIRoute = async ({ redirect }) => {
  const slug = createPlan();
  return redirect(`/plan/${slug}`, 303);
};
