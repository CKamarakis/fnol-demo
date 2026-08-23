# FNOL — demo flow

A working prototype of a **First Notice of Loss** flow for a connected truck fleet: the moment a driver reports a motor incident from the roadside, and everything that has to be true for that moment to go well.

Private study project. Not affiliated with, commissioned by, or representing any insurer, third-party administrator or vendor.

**Open `dist/prototype.html` in any browser. Double-click it. No install, no server, no network.**

> **Nothing here touches a real system.** Every downstream response — claim registration, the coverage check, the telematics feed, recovery dispatch — is simulated in-browser. The System console inside the prototype carries a full inventory of what is faked, what genuinely works, and what is an honest limitation.

---

## Why this exists

A set of product arguments that are easier to *watch* than to describe:

- **The form shouldn't be blank.** If the vehicle detected the crash, the first screen is "we detected an incident at 14:32 — is everyone okay?", not an empty field.
- **Six fields block submission. Nothing else.** A validation wall at the roadside produces abandonment, and an abandoned FNOL is worse than an incomplete one.
- **Order the form by data perishability, not logical grouping.** Witness contact and the other party's plate are gone in an hour. Their insurer's name can be chased next week.
- **Never fail the driver's submission because a partner API is down.** Accept, persist, acknowledge, forward asynchronously. The reference is issued by the insurer within a second.
- **Never auto-reject at intake on a failed coverage check.** A coverage dispute is not the driver's problem while they're standing on a hard shoulder.
- **Capture injury *presence*, not injury *description*.** Health data is GDPR Art. 9; a diagnosis collected through a phone on a motorway is a compliance problem nobody needs.
- **No field anywhere asks whose fault it was.** The European Accident Statement is deliberately designed to establish agreed facts without admitting liability. An admission from an employee at the roadside, captured in your system, is a liability you created.

## What to look at first

If you have two minutes, in this order:

1. **The cold open** — the driver pane loads mid-incident, already knowing where and when.
2. **The 90-second timer** — runs from the first screen and stops when the reference is issued. That's the entire blocking path.
3. **The failure toggles** (top bar) — flip *TPA down* mid-flow and watch the driver's experience not change at all, while the System console shows the retry backoff. Then flip *Vehicle not on schedule*.
4. **Export** — produces a European Accident Statement-equivalent that another European insurer's handler would recognise, plus `incident.json` with an ACORD field mapping.

## What's in it

Three panes, switchable from the top bar:

| Pane | Shows |
| --- | --- |
| **Driver** (phone frame) | The FNOL flow — telematics cold open, six blocking fields, perishability-ordered gap fill, EAS circumstances, guided photo set |
| **Fleet manager** | Incident list with completeness and time-to-notification, duplicate merge queue, outstanding-information chase list |
| **System** | Live API log with idempotency keys, queue state, webhook events, state machine, and the "what's faked" inventory |

Plus three scenarios (glass / collision with injury / theft) showing the same form branch from ~8 fields to ~40, and four failure toggles: TPA down, no signal, triple-tap submit, vehicle not on schedule.

### Anchored on two existing standards

The **European Accident Statement** (*constat amiable* / *Europäischer Unfallbericht*) is the structural anchor — the form both drivers complete and sign at the scene across the EU, designed per Directive 2009/103/EC. Its output is immediately usable by the other party's insurer, which matters because transcription at the liability stage is where money leaks. **ACORD**'s claims standards are the carrier-exchange mapping target, shown alongside the JSON export.

## Project layout

```
src/          React 18 source — core, data, components, screens, styles
build/        esbuild bundler script
tests/        render (jsdom), navigation and integrity suites
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

Verified: no external requests, JS parses clean, no fault-attribution field, 112 reachable from every driver screen, back navigation covered by unit assertions.

## Documentation

| Document | What it covers |
| --- | --- |
| [Decision log](docs/decision-log.md) | Twelve decisions, each with what would change my mind |
| [Field spec](docs/field-spec.md) | Every field, its requirement level, and how fast it perishes |
| [`openapi.yaml`](openapi.yaml) | The contract — checked against the implementation by `npm test` |
| [Metrics](docs/metrics.md) | Nine numbers, each tied to a euro consequence |
| [Open questions](docs/open-questions.md) | What I would need from the insurer and the partners, and the risks worth raising |
| [What's faked](docs/whats-faked.md) | Every simulation named, and the shorter list of what genuinely works |

---

Chris Kamarakis · August 2026 · private study
