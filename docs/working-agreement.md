# Working agreement

How we build this thing, written from what actually went wrong.

Eight of the first twenty-five commits were fixing my own work. Not eight
unrelated mistakes — four causes, repeated. This file exists to stop them
repeating a fifth time. The rules that matter most are in
[CLAUDE.md](../CLAUDE.md), which loads automatically; this is the reasoning
behind them and the reference material that would bloat it.

---

## The four things that actually cost us time

### 1. Colour values left on the wrong ground

**Happened three times.** The light-theme conversion remapped ~70 hardcoded
colours in bulk. Three separate times a value survived that was written for a
dark background:

| Where | Measured | Effect |
|---|---|---|
| Chrome bar text | 1.31:1 – 2.50:1 | Eight of ten labels barely visible |
| Design-note body | **1.22:1** | Product argument invisible on screen |
| Selected choice label | **1:1** | Buttons looked empty |

Each one shipped, was reviewed visually, and was only caught later. The last
was reported as "check the empty strings" — the text was there, the same
colour as the surface behind it.

**Rule.** Any colour change gets measured, not eyeballed.
`tests/contrast.mjs` parses the declared values out of the stylesheets and
computes ratios, so it tests what ships rather than what was intended. Extend
it when a new surface appears. Never restate a hex in the test — read it.

**Corollary.** Never bulk-remap colours again without a per-surface pass. A
find-and-replace across a stylesheet cannot know which ground a value sits on.

---

### 2. Not rendering before handing back

**The two worst bugs in the project were both invisible to every static
check:**

- `main.jsx` never imported `core/actions.jsx`, so the delegated click
  listener never registered. **Nothing in the app responded to clicks.** The
  build was clean; the page looked perfect.
- `renderChrome()` had statements after its `return`, so `body.notes-on` was
  never set. **The Design notes toggle did nothing** — every piece of product
  reasoning hidden, while the demo still looked correct.

**Rule.** Render it. `tests/render.mjs` mounts the built file in jsdom and
drives the real flow; `npm run shots` puts it through headless Chrome for
layout. Both run before anything is handed over, and I look at the screenshot
myself first. Two defects per round have been caught that way before reaching
Chris.

**Corollary.** jsdom proves it *works*; it has no layout engine, so it cannot
show misalignment, overflow or overlap. Screenshots are not optional for
anything visual.

---

### 3. Copy that asserts what the product cannot do

Three examples, all shipped:

- **"Recovery dispatched · ETA 45 min"** — an FNOL system notifies; it does not
  run a recovery network. The screen also named a dispatcher, inventing an
  operational capability to make the demo feel impressive.
- **"5 of 6"** on arrival — counted pre-filled values, telling a driver they
  had completed five things before touching anything.
- **"Six things, then you're done"** — the optional flow follows immediately.

**Rule.** Before writing a label, ask what the system actually does when the
user acts on it. If the honest answer is smaller than the copy, the copy is
wrong. State the fact, promise nothing:

> Marked as off the road — your fleet office can see this now.

**Corollary.** This is the highest-value review Chris does, because I am the
one most likely to write the flattering version.

---

### 4. Shell escaping mangling my own edits

Backticks, `${}`, apostrophes and backslashes inside heredocs have silently
corrupted files several times — a template literal became
`` return also.length ?  : base; `` and shipped broken.

**Rule.** Use the Write/Edit tools for anything containing backticks, template
literals, apostrophes or regex. Node one-liners are for mechanical
substitutions on plain text only. If a heredoc is unavoidable, read the file
back and check the exact line.

---

## Product rules that came out of review

Chris caught each of these. They generalise.

**Every element must earn its line.** "FROM THE TRUCK" repeated identically on
six rows, so it carried no information. "Only you can answer these" duplicated
what the rule already showed. If a label appears on every instance, it is
decoration.

**Name the thing, not the count.** "1 left" — of what? Buttons and counters say
what they refer to.

**One question, however many lines the answer needs.** "What happened" is
thematically one question. A collision that also breaks glass does not become a
second question later; the answer grows.

**Selecting an option must let you say what you selected.** "Other" with no
field behind it produces a claim nobody can route.

