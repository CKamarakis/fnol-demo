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
npm run build     # src/ -> dist/prototype.html
npm run watch     # rebuild on change
npm test          # all suites
npm run verify    # build, then test — run this before committing
```

There are no dependencies and no lockfile. Node 18+ only. If you find
yourself adding a package, stop and reconsider — see Constraints.

## Architecture

```
src/
  index.html          shell with /*__CSS__*/ and /*__JS__*/ placeholders
  main.js             entry point; import order here is bundle order
  boot.js             startup: subscribe renderer, load state, heartbeat
  core/
    dom.js            el() builder, icons, toast — no dependencies
    store.js          single state object, localStorage, subscribe/render
    FakeApi.js        implements the real API contract over a fake transport
    render.js         root render + scroll memory
    actions.js        every data-act handler, one delegated listener
    canvas.js         sketch pad and signature pads
  data/domain.js      EAS statements, scenarios, perishability, ACORD map
  components/         Chrome (demo scaffolding), DriverShell, svg
  screens/
    driver/           one file per screen, index.js is the router
    fleet/ system/ export/
  styles/             numeric prefixes ARE the cascade order
```

**Rendering.** No framework. State changes call `Store.set`, which notifies
subscribers, which re-render. Screens are functions returning DOM nodes built
with `el()`. Events use one delegated listener over `data-act` attributes —
add a handler to `ACTIONS` in `core/actions.js`, not an inline listener.

**The build.** `build/build.mjs` walks the module graph depth-first from
`main.js`, strips import/export keywords, and concatenates into one file.
Everything lands in a single scope.

## Constraints

These are load-bearing. Breaking one silently defeats the purpose.

1. **Zero external requests.** No CDN, fonts, map tiles, analytics, or remote
   fetch. The file is emailed and opened on other people's laptops, offline.
   `tests/integrity.mjs` fails the build if anything external appears.
2. **No dependencies.** The build and tests are plain Node. A `node_modules`
   here would be a regression, not an improvement.
3. **Circular imports break the bundle.** Legal in real ES modules when the
   reference is inside a function, but flattening to one scope turns that into
   a temporal dead zone error. `data/domain.js` must not import the store —
   the store injects a language getter via `setLangSource` instead. If you hit
   "Cannot access X before initialization", this is why.
4. **No module-scope side effects.** Wiring belongs in `boot.js`. A
   `Store.sub(render)` at the bottom of `render.js` executes before `Store`
   exists in the flattened bundle.

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
  the deliverable, not clutter.
- Colours come from the tokens in `styles/00-tokens.css`. Coral (`--danger`)
  is a surface colour only — it fails contrast as text, so emergency text uses
  `--danger-deep`.
- Touch targets ≥56px, primary actions in the bottom third, no insurance
  jargon in driver-facing copy ("the other car", not "third party").
- The demo chrome is deliberately styled unlike the product so it is never
  mistaken for it.

## Before committing

Run `npm run verify`. Both `dist/prototype.html` and `src/` are committed —
the built file is the artifact people open, so it must not go stale.
