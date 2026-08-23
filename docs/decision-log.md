# Decision log

Twelve decisions behind the prototype, each with what would change my mind.

That last column is the point of the document. A decision you can't argue
against is one you haven't thought about, and a founding role means being wrong
in public occasionally and correcting fast. Where a call is mine rather than an
industry standard, it says so.

---

## 1. Anchor on the European Accident Statement, don't invent a schema

**Decision.** The circumstance capture is the EAS — *constat amiable*,
*Europäischer Unfallbericht* — with its fixed seventeen statements, two
symmetrical columns, point-of-impact marker and both signatures. ACORD's claims
standards are the carrier-exchange mapping target, shown alongside the JSON
export.

**Why.** Three reasons, in order of weight:

1. **It is legally careful in a way a bespoke form is not.** The EAS is
   deliberately built to record *agreed facts without either party admitting
   liability*. That property is load-bearing and it took the industry decades to
   settle on.
2. **Every European handler reads it without training.** The other party's
   insurer receives something they recognise, so nobody transcribes anything —
   and transcription at the liability stage is where money leaks.
3. **Both drivers fill in the same list in their own language.** A Polish driver
   in Germany and a German counterparty tick the same seventeen numbered
   statements.

**What would change my mind.** If the book is overwhelmingly single-vehicle
— glass, animal strike, kerb damage — the EAS section is dead weight on most
reports and I would demote it to a conditional branch rather than a core
structure. The scenario picker in the prototype already shows that shape: the
glass flow never renders it.

**Cost if wrong.** Low. The EAS is a section, not the spine. Removing it costs a
screen; adding it later costs a screen plus a migration of everything captured in
the meantime.

---

## 2. Six fields block submission. Exactly six

**Decision.** Vehicle, date and time, location, incident type, anyone injured,
vehicle drivable. Nothing else can prevent a report being filed.

**Why.** There is a genuine tension here and it is worth stating both sides.
Incomplete first capture is the documented root cause of downstream failure —
every gap becomes an outbound re-contact, which adds days and erodes trust
exactly when the customer is judging whether the premium was worth it.

But the person filling this in is on a hard shoulder, possibly at night,
possibly shaken, possibly not a native speaker, and does not know what an excess
is. **An abandoned FNOL is strictly worse than an incomplete one.** An incomplete
report still starts the clock, still dispatches recovery, still gives the driver
something to hand a police officer.

Six fields verify coverage, set an initial reserve band, route the claim and
dispatch recovery. That is enough to be useful. Everything else is chased.

**What would change my mind.** Data. If abandonment is already near zero and
re-contact rate is the dominant cost, the balance shifts and I would test adding
a seventh — probably third-party registration, since it is the one that blocks
subrogation entirely. I would test it, not assume it.

**Cost if wrong.** Moderate and *asymmetric*, which is why it is set here. Too
few blocking fields costs re-contacts. Too many costs abandoned reports, and an
abandoned report is invisible — you cannot measure the claim that never arrived.

---

## 3. Order the form by perishability, not by logical grouping

**Decision.** After the blocking six, everything is ordered by how fast it
disappears. Witness contact first, then the other party's plate, then
photographs, then the EAS, then police reference, then cargo, then their
insurer.

**This is my recommendation, not an industry standard.** Present it as reasoning,
not as received practice.

**Why.** Most FNOL forms are ordered by logical grouping: your details, their
details, the incident, the vehicle. That ordering optimises for whoever drew the
schema.

Half-life is the property that actually matters at the roadside. An independent
witness is under zero obligation to stay and is an unreachable stranger ten
minutes later. The other party's insurer is derivable from their plate through
the central register — chaseable for weeks. So the witness is first and the
insurer is last, *even though the insurer feels more important*.

The last thing captured is the first thing lost, and contested liability is
decided on exactly these items.

**What would change my mind.** If witness capture rate stays near zero regardless
of position, the ordering is not buying anything and the screen should be
ordered by whatever drivers actually complete. The prototype instruments this —
perishable-field capture rate is the metric that would tell us.

**Cost if wrong.** Low to reorder. High if never tried: you cannot recover a
witness retrospectively, so a form that asks late has already lost them.

