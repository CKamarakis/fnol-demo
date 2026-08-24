# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A demo **First Notice of Loss** flow — the moment a truck driver reports a
motor incident from the roadside. Private study project. Not affiliated with
any insurer, third-party administrator or vendor, and no third-party brand
names belong anywhere in the source (a test enforces this).

The point of the artifact is not the code. It is a set of product arguments
made watchable. When a change would weaken one of those arguments, say so
rather than quietly implementing it.

## Commands

```bash
npm install       # first time only
npm run build     # src/ -> dist/prototype.html
npm run watch     # rebuild on change
npm test          # all suites
npm run verify    # build, then test — run this before committing
```

React 18, bundled by esbuild. Node 18+.

## Architecture

```text
src/
  index.html          shell with /*__CSS__*/ and /*__JS__*/ placeholders
  main.jsx            entry: mounts two React roots, registers actions
  App.jsx             pane router, scroll memory, canvas mounting
  boot.js             restores persisted state, starts the timer heartbeat
  core/
    dom.jsx           el() builder — legacy element construction, React-compatible
    utils.js          icons, esc/uuid/clock helpers, imperative toast
    store.js          single state object, localStorage, subscribe/emit
    useStore.js       useSyncExternalStore bridge to the store
    FakeApi.js        implements the real API contract over a fake transport
    actions.jsx       every data-act handler, one delegated listener
    canvas.js         sketch pad and signature pads
  data/domain.js      EAS statements, scenarios, perishability, ACORD map
  components/
    Chrome.jsx        the demo harness bar
    DriverShell.jsx   112 rail, back bar, timer, status bar, saved chip
    Choice.jsx        shared Choice / YesNo / Note controls
    svg.js            hand-authored inline SVG
  screens/
    driver/           one file per screen, index.jsx is the router
    fleet/ system/ export/
  styles/             numeric prefixes ARE the cascade order
```

**Rendering.** React 18. The store predates React and mutates one state object
in place, so it exposes a monotonic `version` that `useSyncExternalStore`
compares — see `core/useStore.js`. Call `Store.set` / `Store.patchDraft` and
components re-render; never mutate `Store.s` directly.

**JSX, and the `el()` builder alongside it.** Every driver screen, the driver
shell and the demo chrome are plain JSX. The three display panes
(`screens/fleet`, `screens/system`, `screens/export`) still use `el()`, the
pre-React element builder.

The two interoperate freely, so the rest can be converted a file at a time. A
`Builder` exposes `$$typeof`, `type`, `props`, `key` and `ref` as lazy getters,
so React accepts one anywhere an element is expected: JSX can embed a
builder-returning helper like `textField()`, and a builder can `append()` a JSX
tree. No conversion call is needed at the boundary.

Shared driver controls live in `components/Choice.jsx` — `Choice`, `YesNo` and
`Note`. Use them rather than hand-rolling a button: the tap target and tick
affordance must be identical on every screen.

**Events.** One delegated `click` listener over `data-act` attributes, plus a
`change` listener for native selects. Add handlers to `ACTIONS` in
`core/actions.jsx`, not as inline props. `main.jsx` must import that module for
its side effect — if nothing responds to clicks, that import went missing.

**Two roots.** `#chrome` (the demo harness bar) and `#root` (the product).
Deliberately separate: the scaffolding must never be mistaken for the thing
being demonstrated.

**The build.** esbuild bundles `main.jsx` — React included — into one minified
IIFE, inlined with the CSS into `dist/prototype.html`.

## Constraints

These are load-bearing. Breaking one silently defeats the purpose.

1. **Zero external requests at runtime.** No CDN, fonts, map tiles, analytics,
   or remote fetch. React is bundled into the output, not loaded from a CDN.
   The file is emailed and opened on other people's laptops, offline.
   `tests/integrity.mjs` fails the build if anything external appears.
2. **`dist/prototype.html` must stay self-contained.** Build tooling may have
   dependencies; the artifact may not.
3. **`data/domain.js` must not import the store.** The store needs `SCENARIOS`
   from it, and the cycle bites. The store injects a language getter via
   `setLangSource` instead.
4. **Test by rendering, not by reading.** Refactors here produce bugs that
   every static check passes clean: a missing side-effect import that disabled
   every click, and a dead statement after a `return` that left the Design
   notes toggle doing nothing while the demo still looked correct.
   `tests/render.mjs` mounts the built file in jsdom and drives the real flow.
   Trust it over inspection, and extend it when you add a screen.

## Domain rules

Product decisions with reasons. Do not change these without raising it first.

