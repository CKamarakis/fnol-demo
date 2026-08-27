# Open questions

What I would need to know before building this for real, and the risks I would
raise before being asked.

Each question says **what changes depending on the answer** — a question whose
answer changes nothing is not worth the meeting.

---

## Part 1 — questions I would ask

### Telematics and detection

**Does Mapon expose a crash or impact event, or only harsh-driving thresholds?**

The API documents harsh braking (>3.4 m/s), harsh acceleration and harsh
cornering (>0.37 g), plus CAN data, ignition state and an alert stream. Nothing
in it says *"this was a collision"*. The prototype therefore **derives** the
trigger and carries a confidence score.

*What changes:* if the device firmware exposes an accelerometer event, detection
gets materially better and one file changes. If it does not, the false-positive
rate is a permanent design constraint rather than a tuning problem, and the
dismissal path stays as prominent as it is.

**Is FNOL vehicle-triggered today, or driver-reported? What is the current
incident-to-notification latency?**

*What changes:* everything about the first screen. If it is driver-reported
today, the cold open is a new capability rather than a redesign, and the
latency number is the baseline the whole business case rests on.

**What is the split between fleet-manager-reported and driver-reported?**

*What changes:* which persona the product optimises for. The prototype assumes
driver-first with a fleet view alongside. If most reports arrive through
dispatch, that inverts.

### The TPA relationship

**Does the TPA expose an API for claim registration and status, or is it
file-based? What is the round-trip?**

*What changes:* whether the queue drains in seconds or overnight, and whether
status webhooks are possible at all or have to be polled from a file drop.

**Who issues the claim reference — us or them? Can we issue independently?**

*What changes:* this is the single most commercially loaded question in the
list. If the reference can only come back from the TPA, then their uptime is the
driver's problem and we have outsourced our own moment of truth. The prototype
assumes we issue it; if that is contractually impossible I would issue ours
anyway and carry theirs as a secondary id.

**How are duplicates handled today when telematics and the driver both report?**

*What changes:* whether duplicate reserves are already inflating the loss ratio.
This is usually discovered in production; asking early is cheap.

### Product and commercial

**Where does the business sit commercially — MGA, broker, carrier?**

*What changes:* who owns the reserve, and therefore what FNOL latency is
actually worth in euros. The entire metrics argument rests on this and I would
want it answered before committing to targets.

**Which countries first?**

*What changes:* cross-border freight makes language, jurisdiction and Green Card
handling day-one problems rather than phase-two ones. A German-only MVP hides
all three.

**Does a failed coverage check reject at intake today, or flag for review?**

*What changes:* if it rejects, that is both an Art. 22 exposure and an
operational error worth fixing before anything else in this document.

**What is the offline story — has anyone tested a tunnel or a dead-signal area?**

*What changes:* if offline is currently broken, that is the highest-value fix
available and it is invisible in every metric, because the reports that never
arrived are not in the data.

**Does the claim record link to a driver identity, and if so what is the
retention and access model?**

*What changes:* whether decision 10 is a design proposal or a retrofit. Cheap
now, expensive later.

---

## Part 2 — risks I would raise unprompted

Naming these is more credible than waiting to be asked, and each one is a
genuine threat to the thing working rather than a hedge.

### Telematics false positives will be the loudest early problem

Potholes, kerb strikes and hard braking will generate detections that are not
claims. This erodes driver trust faster than anything else in the system,
because a driver who stops believing the app stops opening it — and then the
true positives are lost too.

The dismissal path and its reason chips are the mitigation. They only work if
dismissal stays a first-class action.

### Auto-notification is a works-council question before it is a product one

A vehicle reporting its driver's crash without the driver acting is workplace
monitoring. In Germany that needs a **Betriebsvereinbarung** — the works council
signs off, not the product manager.

This is not a compliance footnote to handle later. It can block the feature
outright, and it should be started before the code is written rather than after.

### The other party's cooperation is the weakest link in the EAS flow

Roughly half the value of the circumstances section depends on a stranger
agreeing to tick boxes and sign a phone screen at the side of a road. No form
design fixes this.

The mitigation is graceful degradation: column B is fully skippable, the report
stays valid without it, and we are honest internally that the liability outcome
is materially worse when it is missing.

### Cross-border makes three problems day-one

Language, jurisdiction and Green Card handling. A German fleet running to Poland
and the Netherlands hits all three in the first month. The prototype handles
language and structure; jurisdiction routing and Green Card logic are absent.

### Driver-linked scoring is Art. 22 territory

If claim data feeds a behavioural score that a fleet operator uses for coaching
or discipline, and that score materially affects the individual, it needs human
involvement and a right to contest. Worth deciding deliberately rather than
arriving at by accident because the data was there.

### The 90-second claim is a hypothesis

The prototype demonstrates that the blocking path *can* be walked in ninety
seconds by someone who knows the app. It says nothing about a shaken driver in
the rain at night. **Every UX claim in this repo is reasoning, not evidence** —
the perishability ordering most of all.

The first thing I would want after shipping is capture-rate data by field
position, because that is the number that tells us whether the ordering was
worth the argument.

### Does the chat path actually help anyone?

The six can now be answered as a form or one question at a time. The argument
for the chat is that a shaken person on a hard shoulder should not have to hold
six things in their head at once. The argument against is concrete and unproven
either way:

- The form shows six rows and a counter. The chat shows **one question and a
  history you have to scroll to re-read**, and on a 390×844 phone the
  transcript runs past a screen by the injury turns.
- It **fixes the order**. Someone who already knows the truck is drivable and
  wants that recorded first cannot do it.
- It costs **one extra tap** on the fastest path, paid by every driver
  including the ones who would never have wanted it.

Building both is what makes the question askable, and it is not answerable from
this repo. The measurement is a split by `intakeMode`: completion rate,
time-to-reference, and correction rate on the four pre-filled fields — the last
being the one that matters, because a driver tapping through a transcript
without reading is the specific failure this path invites.

My own guess is that the chat wins on the injury branch and loses everywhere
else, which would argue for a hybrid nobody has designed yet. That guess is
worth exactly as much as the rest of the UX reasoning here.

---

## Related

- [Decision log](decision-log.md) — the calls these questions would revisit
- [What's faked](whats-faked.md) — the seams, named
