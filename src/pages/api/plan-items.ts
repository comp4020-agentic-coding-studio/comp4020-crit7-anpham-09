import type { APIRoute } from "astro";
import { addItem, findPlan, removeItem } from "../../lib/plans";

// Add or remove one item, then redirect back to the plan. The GET that
// follows re-reads every item and re-renders — no client-side state.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const slug = String(form.get("plan") ?? "");
  const plan = findPlan(slug);
  if (!plan) return new Response("No such plan", { status: 404 });

  const action = String(form.get("action") ?? "add");

  if (action === "remove") {
    const itemId = Number(form.get("item"));
    if (Number.isInteger(itemId)) removeItem(plan.id, itemId);
    return redirect(`/plan/${slug}`, 303);
  }

  const course = String(form.get("course") ?? "").trim().toUpperCase();
  const term = String(form.get("term") ?? "").trim();
  const status = form.get("status") === "completed" ? "completed" : "planned";

  // Shape only. Whether the course exists is the catalogue's business, and
  // an unrecognised code is reported on the page as `unknown` rather than
  // rejected here — the app's job is to say what is wrong, not to refuse.
  if (/^[A-Z]{4}\d{4}$/.test(course) && /^\d{4}-S[12]$/.test(term)) {
    addItem(plan.id, course, term, status);
  }
  return redirect(`/plan/${slug}`, 303);
};