- **No field asks whose fault it was.** Anywhere. The European Accident
  Statement is deliberately built to record agreed facts without admitting
  liability; an admission captured from an employee at the roadside is a
  liability you created. The annotations explaining this absence are
  intentional — the restraint has to be visible or it reads as an oversight.
- **Six fields block submission, and only six**: vehicle, date/time, location,
  incident type, anyone injured, vehicle drivable. Everything else is chased
  asynchronously. An abandoned FNOL is worse than an incomplete one.
- **Ordered by perishability, not logical grouping.** Witness contact and the
  other party's plate are gone within the hour; their insurer can be chased
  next week. This ordering is the organising principle of the whole flow.
- **Injury presence, never injury description.** Presence, severity band and
  whether emergency services attended. A diagnosis is Art. 9 health data and
  does not get collected through a phone on a hard shoulder.
- **112 before claims questions.** Answering "someone is hurt" routes to the
  emergency screen before any field is collected. The 112 rail is on every
  driver screen. Never put a Back button above a safety instruction.
- **Never reject at intake.** A failed coverage check flags for human review;
  the driver's screen is unchanged. An automated adverse decision on an
  individual is an Art. 22 problem, and schedule data is stale more often than
  drivers are dishonest.
- **The driver never depends on a partner API.** Accept, persist, acknowledge,
  then forward asynchronously with backoff. The reference is issued locally
  and works offline.

## Conventions

- Comments explain **why**, not what. Match the existing density — the
  design-note strings (`dn(...)`) carry the product reasoning and are part of
  the deliverable, not clutter. They are hidden until `body.notes-on` is set by
  the Design notes toggle.
- Long HTML strings passed to `dn()` are hoisted to a named `const` above the
  component rather than inlined, so the JSX stays readable.
- Colours come from the tokens in `styles/00-tokens.css`. Coral (`--danger`)
  is a surface colour only — it fails contrast as text, so emergency text uses
  `--danger-deep`.
- Touch targets ≥56px, primary actions in the bottom third, no insurance
  jargon in driver-facing copy ("the other car", not "third party").
- The demo chrome is deliberately styled unlike the product so it is never
  mistaken for it.

## Design and copy rules

> **Read [docs/working-agreement.md](docs/working-agreement.md) before your
> first UI or copy change in a session.** The rules below are the enforceable
> summary; that file carries the reasoning, the worked examples, the voice
> table, and the list of what I cannot verify. It is short. Read it.

Derived from what actually shipped broken.

**Copy must not assert what the product cannot do.** Before writing a label,
ask what the system actually does when the user acts on it. If the honest
answer is smaller than the copy, the copy is wrong. "Recovery dispatched · ETA
45 min" shipped, and an FNOL system does not run a recovery network. State the
fact, promise nothing.

**Every element earns its line.** A label that repeats identically on every
instance carries no information — "FROM THE TRUCK" on all six rows was
decoration. Counters name what they count: never "1 left".

**Colour never carries meaning alone.** State is border + tick + label. Coral
(`--danger`) is a surface colour and fails as text at 2.79:1; emergency text
uses `--danger-deep`. Selection is a border and a tick on an *unchanged*
ground — filling the surface is what produced a label at 1:1 against its own
background.

**Any colour change gets measured.** `tests/contrast.mjs` parses declared
values out of the stylesheets and computes ratios, so it tests what ships.
Extend it when a new surface appears; never restate a hex in the test.

**One question, however many lines the answer needs.** "What happened" is
thematically one question — a collision that also breaks glass does not become
a second question later.

**Consistency of gesture beats economy of controls.** Every pre-filled row
confirms by tap and corrects by the same control.

**Anything that expands in place scrolls itself into view.**

Driver-facing voice: short sentences, no insurance jargon, no "please", no
"are you sure?" — make it undoable instead. Skipping is fine and is recorded
as a known gap, never framed as failure.

## Working with Chris

- **Ask only what changes the build.** Questions with an obvious default get
  the default, stated plainly, not a dialog.
- **Screenshot and check your own work before handing back.** `npm run shots`
  drives real Chrome. jsdom proves it works; it has no layout engine, so it
  cannot show misalignment, overflow or overlap.
- **Say what you did not do, and why.** Quietly dropping an item is worse than
  flagging that it needs a decision.
- **Push back once, then build.** If Chris reaffirms, implement it fully.
- **Use Write/Edit for anything with backticks, template literals, apostrophes
  or regex.** Heredocs have silently corrupted files; a mangled template
  literal shipped as `return also.length ?  : base;`.

## Before committing

Run `npm run verify`. Both `dist/prototype.html` and `src/` are committed —
the built file is the artifact people open, so it must not go stale.