---

## 4. Accept, persist, acknowledge — then forward

**Decision.** The driver submits to us. We persist, issue a reference and
acknowledge. Forwarding to the TPA happens afterwards, asynchronously, behind
exponential backoff. **A partner outage never produces an error for the driver.**

**Why.** The driver is standing on a motorway. A spinner is not an acceptable
outcome and neither is a failure message that means "try again later" to someone
who cannot.

This is the standard event-driven intake pattern — a queue between the intake
API and downstream workers — but it matters more than usual here because of who
is waiting.

**What would change my mind.** Nothing about the driver-facing half. If the TPA
required synchronous registration to issue *their* claim id, I would still
acknowledge locally first and reconcile the ids afterwards.

**Cost if wrong.** Severe if inverted. Coupling intake to partner uptime means
every partner incident becomes a customer incident, at the single worst moment
in the customer relationship.

---

## 5. We issue the claim reference, not the TPA

**Decision.** `INS-DE-YYYY-NNNNNN`, in a format we own, generated locally and
returned within a second. Offline it is generated on the device with no round
trip at all.

**Why.** This looks technical and is actually commercial. The reference is what
the driver reads out to a police officer and hands to the other party. If it can
only come back from the TPA, then **the TPA's uptime is the driver's problem and
we have outsourced our own moment of truth.**

**What would change my mind.** A hard regulatory or contractual requirement that
the TPA's reference is the canonical one. Even then I would issue ours
immediately and carry theirs as a secondary id.

**Cost if wrong.** Two references in circulation and a reconciliation job. Worth
it.

---

## 6. Never auto-reject at intake on a failed coverage check

**Decision.** A vehicle that is not on the policy schedule still gets an
incident, a reference and a recovery dispatch. `coverage_status` becomes
`disputed`, a human review task is raised, and **the driver's screen is
identical.**

**Why.** Two reasons, one legal and one operational, and the operational one is
stronger.

Legally: an automated adverse decision on an individual is Art. 22 territory —
it needs human involvement and a right to contest.

Operationally: **schedule data is stale more often than drivers are dishonest.**
A vehicle added last week and not yet synced is far more likely than fraud. A
coverage dispute is not the driver's problem while they are standing on a hard
shoulder, and rejecting them there is both a customer disaster and usually
wrong.

**What would change my mind.** Evidence of systematic abuse — the same
unscheduled vehicle reporting repeatedly. That is a fraud-screening problem
handled behind the scenes, not a reason to reject at the roadside.

**Cost if wrong.** Low. A small number of incidents opened that should not have
been, each caught by the human review they were flagged for.

---

## 7. Injury presence, never injury description

**Decision.** Capture whether anyone is hurt, a severity band, and whether
emergency services attended. **No free-text injury description anywhere in the
API.** The field is shown in the UI, greyed, with the reason stated inline.

**Why.** Injury presence is the most important triage field in the whole form —
it switches the claim from short-tail to long-tail and changes reserving, legal
exposure and timescale. Roughly 2% of claims drive ~20% of indemnity and injury
presence is the main early flag. So the *presence* question is mandatory.

The *description* is GDPR Art. 9 special-category health data, needing a higher
legal basis. Collecting a diagnosis through a driver's phone on a hard shoulder
is a compliance problem nobody needs — and a shaken driver is not a reliable
source for someone else's medical details anyway. The loss adjuster gathers it
later, under a proper basis, from the person it belongs to.

Presence plus band plus emergency-attended is everything the reserve and the
notification actually need.

**What would change my mind.** Nothing on the legal basis. If claims operations
need finer granularity, I would extend the *band*, not open free text.

**Cost if wrong.** Near zero. The band is extensible; free text collected without
a basis is not retractable.

---

## 8. No field asks whose fault it was

**Decision.** Not hidden, not optional — **absent**. And annotated as absent, in
the UI and in the schema, so it reads as a decision rather than an oversight.

**Why.** An admission of liability from an employee at the roadside, captured in
your own system, is a liability you created and it is worth money to the other
side. The EAS is deliberately designed to avoid exactly this. Liability is
determined later by people whose job it is, on facts rather than on a shaken
driver's guess.

