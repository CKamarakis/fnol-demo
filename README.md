# FNOL — demo flow

A proof-of-concept for a **First Notice of Loss** flow on a connected truck fleet: the moment a driver reports a motor incident from the roadside, and everything that has to be true for that moment to go well.

A pet project. Not affiliated with, commissioned by, or representing any insurer, third-party administrator or vendor.

**Open `dist/prototype.html` in any browser. Double-click it. No install, no server, no network.**

> **Nothing here touches a real system.** Every downstream response — claim registration, the coverage check, the telematics feed, the forward to the third-party administrator — is simulated in-browser. The System console inside the prototype carries a full inventory of what is faked, what genuinely works, and what is an honest limitation.

---

## Why this exists

A set of product arguments that are easier to *watch* than to describe:

- **The form shouldn't be blank.** If the vehicle detected the crash, the first screen is "we detected an incident at 14:32 — is everyone okay?", not an empty field.
- **Six fields block submission. Nothing else.** A validation wall at the roadside produces abandonment, and an abandoned FNOL is worse than an incomplete one.
- **Order the form by data perishability, not logical grouping.** Witness contact and the other party's plate are gone in an hour. Their insurer's name can be chased next week.
- **Never fail the driver's submission because a partner API is down.** Accept, persist, acknowledge, forward asynchronously. The reference is issued immediately, and generated on the phone when there is no signal at all.
- **Never auto-reject at intake on a failed coverage check.** A coverage dispute is not the driver's problem while they're standing on a hard shoulder.
- **Capture injury *presence*, not injury *description*.** Health data is GDPR Art. 9; a diagnosis collected through a phone on a motorway is a compliance problem nobody needs.
- **No field anywhere asks whose fault it was.** The European Accident Statement is deliberately designed to establish agreed facts without admitting liability. An admission from an employee at the roadside, captured in your system, is a liability you created.
- **A form and a conversation can be the same six fields.** The driver picks. Both write the same record through the same handlers, and a test fails the build if the two ever disagree.

## What to look at first

If you have two minutes, in this order:

1. **The cold open** — the driver pane loads mid-incident, already knowing where and when.
2. **The fork, then either path** — "everyone okay" leads to a choice: the form, or **Roady**, which asks the same six one at a time. Walk one, then use the link in the dock to switch mid-report and watch the answers carry across.
3. **The 90-second timer** — runs from the first screen and stops when the reference is issued. That's the entire blocking path.
4. **The failure toggles** (top bar) — flip *TPA down* mid-flow and watch the driver's experience not change at all, while the System console shows the retry backoff. Then flip *Vehicle not on schedule*.
5. **Export** — produces a European Accident Statement-equivalent that another European insurer's handler would recognise, plus `incident.json` with an ACORD field mapping.

## What's in it

Three panes, switchable from the top bar:

| Pane | Shows |
| --- | --- |
| **Driver** (phone frame) | The FNOL flow — telematics cold open, a choice of form or chat for the six blocking fields, perishability-ordered gap fill, EAS circumstances, guided photo set, and the driver's own copy of what was filed |
| **Fleet manager** | Incident list with completeness and time-to-notification, duplicate merge queue, outstanding-information chase list |
| **System** | Live API log with idempotency keys, queue state, webhook events, state machine, and the "what's faked" inventory |

Plus three scenarios (glass 8 fields / collision with injury 41 / theft 14) showing how far the same form branches, five languages on every driver screen, and four failure toggles: TPA down, no signal, triple-tap submit, vehicle not on schedule.

### Two ways through the six

The blocking six can be answered as one scrolling form, or one question at a time in a chat. The driver chooses after the cold open and can switch either way mid-report.

**Roady is a fixed script, not a model.** Nothing here calls anything: the artifact makes zero network requests by design, so there is nothing to reason with. It asks the same six questions in a fixed order using the same buttons the form uses, takes no free text beyond the fields the form already types into, shows no typing indicator and invents no latency. A chat that guesses at a typed sentence guesses wrong at a roadside, and the cost lands on the person least able to absorb it.

The point is that it is a second *presentation*, not a second intake. Every control is the same component wired to the same handler, both paths write the same draft keys, and `tests/rules.mjs` runs both with identical answers and fails if the resulting records differ.

Whether one question at a time is actually better at a roadside is **not settled by having built it** — the form shows six rows and a counter; the chat shows one question and a history you scroll to re-read. [Open questions](docs/open-questions.md) carries the doubt and the measurement that would answer it.

### Anchored on two existing standards

The **European Accident Statement** (*constat amiable* / *Europäischer Unfallbericht*) is the structural anchor — the form both drivers complete and sign at the scene across the EU, designed per Directive 2009/103/EC. Its output is immediately usable by the other party's insurer, which matters because transcription at the liability stage is where money leaks. **ACORD**'s claims standards are the carrier-exchange mapping target, shown alongside the JSON export.

## Project layout

```text
src/          React 18 source — core, data, components, screens, styles
build/        esbuild bundler script
tests/        twelve suites — see below
dist/         the built single-file artifact
```

```bash
npm install       # first time only
npm run build     # src/ -> dist/prototype.html
npm run watch     # rebuild on change
npm test          # all suites
npm run verify    # build + test
npm run serve     # view at http://localhost:5173
npm run shots     # screenshots via headless Chrome
```

See [CLAUDE.md](CLAUDE.md) for architecture, constraints and domain rules.

## Technical notes

Built to a single self-contained HTML file — React 18, hand-written CSS, hand-authored inline SVG. Zero external requests by design: no CDN, no fonts, no map tiles, no analytics. It has to survive being emailed and reopened on someone else's laptop in three weeks.

### What the build checks

`npm test` runs twelve suites against the *built* file, not the source. They exist because every one of them was written after something shipped broken:

| Suite | Guards against |
| --- | --- |
| `integrity` | Any external request, leftover module syntax, third-party brand names, private paths |
| `render` | The app mounting but doing nothing — a missing side-effect import once disabled every click |
| `interactive` | Silently inert controls. The dispatcher ignores unknown actions, so a renamed handler throws nothing |
| `rules` | The domain rules as executable assertions: six block and only six, no fault field, offline still issues a reference, both intake paths produce the same record |
| `persistence` | Corrupt, stale and throwing storage. State in a reopened file is routinely older than the build reading it |
| `copy` | The driver-facing voice rules, across all five languages |
| `contrast` | Colour ratios, computed from the values that actually ship |
| `docs` | Prose drift — every incident type in the field spec, every npm script documented, every path named in CLAUDE.md existing |
| `contract` | `openapi.yaml` against what the fake API actually does |
| `capture` | The photo path in real Chrome, including that pixels never reach localStorage |
| `navigation` | Back behaviour, including the screens that are passed through rather than visited |
| `telematics` | That the fixture figures are computed from the route rather than hardcoded |

## Documentation

| Document | What it covers |
| --- | --- |
| [Decision log](docs/decision-log.md) | Twelve decisions, each with what would change my mind |
| [Field spec](docs/field-spec.md) | Every field, its requirement level, and how fast it perishes |
| [`openapi.yaml`](openapi.yaml) | The contract — checked against the implementation by `npm test` |
| [Metrics](docs/metrics.md) | Nine numbers, each tied to a euro consequence |
| [Open questions](docs/open-questions.md) | What would need answering before building this for real, and the risks worth raising |
| [What's faked](docs/whats-faked.md) | Every simulation named, and the shorter list of what genuinely works |
| [Working agreement](docs/working-agreement.md) | How this gets built, written from what actually went wrong |
| [Prototype playbook](docs/prototype-playbook.md) | The portable part — setup, failure modes, review loop |
