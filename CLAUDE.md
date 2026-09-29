# Your harness

This file is yours, and it arrives empty on purpose. The rules you hold the
agent to are part of what gets marked, so they should be rules you decided on.

Nothing about the starter is recorded here. What the repo ships is explained
where it lives --- `fly.toml`, the `Dockerfile`, the CI workflow and
`spec/README.md` each say what they fix --- and the
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/)
publishes this deliverable's brief and spec. Read them before you plan or build;
what the agent needs to carry from any of it is your call.

## Carried forward from the static half (C1--C5, A1)

This project moved from the static template (GitHub Pages, `astro build` to
static HTML) to this one (server-rendered Astro on Fly.io/Docker). Rules that
were specific to that deploy target --- the `base`/`route()`/`asset()` path
system, the linkinator fix, the link-preview card --- don't apply here and were
left behind. What follows survived the move.

- **When a check fails, read its output before changing anything.** The failure
  message is the instruction: it names the file, the line, or the contract.
  Treat a red check as authoritative --- the app is wrong until the check is
  green, not until you decide it should be.
- **Commit when the checks pass. Never commit a red state.**
- **Never tell a reviewer what not to flag.** Dismissing a finding in advance is
  the one reliable way to make a review structurally unable to catch something.
  C5 shipped a `meta[name=description]` that violated the week's spec, and a
  task review missed it because its own prompt had pre-excused that exact kind
  of content. A later review given no such steer caught it immediately. If a
  finding looks like a false positive, let it be raised and argue it down on the
  record.
- **The rendered page is the truth; your mental model of it isn't.** Use a real
  browser (the `agent-browser` CLI, documented on
  [the course site](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/backpressure/#agent-browser-the-rendered-page-as-ground-truth))
  rather than assuming. A screenshot is a moment, not a state --- a CSS
  transition caught mid-flight looks exactly like a bug, so zoom or wait before
  believing it. Content that seems to have vanished is usually just below the
  fold --- scroll before diagnosing.
- **To render a narrow marking viewport (e.g. 390×844), use an iframe, not the
  window.** Chrome on macOS clamps how narrow a window can go, so a resize call
  can report success while the page still lays out wide. Load the page into a
  same-origin `<iframe>` sized to the target instead: media queries resolve
  against the frame, so the narrow layout genuinely renders. Read `innerWidth`,
  `documentElement.scrollWidth`, and computed grid/flex properties off
  `iframe.contentDocument` --- `scrollWidth` exceeding `innerWidth` is
  horizontal overflow.
- **Commit the updated `pnpm-lock.yaml`** when dependencies change --- CI
  installs with a frozen lockfile.
- **`.astro/` is generated** and gitignored; it's rebuilt by every `dev` and
  `build`. Never edit or commit it.

### Astro facts (this template still uses Astro)

- **Routing is `src/pages/`.** A file there is a route; there's no build config
  to update when you add a page.
- **`astro check`, not `tsc`.** `tsc --noEmit` can't read `.astro` files.
- **A `<script>` with any attribute is `is:inline`, and inline means
  invisible.** `define:vars`, or any other attribute, makes Astro ship the
  block untouched: no imports, no TypeScript, no typechecking. The symptom is
  `astro check` reporting real variables as unresolvable while the page works
  fine in the browser. Behaviour the typechecker can't see is also behaviour no
  test can import, which is how a page ends up with an interaction nothing
  asserts.
- **Behaviour lives in `src/lib/`, markup lives in the page.** A `.astro` file
  owns structure; anything with logic gets a module, and the script tag is a
  thin adapter that reads the DOM and calls it. Any function that touches the
  DOM should take its root as an argument rather than reaching for `document`,
  so a test can hand it a JSDOM and assert on what a visitor would see.
- **A test for code you haven't written yet must import it dynamically.**
  Typecheck runs before tests in `pnpm check`, so a static `import` of an
  unwritten module is a `ts(2307)` that stops the whole roster. Hold the
  specifier in a variable and `await import()` it behind an `existsSync` guard.
- **Astro eats the whitespace between a text node and a following element.**
  `…the source is\n<a href=…>` renders as `…the source is<a href=…>` --- no
  space. Write `is{" "}` before the link.
- **JSDOM has no layout engine: every rect it reports is zero.** Anything that
  divides by a height silently becomes `NaN`. Give measurement its own pure
  function so it can be tested as arithmetic, and stub
  `getBoundingClientRect` when the wiring itself is what's being checked.

### Rules for the page itself

Constraints on the artefact, not the tooling --- invisible to the check roster,
so this file is what holds them.

- **Colour only ever comes from a custom property.** No literal hex in a rule
  body. Dark mode is one `prefers-color-scheme` block redefining the tokens.
- **Judge colour separation in OKLab, not RGB or hue angle** --- both rank
  pairs backwards for perceptual distance. Clear a minimum-distance floor, then
  choose by meaning; a floor is a floor, not an objective.
- **Every transition and animation needs a `prefers-reduced-motion` escape.**
  Motion that can't be turned off is an accessibility defect.
- **No `100vh`.** Mobile Safari's address bar makes it lie. Use `dvh` with a
  fallback. Sticky bars use `position: sticky; top: 0`.
- **Interactive targets are at least 44×44px** (WCAG 2.5.5) --- the whole hit
  area, not just what's visible. Where the visible element must be smaller,
  grow the hit area with an absolutely positioned `::after`.
- **No web font.** An external font request is a failure mode on a deployed
  page that nothing in the check roster catches.

## This file is yours

Keep growing this file as the agent gets corrected or a new rule earns its
keep --- that gap between boilerplate and your own version is what your
process evidence points at.