**A control that changes under you is worse than one that permits something
odd.** Additional-damage dropdowns use the unfiltered list. Duplicate entries
are recoverable; a vanished option is a driver hunting for something they saw a
moment ago.

**Consistency of gesture beats economy of controls.** "What happened" opened its
picker on a second tap of the row — a gesture no other row used. Now every
pre-filled row confirms by tap and corrects by the same "Not right?" control.

---

## Domain rules that are not up for redesign

These are in CLAUDE.md too. Repeated here because they are the ones most likely
to be eroded by a well-meaning UI improvement.

- **No field asks whose fault it was.** Anywhere. And the absence is annotated,
  because restraint nobody notices buys nothing.
- **Injury presence, never injury description.** Art. 9.
- **Six fields block, and only six.**
- **112 before any claims question**, and no Back button above a safety
  instruction.
- **Never reject at intake** on a business rule.
- **Ordered by perishability**, not by logical grouping.

If a change would weaken one of these, say so rather than quietly implementing
it. Chris has overruled me before and that is fine — but the trade should be
visible.

---

## How a round of changes should go

What has worked, and what would make it faster.

**From Chris:**

1. **A screenshot with marks on it.** Unambiguous in a way prose is not — I can
   see which element and what is wrong with it.
2. **Numbered items, batched by screen.** All S1 changes together means one
   build and one screenshot back. Mixing two screens costs two round-trips.
3. **Say which need discussion.** Most items are unambiguous. Flagging the one
   that needs a decision lets me build the other five without stopping.
4. **Anything about feel.** Screenshots are static. A control that is awkward to
   hit, a transition that jars, two taps where one would do — I have no way to
   see any of it.

**From me:**

1. **Ask only what changes the build.** Questions with an obvious default get
   answered by picking the default and saying so.
2. **Screenshot and check my own work before handing back.** Non-negotiable.
3. **Say what I did not do, and why.** A round that quietly drops item 6 is
   worse than one that says item 6 needs a decision first.
4. **Push back once, then build.** If Chris reaffirms, that is the decision —
   implement it fully rather than half-heartedly.

---

## Voice

For driver-facing copy specifically. This is a person on a hard shoulder,
possibly at night, possibly shaken, possibly reading their second language.

| Instead of | Write |
|---|---|
| Third party | The other car / the other driver |
| Excess, indemnity, subrogation | *(never appears)* |
| Submit your claim | File the report |
| Please confirm the following details | Tap each item to confirm or correct it |
| An error occurred | *(say what happened and what to do)* |
| Are you sure? | *(just do it — make it undoable instead)* |

- Short sentences. A shaken reader loses the end of a long one.
- Say what the control does, then have it do exactly that.
- No apologies, no "please", no exclamation marks.
- Never imply blame, urgency-panic, or that the driver has done something
  wrong. Skipping is fine and is recorded as a known gap.

---

## Visual defaults

The tokens in `styles/00-tokens.css` are the source of truth. These are the
rules around them.

- **Colour never carries meaning alone.** State is border + tick + label, so a
  colourblind driver in daylight glare loses nothing.
- **Coral (`--danger`) is a surface colour.** It fails as text at 2.79:1.
  Emergency text uses `--danger-deep`.
- **Selection is a border and a tick on an unchanged ground.** Filling the
  surface is what produced the 1:1 bug.
- **Touch targets ≥56px**, primary actions in the bottom third.
- **Anything that expands in place scrolls itself into view.** A panel opening
  below the fold is a panel the driver does not know is there.
- **The demo chrome stays visually unlike the product.** It is scaffolding and
  must never be mistaken for the thing being demonstrated.

---

## What I still cannot verify

Stated so neither of us assumes otherwise.

- **Real touch.** Everything is mouse events in a headless browser.
- **Narrow viewports.** Screenshots are 1440×1100. The phone frame has a height
  clamp that may behave differently.
- **Canvas.** jsdom has no backend; the sketch and signature pads are untested.
- **Anything about feel.** Latency, gesture comfort, whether a flow reads as
  calm.
- **Whether any of the UX reasoning is correct.** There has been no usability
  testing. Every claim in the docs is argument, not evidence — the
  perishability ordering most of all.
