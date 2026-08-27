# Field spec

Every field the product captures, what it is for, and — the column that drives
the whole design — **how fast it perishes**.

**Requirement levels.** **M** hard mandatory, blocks submission. **C**
conditionally mandatory, required before the claim progresses. **O** optional
but valuable. **A** attached automatically, never asked.

**Half-life** is how long the field remains obtainable after the incident. It is
the ordering principle for everything outside the blocking six, and it is my own
framing rather than an industry standard — see
[decision 3](decision-log.md#3-order-the-form-by-perishability-not-by-logical-grouping).

---

## Incident types

The answer to "what happened" is one value, because it routes the claim — one
cause, one cover section, one workflow. Presented alphabetically, since a
driver scanning a dropdown under pressure should not have to work out where a
category sits. `other` is pinned last: it is a fallback rather than a choice,
and selecting it asks what it actually was.

| Value | Label | Notes |
| --- | --- | --- |
| `animal` | Animal | |
| `cargo` | Cargo or load damage | Triggers CMR and cargo cover assessment. |
| `collision` | Collision with another vehicle | The only type that opens the EAS section and the third-party flow. |
| `fire` | Fire | |
| `glass` | Glass or windscreen | Below every telematics threshold, so it is always driver-initiated. |
| `single` | Single vehicle — no one else involved | |
| `spill` | Spill or leak | Potential environmental liability. |
| `theft` | Theft of the vehicle | Inverts the perishability order: the police reference is promoted above photographs, because no German insurer progresses a theft claim without one. |
| `vandalism` | Vandalism | |
| `weather` | Weather or flood | |
| `other` | Other | Requires `type_other` — a free-text field, because "other" alone produces a claim nobody can route. |

**Additional damage** (`also_damaged`) draws from the same list and repeats as
many times as needed. A collision that also breaks glass and shifts a load is
still one question — "what happened" — with an answer that takes three lines.
The list is unfiltered: a control whose options move depending on what is
already chosen is worse than one that permits an odd combination.

---

## Corrections

Telematics is wrong often enough — GPS drift, clock skew, the wrong unit on a
shared vehicle — that a driver must be able to fix a pre-filled value.

What matters is that a correction is a **recorded disagreement, not an
overwrite**:

| Field | Holds |
| --- | --- |
| `reported` | What the vehicle sent, kept whatever the driver does |
| `corrected` | Per field: the original value, the driver's value, and when |

**Date and time are two values, both stored.** `occurredAt` holds the time and
`occurredOn` the date (ACORD 2 · 21, date of loss). They are separate because
the driver may correct either half: an incident found at 00:20 keeps its time
and moves back a day. An earlier build stored only the time and rendered
`new Date()` beside it, so the date was never sent to the handler and was wrong
for any report filed after midnight or reopened later — which this artifact,
emailed and opened for months, does by design.

The row says so on screen — *"you corrected this · truck reported …"* — and the
handler sees both values and knows which came from where.

---

## `intakeMode` — how the six were answered, not what they were

| Field | Holds |
| --- | --- |
| `intakeMode` | `form`, `chat`, or unset before the driver has chosen |

A **presentation preference, not a claims field**. The six can be answered as
one scrolling form or one question at a time; both write the same draft keys
through the same handlers, and `tests/rules.mjs` runs both paths with identical
answers and fails if the resulting drafts differ by anything but this key.

It is recorded because it is the kind of thing worth knowing across a fleet —
if nobody ever picks one, that is an answer — and for no other reason. Nothing
downstream reads it, it is absent from `ACORD_MAP`, and it does not appear on
the export. Deliberately on the draft rather than in app state, so a report
reopened after a week resumes the way it was started.

---

## Tier 1 — the six that block

These, and only these, can prevent a report being filed. All six are answerable
in well under ninety seconds, and five of them are pre-filled from telematics so
the driver confirms rather than types.

| # | Field | Req | Half-life | Why it blocks |
| --- | --- | --- | --- | --- |
| 1 | **Vehicle** — registration or VIN | M | permanent | The most load-bearing field in the form. Decides whether this vehicle was on the schedule at the time of loss, and therefore whether cover exists at all. |
| 2 | **Date and time of incident** | M | permanent | Was the policy in force at that moment? Also starts the notification clock — France imposes a five-day deadline, and the gap between `occurred_at` and `received_at` is itself a leakage metric. |
| 3 | **Location** — coordinates and full address | M | permanent | Determines jurisdiction, applicable law, which branch handles it, whether a Green Card applies, and where to send recovery. The full road position matters: "A2 near Magdeburg" is not enough to find a truck. |
| 4 | **Incident type** | M | permanent | Drives which cover section responds and which workflow runs. Inferred from telematics where possible, one tap to correct. |
| 5 | **Anyone injured?** (yes/no) | M | permanent | The most important triage field in the whole form. Switches the claim from short-tail to long-tail and changes reserving, legal exposure, timescale and severity band. Roughly 2% of claims drive ~20% of indemnity, and injury presence is the main early flag. |
| 6 | **Vehicle drivable?** (yes/no) | M | permanent | The money field. Triggers recovery, storage and replacement-vehicle decisions — the credit hire clock starts here, and on a tractor unit that runs to hundreds of euros a day. |

Every one is permanent: none of them decays. That is not a coincidence — the
blocking set is chosen for *coverage and routing*, and the perishable material
is deliberately left to the unblocked flow where it can be captured without risk
of abandonment.

---

## Perishable — minutes

Ordered by half-life. This is the sequence the driver actually sees.

| Field | Req | Window | Why here |
| --- | --- | --- | --- |
| **Independent witness present?** | O, prominent | Gone in ~10 minutes | Highest value per character in the entire form. An independent witness routinely decides a contested liability case, and they are under **zero obligation to stay**. Asked first despite being optional. |
| Witness name and phone | C | Gone in ~10 minutes | A number with no name still works. The name field must never block getting the number. |
| **Other vehicle registration** | C→M | Gone when they drive off | **Without the plate you cannot subrogate.** If nothing else about the other party is captured, capture this. A German plate resolves to the keeper and, through the Zentralruf, to their insurer — which is why the insurer field sits at the bottom of this list rather than next to this one. |
| Scene photographs — guided set | O, guided | Gone once vehicles move | Not "upload photos". Five named slots: wide scene showing road layout, damage close-up, the other vehicle including its plate, signage and road markings, their documents. An open upload produces four pictures of the same bumper. |
| **EAS circumstances** — both columns | O | Gone when they leave | The seventeen tick-box statements, point of impact, sketch, both signatures. Requires the other driver's cooperation, which is the weak link — see below. |

## Perishable — hours to days

| Field | Req | Window | Why here |
| --- | --- | --- | --- |
| Police attended? | M | hours | One question while the officer is still there. |
| Police reference number | C→M | hours | Often decisive on liability. Retrievable next week with a phone call, which is why it sits below the witness — **except for theft**, where no German insurer progresses a claim without it and the scenario promotes it. |
| Citation, breath test, arrest | C | hours | Bears on liability and on policy exclusions. Also a fraud signal. |
| Cargo on board, type, value | C | today | Freight profile only. Triggers CMR and cargo cover assessment. Reachable afterwards from the CMR note and the TMS. |
| Load secure / spillage / **hazardous** | C | today | The one exception to its position: a hazardous (ADR) load is not a claims field at all, it is a safety escalation. If the vehicle profile flags ADR I would promote that single question into Tier 1. |
| Trailer registration | C | today | Trailers are often separately insured, and the 2021 Motor Insurance Directive creates direct-claim rules against a trailer's insurer. |
| **Their insurer and policy number** | C | Next week is fine | **The field every FNOL form puts near the top.** It feels essential and is the *least* perishable thing in the report — derivable from the plate, chaseable for weeks. Putting it early costs you the witness. This is the clearest illustration of what perishability ordering actually changes. |

---

## Injuries — handled deliberately

| Field | Req | Why |
| --- | --- | --- |
| Anyone injured? | M | Tier 1. See above. |
| Severity band — walking / needs help / serious | C | Enough to set a reserve band and route the claim. |
| Emergency services attended? | C | Corroborates severity without capturing any medical detail. |
| Injured party names and contact | C | Needed to progress the claim. |
| ~~Injury description~~ | **deliberately absent** | GDPR Art. 9 special-category health data. Shown in the UI, greyed, with the reason stated inline — a missing field reads as an oversight, a visible refusal reads as a decision. The loss adjuster gathers this later under a proper basis, from the person it belongs to. |

---

## Never captured

| Field | Why not |
| --- | --- |
| **Whose fault was it?** | Not hidden, not optional — **absent**, and annotated as absent in both the UI and the schema. An admission of liability from an employee at the roadside, captured in your own system, is a liability you created and it is worth money to the other side. The EAS is deliberately built to avoid exactly this. |

---

## Attached automatically

Never asked of the driver. This is the material advantage of a connected fleet:
the form is not blank when it opens.

| Field | Source | Notes |
| --- | --- | --- |
| Precise location and timestamp | Mapon `unit/list`, `alert/list` | Full address including road position. |
| Speed profile before the event | Mapon `route/list` | Computed into a deceleration figure, not stored as text. |
| Peak deceleration in m/s² and g | derived | Compared against Mapon's documented 3.4 m/s harsh-braking threshold. |
| Vehicle and driver identity | `unit/list`, tachograph card | |
| Odometer, engine hours, fuel level | CAN bus | |
| Gross weight and axle loads | CAN `weights` | |
| Trailer connection | `trailer_connections` | Answers the trailer question without asking it. |
| Ignition state | `ignition` | Part of the derived trigger. |
| Dashcam clip reference | video | Where the unit is fitted and online. |

**The honest caveat.** Mapon documents no crash-detection endpoint. The trigger
is *derived* — harsh braking, speed to zero, ignition off, no movement — and
carries a confidence score. See [what's faked](whats-faked.md) and the
"Telematics in" tab of the System pane.

---

## Known weak links

Worth naming, because they are where this design is most likely to disappoint in
production.

**The other party's cooperation.** Roughly half the value of the EAS section
depends on a stranger being willing to tick boxes and sign a phone screen.
Column B is fully skippable and the report remains valid without it — but the
outcome is materially worse and no amount of form design fixes that.

**Telematics false positives.** Potholes and kerb strikes will produce
detections that are not claims. The dismissal path exists for this and the
reason chips are the calibration signal.

**Photograph quality.** Named slots and silhouettes improve the odds
considerably. They do not guarantee a usable wide shot from someone with
adrenaline in their hands.

---

## Related

- [Decision log](decision-log.md) — the reasoning behind these levels and this ordering
- [`openapi.yaml`](../openapi.yaml) — the same fields as a checkable contract
