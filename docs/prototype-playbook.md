# Prototype playbook

What to carry into the next prototype, so it does not get rebuilt from scratch.

The [working agreement](working-agreement.md) is about *this* project. This file
is the portable part: setup decisions, failure modes and habits that would apply
to any throwaway-but-credible build. Written after the fact, from what actually
went wrong here.

---

## Decide these before writing code

Four choices shape everything that follows. Getting them wrong is expensive to
undo, and all four were re-decided mid-project here.

### 1. What is the artifact, exactly?

Not "a prototype" — *what file does someone open, on whose machine, how long
from now?*

Here it was: **one HTML file, opened by double-click, working with no network,
still working in three weeks on a laptop that has never seen the repo.** That
single sentence decided the build system, ruled out CDN fonts and map tiles,
and forced a build step when the source went modular.

Write that sentence down first. Every later argument resolves against it.

### 2. Single file or dev server?

A single self-contained file survives being emailed and outlives the session.
It costs a build step the moment the source becomes modular, because browsers
block ES module imports over `file://`.

Worth it when someone else will open it unattended. Not worth it for something
only ever demoed from your own machine.

### 3. Framework, honestly

This started vanilla, went modular, then converted to React. The conversion was
the right call for how the project *reads* — but it produced four bugs that
every static check passed clean, and cost a day.

**If it will end up React, start React.** Converting a working prototype is
paying twice. If it genuinely is throwaway, vanilla with a small store is
faster and fine.

### 4. Where the state lives

One state object with subscribe/emit was the best early decision here. It
survived the React conversion untouched — `useSyncExternalStore` bridged it in
about fifteen lines — and it made seeded screenshots trivial, because any
screen is reachable by writing localStorage rather than clicking through.

Whatever the framework, keep state in one place and make it serialisable.

---

## Build the harness early

The demo chrome — persona switcher, scenario picker, failure toggles, design
notes — was worth more than any single screen. It is what turns a form into an
argument, and it costs an afternoon.

Three things it must do:

- **Look unlike the product.** Scaffolding mistaken for product is worse than
  no scaffolding.
- **Seed any state.** Every screen reachable without clicking there.
- **Carry the reasoning.** Design-note callouts explaining each decision, on by
  default. A reviewer reading the form without them is reading the least
  interesting half — and that default was wrong here for weeks.

---

## The testing that actually paid

Not coverage. Four specific things, in the order they earned their place.

### Render it, do not read it

**The two worst bugs were invisible to every static check.** A missing
side-effect import meant nothing in the app responded to clicks — clean build,
perfect-looking page. A dead statement after a `return` left the design-notes
toggle doing nothing, hiding every piece of product reasoning while the demo
still looked correct.

Mount the built file in jsdom and drive the real flow. It is about eighty lines
and it caught both in seconds.

### Screenshot it, do not trust jsdom

jsdom has no layout engine. It proves the app *works*; it cannot show
misalignment, overflow or overlap. Headless Chrome via the installed browser
needs no Playwright and no dependency:

```bash
chrome --headless --screenshot=out.png --window-size=1440,1100 \
       --virtual-time-budget=4000 file:///seed.html
```

Seed localStorage in the seed file, redirect to the artifact, capture. Two
defects per review round were caught this way before reaching the reviewer.

### Measure contrast, do not eyeball it

Three separate times a colour survived a bulk remap on the wrong ground —
worst at **1:1**, text exactly the colour of its own background, reported as
"the buttons look empty."

Parse declared values out of the stylesheet and compute ratios. Reading the
values rather than restating them is the point: it tests what ships.

### Assert the domain rules, not just the code

The valuable assertions here are not "does it render" but "does the injury
answer reach 112 before any claims question" and "is there a fault field
anywhere". Those are the things a refactor silently breaks and nobody notices
until a review.

---

## Failure modes worth knowing about

**Bulk find-and-replace on colours.** A stylesheet-wide substitution cannot
know which ground a value sits on. It broke three surfaces here, each caught
weeks apart.

**Shell heredocs eating code.** Backticks, `${}`, apostrophes and backslashes
get mangled silently. A template literal shipped as `return also.length ?  :
base;`. Use file-writing tools for anything containing them.

**Tests that mirror the implementation instead of running it.** A navigation
suite that reimplements the store logic will happily assert the buggy
behaviour. It did — I asserted "5 of 6" was correct while it was telling
drivers they had completed five things they had not done.

**Documentation drifting from the code.** CLAUDE.md described the pre-React
build for the entire React conversion, because two patch attempts failed
silently on string-match and I did not verify. Read the file back after editing
it.

**Copy that flatters the demo.** "Recovery dispatched · ETA 45 min" — the
system notifies, it does not dispatch. Named a dispatcher too. The model writes
the impressive version by default; this is the highest-value thing a reviewer
catches.

---

## The review loop that worked

**Reviewer sends a marked-up screenshot with numbered items, batched by
screen.** Unambiguous in a way prose is not. Batching by screen means one build
and one screenshot back rather than two round-trips.

**Reviewer flags which items need discussion.** Most are unambiguous. Marking
the one that needs a decision lets the rest be built without stopping.

**Builder screenshots before handing back.** Non-negotiable, and the single
biggest change in throughput.

**Builder states what was not done.** Quietly dropping item 6 is worse than
saying item 6 needs a decision.

**Reviewer supplies everything about feel.** Screenshots are static. Awkward
targets, jarring transitions, two taps where one would do — the builder has no
way to see any of it.

---

## What a credible fake needs

Three things separate a prototype that survives scrutiny from one that does
not.

**Real field names from the real standard.** Anchoring on the European Accident
Statement and Mapon's documented API — actual endpoints, actual thresholds —
made the difference between a mock and a mapping. Research the standard before
inventing a schema.

**A named inventory of what is faked.** `docs/whats-faked.md` lists every
simulation beside the shorter list of what genuinely runs. A demo that hides
its seams invites the wrong questions; naming them makes the rest trustworthy.

**The honest gaps stated up front.** The most interesting finding here was that
the telematics partner documents *no crash detection* — so the trigger is
derived and carries a confidence score. That limitation is a better talking
point than anything that works.

---

## Reusable pieces

Portable with light editing:

| File | What it does |
|---|---|
| `tests/screenshots.mjs` | Headless Chrome capture, no dependency, seeds state per shot |
| `tests/contrast.mjs` | Parses stylesheets, computes WCAG ratios against declared values |
| `tests/serve.mjs` | Zero-dependency static server, prints the LAN address for phone testing |
| `build/build.mjs` | esbuild → one self-contained file, fails the build on any external reference |
| `src/core/store.js` | Serialisable state, subscribe/emit, localStorage, undo-friendly |

The pattern worth copying most: **the build refuses to complete if an external
request appears.** The constraint enforces itself rather than relying on
anyone remembering it.
