# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A demo **First Notice of Loss** flow — the moment a truck driver reports a
motor incident from the roadside. A proof-of-concept pet project. Not
affiliated with any insurer, third-party administrator or vendor, and no
third-party brand names belong anywhere in the source (a test enforces this).

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
    tier1.js          what "six are answered" means — shared by both intake paths
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
      Archive.jsx     the driver's own copy of what was filed
      ModeChoice.jsx  the fork: answer the six as a form, or as a chat
      Chat.jsx        the chat path through the six — same fields, one at a time
      GapShell.jsx    shared shell for the optional screens, + gapItems()
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
4. **Documentation is tested, not remembered.** `tests/docs.mjs` asserts the
   field spec lists every incident type the code offers, that CLAUDE.md names
   only files that exist, and that every npm script is documented. Prose
   drifts silently; this fails the build instead.
5. **Test by rendering, not by reading.** Refactors here produce bugs that
   every static check passes clean: a missing side-effect import that disabled
   every click, and a dead statement after a `return` that left the Design
   notes toggle doing nothing while the demo still looked correct.
   `tests/render.mjs` mounts the built file in jsdom and drives the real flow.
   Trust it over inspection, and extend it when you add a screen.
6. **Every control, not just the happy path.** The dispatcher does
   `if(!fn) return`, so a button whose handler was renamed is silently inert —
   no throw, no log, and `render.mjs` never visits most screens.
   `tests/interactive.mjs` clicks every `data-act` on every driver screen and
   asserts each Back control goes somewhere. Both bugs it was written for were
   reproduced against it before it was trusted.
7. **The state in storage is older than the build reading it.** The artifact is
   emailed and reopened for months, and `Store.load` merges whatever it finds
   over the defaults. A stale screen name, a null `fail` block or a string
   where an array belongs each rendered a blank white page.
   `tests/persistence.mjs` boots the app against corrupt, stale and
   throwing storage; `load()` validates every value the render path reads.
8. **The domain rules are executable.** `tests/rules.mjs` asserts the six-field
   count, that offline and TPA-down still issue a reference, that a disputed
   coverage check never rejects the driver, that no screen asks about fault,
   and it greps the source for copy promising what the product cannot do.
   Four instances of the recovery/ETA promise survived code review; that grep
   found the fifth.
9. **Photo capture is proved in Chrome, not jsdom.** The path is
   `FileReader` → `Image` → canvas → data URL, and jsdom has neither a raster
   nor real `Blob` plumbing, so every jsdom suite can click the slot and prove
   nothing. `tests/capture.mjs` appends `tests/probe-capture.js` to a throwaway
   copy of the built artifact, feeds a real 1200×900 JPEG to the input the
   handler creates, and asserts the thumbnail reaches the slot, the byte count
   is real, and **the pixels never reach localStorage** — the whole app gets
   ~5 MB and a phone photo is 3–6 MB. It skips when Chrome is absent.

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
- **The field list is audited against ACORD 2, in both directions.**
  `ACORD_MAP` in `data/domain.js` says what we carry and where it lands;
  `ACORD_OMITTED` says what the form asks for that we refuse, and why. Adding a
  field means checking the form first. Removing one means saying so in the
  omissions list — a gap nobody explains reads as an oversight.
- **A field earns its place by being on the standard, not by sounding useful.**
  "Do you feel able to drive?" was added, then removed: ACORD 2 asks for driver
  identity and for injuries, and **no field on the form asks whether the driver
  is fit to keep driving**. It was removed rather than made optional — an
  unused field is still a field a driver reads at the roadside. Question 6
  stays, asking about the *vehicle* ("Can the vehicle still be driven?"), which
  is ACORD 3 · 38 and drives the reserve and the credit-hire clock.
- **"Yes, someone is hurt" is not a complete answer.** Injury counts as
  settled by "no one", or by yes **plus at least one party and one severity
  band**. Which party decides whether the claim is also a liability
  notification; the band decides the reserve — a bare yes leaves the handler
  phoning back for both, which is the call this product exists to avoid. This
  is a completeness rule for one of the six, **not a seventh blocking field**;
  the count stays six. "No one" remains a single tap, because the common case
  must not get slower to protect the rare one, and correcting to "no one"
  clears the detail behind it.
