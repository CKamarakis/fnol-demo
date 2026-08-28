# What's faked

**No partner API was contacted. No Mapon account exists. No claim was
registered anywhere. Every downstream response in this prototype is simulated
in the browser.**

This document exists so nothing in the demo can be mistaken for a real
integration. It is also the more useful half of the artifact: what is *not*
faked is a much shorter list, and knowing which is which is the difference
between a prototype and a promise.

---

## Simulated

| What appears to happen | What actually happens | What it would take to be real |
|---|---|---|
| **Telematics detects a crash** | Three scripted fixtures in `src/data/mapon.js`. They use Mapon's documented field names, endpoints, nesting and thresholds — the *values* are invented. | A Mapon API key, and an answer to the crash-detection question below. |
| **Crash detection itself** | **Mapon documents none.** The trigger is derived here from a harsh-braking alert plus speed, ignition and movement, and carries a confidence score. | Confirmation of whether the device firmware exposes an accelerometer event. This is the first thing I would ask them. |
| **Forwarding to the TPA** | `POST /tpa/v2/claims` resolves locally after a simulated delay. | A TPA integration, and the answer to whether their interface is an API or a file drop. |
| **The retry queue** | An in-memory array with a visible backoff timer. The *behaviour* is genuine; the durability is not. | A real broker with a dead-letter queue. |
| **Coverage check** | A toggle in the demo harness. | Policy admin integration. |
| **Recovery dispatch and ETA** | A fixed string and a plausible number. | A recovery network integration. |
| **Policy prefill** | Hardcoded fleet and vehicle. | Policy admin integration. |
| **Webhooks** | Events appear in the System pane; nothing is delivered anywhere. | Signed delivery, at-least-once, consumer-side idempotency. |
| **Photo capture** | Tapping a slot marks it captured and fires a real attachment call with a simulated payload size. No camera opens. | Camera access and object storage with pre-signed uploads. |
| **Dashcam clip** | A reference string. There is no footage. | Video telematics integration. |
| **The map** | Hand-authored inline SVG. Schematic, not geographic — it says "we know where you are" without pretending to be a map. | Map tiles, which would break the no-network guarantee, so this stays schematic in the demo regardless. |
| **Roady, the chat path** | A fixed script, not a model. It asks the same six fields in a fixed order using the same buttons the form uses, and it writes the same draft through the same handlers. It does not read free text, does not interpret a sentence, and does not volunteer. Nothing here reasons. | A model, plus a decision about what happens when it misreads a driver at a roadside. The taps are not a placeholder for that: they are what makes an offline artifact safe to ship. |
| **Voice input** | Nothing. There was a mic button on every text field; it was removed. Speech recognition needs a network service, and a control that announces it cannot do the thing it depicts is worse than no control. | On-device speech recognition. |
| **SMS / push resume** | The payload is shown; nothing is sent. | A messaging provider. |
| **The other party's signature** | You can draw in the pad. Nobody is asked to consent to anything. | Nothing technical — this is a human problem, and the weakest link in the EAS flow. |
| **Authentication** | None. Single hardcoded driver. | Real auth, and a decision about whether drivers authenticate at all at the roadside. |
| **Storage** | `localStorage`. | IndexedDB plus a service worker for genuine offline durability. |

---

## Genuinely working

Not simulated — these actually execute, and they are what the demo is for.

- **Idempotency.** Client-generated UUIDs, a real server-side key ledger. Triple-tap produces `201` then two `200 idempotent replay`, and one incident.
- **Accept-then-forward.** Flip *TPA down* mid-flow: the driver's screens do not change, the queue retries with visible backoff, and toggling back drains it on screen.
- **Offline behaviour.** The full flow completes with no connectivity. The reference is generated on the device. Attachments queue separately from field data. Sync replays with the idempotency key and the server returns the *same* incident.
- **Coverage disputes.** A failed check flags for review and raises a task. The driver's screen is byte-for-byte identical.
- **The completeness model.** Score, blocking set and `required_next` are computed from the draft. The driver's remaining list and the fleet manager's chase list read the same array — neither is hardcoded.
- **Perishability ordering.** Computed per scenario, with the scenario able to override the default half-life ranking. Theft promotes the police reference above photographs, because no German insurer progresses a theft claim without a crime reference and there is no damage to photograph.
- **Duplicate matching.** Real haversine distance and time-window arithmetic. The simulated phone-call report genuinely computes to 480 m and 19 minutes, which is why it lands in human review rather than auto-merging.
- **Deceleration figures.** Computed from the fixture route points, not stored as text. 62 → 0 km/h in 15 s, peak 10.3 m/s² = 1.05 g, against Mapon's documented 3.4 m/s threshold.
- **The EAS export.** Both columns, tick-box grid, point of impact, sketch, both signature blocks, print-to-PDF. Structurally faithful enough that a European handler would recognise it.
- **The state machine.** Real transitions, including `information_required` as a bidirectional state rather than a terminal one.

---

## Honest limitations

Things that are neither faked nor finished.

- **Latency is invented.** Response times are simulated at roughly 40–120 ms. Real numbers depend on a TPA round-trip nobody has measured.
- **The fixtures are one vehicle, one driver, three scenarios.** Enough to demonstrate branching; not enough to test at fleet scale.
- **No accessibility audit.** Contrast is verified programmatically and touch targets meet the 56px minimum, but there has been no screen-reader testing.
- **No usability testing.** Every UX claim in this repo is reasoning, not evidence. The perishability ordering in particular is a hypothesis that wants testing against real capture rates.
- **German-centric.** Green Card handling, cross-border jurisdiction and multi-country policy schedules are acknowledged in the docs and absent from the code.
- **Translations now cover every driver screen, but they are not a translator's.** All five languages carry the whole driver flow: the cold open, the six, both intake paths, every gap-fill screen, the correction editors, the Back bar, the perishability windows and reasons, and the driver's own copy. Dates follow the language too, formatted at render from an ISO value rather than baked in at seed time. `tests/rules.mjs` walks all fourteen screens in each language, in two scenarios, and fails on English reaching the phone. What that does *not* buy is quality: these are a developer's translations, checked for register and the *du / tu / je* second person, and **not reviewed by anyone who speaks the language natively**. German and Polish would matter most in the field and are exactly where a clumsy phrase is least visible to me. Assume the meaning is right and the idiom is not. Design notes, the demo chrome and the fleet and system panes stay English by policy — they are read by whoever is reviewing the build, not by a driver.

---

## Why this document exists

A demo that hides its seams invites the wrong questions in the room — people
spend their attention working out what is real instead of arguing with the
product decisions. Naming the seams up front makes the rest of it trustworthy,
and the honest gaps are usually the most interesting part of the conversation
anyway.

The crash-detection gap is the clearest example: it is a limitation of the
partner API, it is the reason the dismissal path is designed the way it is, and
it is more interesting than anything that works.