The annotation matters as much as the omission. **Restraint nobody notices buys
you nothing** — in a review, a missing field reads as an oversight and a visible
refusal reads as judgement.

**What would change my mind.** Nothing.

**Cost if wrong.** None. There is no scenario in which capturing this helps us.

---

## 9. Duplicate matching on (vehicle, time window, radius)

**Decision.** Match on that tuple. Exact matches merge automatically;
near-matches go to a human review queue.

**Why.** One collision routinely produces three notifications: the telematics
detection, the driver's app report, and the fleet manager telephoning the TPA.
Possibly a fourth from the other party's insurer.

Get this wrong and you have duplicate reserves inflating the loss ratio and a
fleet manager who thinks you cannot count. It is a non-obvious consequence of
multi-channel intake and it is normally discovered in production rather than in
design.

**What would change my mind.** The window and radius are guesses that need
calibrating against real data — ±15 minutes and 500 m are starting points, not
findings. If merge rate or false-merge rate says otherwise, they move.

**Cost if wrong.** Merging too eagerly is worse than merging too little. Two
records can be combined later; one record wrongly combined has lost information
that may matter to liability. So the bias is toward the human queue.

---

## 10. Driver linkage as a purpose-limited association

**Decision.** Claim data attaches to the incident, the policy and the vehicle.
Linkage to a *driver* is modelled as a separate association with its own access
controls, retention policy and access-request path — not as a field on a
monolithic driver profile.

**Why.** These look similar and are not. A driver is the data subject but not
the customer: no contract with us, no direct benefit from the monitoring.
Employee consent is not a valid basis given the power imbalance, so it is
legitimate interests plus a documented assessment — and a works agreement in
Germany.

If a behavioural score materially affects the individual — screening them out,
cancelling cover on their vehicle — that is Art. 22 territory again.

Retention differs too: incident evidence must survive a long-tail liability
claim; a driver's behavioural score arguably should not.

**It costs almost nothing at design time and is very expensive to retrofit.**

**What would change my mind.** Nothing. This is cheap insurance against an
expensive mistake.

**Cost if wrong.** Asymmetric, which is the whole argument. Building it and not
needing it costs a join. Needing it and not having it means unpicking a
production data model under regulatory pressure.

---

## 11. Offline-first is mandatory, not a nice-to-have

**Decision.** The full flow completes with no connectivity. State persists on
every keystroke, the reference is generated on the device, attachments queue
separately from field data, and sync replays with the idempotency key so
duplicates are impossible.

**Why.** Tunnels, ferries, rural Poland, dead phone. **If the product only works
with a signal, it doesn't work** — and it will fail precisely in the remote
places where a driver is most stranded and least able to try again later.

Attachments queue separately because the report is a few kilobytes and the
photographs are not. The driver gets a reference immediately rather than waiting
behind an upload.

**What would change my mind.** Nothing.

**Cost if wrong.** Total, in exactly the situations that matter most.

---

## 12. False-positive dismissal is a first-class path

**Decision.** "Not an incident — report something else" sits in the same visual
weight class as the other two options, completes in two taps, asks no
confirmation, and creates no claim, no reserve and no notification. The reason
chip is captured as training data.

**Why.** Potholes, kerb strikes and hard braking will create detections that are
not claims. This will be the loudest early problem and the fastest way to lose
driver trust. **If dismissal is buried, drivers stop opening the app — and then
you lose the true positives too.**

The dismissal is itself data: without the reason, the detection threshold never
improves.

The label matters as well. Plain "dismiss" quietly swallows real reports — a
driver whose load shifted *does* want to report something, just not a collision.

**What would change my mind.** If dismissal rate is very low, the detection is
better calibrated than expected and the button could be demoted. I would not
remove it.

**Cost if wrong.** Burying it is expensive and the damage is invisible: drivers
who stop opening the app do not tell you.

---

## Related

- [Field spec](field-spec.md) — every field, its requirement level and its half-life
- [`openapi.yaml`](../openapi.yaml) — the contract these decisions produce
- [What's faked](whats-faked.md) — where the demo stops and reality would start