- **Injury records which party, never who.** ACORD 2's INJURED section is a
  table whose columns are PED / INS VEH / OTH VEH. That is the fact the flow
  collects — driver, our passenger, other vehicle, pedestrian — because it
  decides whether the claim is also a **liability notification**. Presence
  alone cannot say so and forces the handler to phone back. Names, ages and
  diagnoses stay uncollected: Art. 9 is unchanged by this.
- **No photograph is required, and none is owed.** ACORD 2 has no photo field:
  the FNOL is a *notification*, and images are claims-handling evidence that
  arrives later. No European jurisdiction obliges a driver to photograph a
  scene, and the record that settles a disputed damage figure is the
  assessor's — in Germany the *Sachverständiger* — not a phone on a hard
  shoulder. The screen therefore asks by the only warrant it has: **position
  and debris are gone the moment the truck moves**. That covers the wide shot;
  it does not cover a damage close-up, which is why skipping is one tap and no
  counter scolds. Copy on that screen must never imply the driver owes us a
  picture.
- **The driver gets their own copy.** Everything else in the flow moves
  information *away* from the driver. `Archive.jsx` gives it back: the
  reference, the six fields, **everything captured after them** — injuries,
  cargo and ADR, witness, police, the other vehicle and insurer, the signed
  accident statement — and the photographs taken and the ones **named as not
  taken**. A section the driver skipped says *Skipped* rather than vanishing:
  a blank cannot be told apart from data the app lost, and the skipped items
  are exactly the ones they will be messaged about. Adding a driver-answered
  field means adding it here; `tests/rules.mjs` renders a fully populated
  draft and fails if any value is missing. It is what makes asking for optional photos honest, and it removes
  the reason drivers photograph a scene twice. It states no retention period —
  that is a policy decision with an Art. 13 disclosure attached, and inventing
  a plausible number in a prototype is how an unagreed figure gets quoted back
  in a procurement meeting.
- **A theft is never asked what a theft victim cannot answer.** Six fields
  still block. But *"can the vehicle still be driven?"* has one possible answer
  when the vehicle is gone, so it is **derived from the incident type** rather
  than asked: `freshDraft()` sets `drivable:false` and `drivableSource:
  "derived"`, question 6 is not rendered, and the counter says five. The fact
  still reaches the handler — ACORD 3 · 38 drives the reserve and the
  credit-hire clock either way — but it is carried **flagged as derived**, so
  nobody reads an inference as testimony. `damageDesc` and `whereSeen` are
  dropped from the theft photos screen for the same reason: the driver has seen
  no damage and there is no address to inspect. Both omissions are recorded in
  `ACORD_OMITTED`. The photo slots stay; an empty parking space is worth
  having. This is the same move the flow already makes with vehicle, time and
  location — the unit reports, the driver confirms. Here there is nothing left
  to confirm.
- **Two ways through the six, one report.** The blocking six can be answered as
  a scrolling form (`S1Tier1.jsx`) or one question at a time in a chat
  (`Chat.jsx`), and the driver chooses on `ModeChoice.jsx` after the cold open.
  **The fork is shown every time the flow reaches it.** `intakeMode` records
  which path was used; it is never read to route. Reading it meant a driver who
  had chosen once never saw the choice again — on the second run of a reopened
  artifact, "Everyone's fine" landed straight in Roady. A stored preference
  that answers a question before it is put is not a preference, it is a
  decision taken away.
  This is a **presentation choice, not a second intake**: every control in the
  chat is the same component wired to the same `data-act` handler, so both
  paths write the same draft keys, and `tests/rules.mjs` runs both with
  identical answers and fails if the drafts differ by anything but
  `intakeMode`. Readiness is not reimplemented either — both call
  `tier1Ready()` from `core/tier1.js`, because two screens that block on the
  same six must not be able to disagree about whether they are done. Adding a
  blocking field means adding it to both, or the chat silently submits five.
- **Roady is a script, not a model, and says so.** Constraint 1 forbids every
  network primitive, so there is nothing to call: the chat asks a fixed
  sequence of the same six questions with the same buttons. It takes **no free
  text** except where the form already types (correcting vehicle, time or
  location, and naming an "other" incident type), shows **no typing indicator**
  and **invents no latency** — nothing pretends to think. A chat that guesses
  at a typed sentence guesses wrong at a roadside, and the cost lands on the
  person least able to absorb it. The taps are not a limitation being
  apologised for; they are what makes it honest. Recorded in
  `docs/whats-faked.md` and in the System pane's simulated list.
- **The chat's injury question behaves exactly as the form's does.** Answering
  yes opens the who and severity turns; it does **not** interrupt to 112. An
  earlier build did interrupt, reasoning that a driver could reach the chat
  having said everyone was fine and only then find otherwise — but both paths
  reach the six through the cold open's safety question, so the chat inherits
  the same guarantee the form relies on, and the interrupt was redundant with a
  screen the driver had already been shown. It also cost them the answer they
  were giving: "yes" is the start of naming who and how badly, and being thrown
  to a safety screen mid-thought is worse than the 112 rail already one tap
  above every screen. **Two paths through one question must not behave
  differently** — that difference is the bug, not the safety rule.
- **"Where will the truck be?" is not the incident location.** Question 3
  captured where it *happened*; this asks where the vehicle can be **inspected
  once it moves**, which is what decides whether an inspection is booked or
  wasted. The label has to say so, or it reads as a duplicate and the driver
  retypes the roadside.
- **There is no hub screen.** There was one: a list of the outstanding items in
  perishability order, sitting between the reference and the first of them.
  It was removed. The ordering is real and still governs the flow —
  `gapItems()` in `screens/driver/GapShell.jsx` is what decides which screen
  comes next, and `nextGap()` walks it — but a screen whose only content is a
  menu of the screens after it costs the driver a tap to read a list they
  cannot act on. `go-gaps` routes straight to the first outstanding item. The
  argument for perishability ordering lives in the design notes on the screens
  themselves, where it is read while the ordering is being felt.
- **A named slot takes as many frames as the thing needs.** Damage rarely fits
  one picture — a wing, a step and a windscreen are three frames of one
  category. Extras hang off the named slot (`photos[k].extra`) rather than
  becoming the unnamed pile the naming exists to prevent, and the counter says
  how many *named things* are covered, never how many pictures were taken.
  Retaking replaces the lead frame and keeps the extras: the driver is
  correcting one picture, not discarding the set.
- **The finished screen offers exactly one thing.** "See what dispatch sees"
  was the demo harness leaking into the product — a driver has no such button,
  and the persona switcher in the chrome already does it. The one control leads
  to the driver's own copy.
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

### Driver-facing voice

Four rules, enforced by `tests/copy.mjs`. They cover every string a driver
reads: the driver screens, the shell around them, the toasts, and all five
language packs. Run `/copy` when writing or changing any of them.

1. **No em dash, no en dash.** Not in any driver-facing string. It is the tell
   of generated prose and it reads as filler. A sentence that reaches for one
   wants a full stop, a comma, or the middot this project already uses between
   a label and its count. The single exception is a bare `'—'` standing alone
   as the empty-value glyph in a summary row, which is typography, not prose.
2. **Lean.** No label past 18 words, and nothing explained twice. The
   threshold is generous on purpose: it catches an explanation that grew a
   second clause, not a carefully written sentence.
3. **Formal but friendly, and directing.** No "please", no "sorry", no
   "are you sure?" — make it undoable instead. No exclamation marks. The
   screen directs; it does not petition, apologise, or cheer.
4. **Second person singular.** The driver is "you", never "the driver". German
   and Dutch use *du* / *je*, French *tu*; the flow addresses one person at a
   roadside, not an office. "The other driver" is a third party and is exempt.
5. **The driver is on our side.** Never strict, never chasing. "We will chase
   this one hard" shipped on the police screen; read from a hard shoulder it
   is a threat, and the person reading it is the employee who just had a
   collision and is reporting it at all. No "you must", no "required", no
   "failure to". State what *we* do. Only the six fields block, and they say
   so themselves.
6. **A yes/no question needs no accompanying text.** Two buttons and a
   question are self-explanatory. A paragraph under them is either restating
   the question or apologising for asking it, and it pushes the next control
   off the screen. Text conditional on an *answer* is fine — that is new
   information, not a preamble.
7. **Question every text block.** For each one ask: does the driver act
   differently for having read it? If not, it goes. If it explains what to do
   on this screen, it is the **subtitle**, not a card in the body. If it
   argues *why* the product is built this way, it is a `dn()` design note.
   A block that survives says one thing once: "add as many as you need" needs
   no sentence after it defending the idea of named slots.

Also: short sentences, no insurance jargon. Skipping is fine and is recorded
as a known gap, never framed as failure.

**Scope.** Code comments, `dn()` design notes and the demo chrome are exempt.
They are written for whoever is reading the source or watching the demo, and
the design notes quote the wording they argue against. The chrome is styled
unlike the product for the same reason it is allowed a different voice.

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
