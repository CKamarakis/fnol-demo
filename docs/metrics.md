# Metrics

Nine numbers, each tied to a euro consequence rather than to a dashboard.

A metric that cannot be traced to money or to a decision is decoration. Where
the euro figure depends on the insurer's commercial position — MGA, broker or carrier
— that is flagged, because it changes who owns the reserve and therefore what
these are worth.

---

## The one that matters most

### FNOL latency — incident to notification

**Definition.** Wall-clock from `occurred_at` to `received_at`. Both are stored
separately for exactly this reason.

**Why it is first.** It is the highest-leverage number in claims and it
compounds into four separate costs:

- **Credit hire exposure.** A replacement tractor unit runs to hundreds of euros
  a day. Every hour before someone knows the vehicle is off the road is an hour
  the meter runs unmanaged — and once a credit hire company is engaged, you are
  negotiating rather than deciding.
- **Storage.** Charges begin at recovery and escalate. Late notification means
  the vehicle sits somewhere expensive before anyone chooses where.
- **Evidence quality.** Perishable material is gone within the hour. Latency
  here directly buys or loses contested liability cases.
- **Liability outcomes.** Knowing before the third party's solicitor does is a
  structural advantage. Telematics-triggered intake is the only way to get it.

**Target.** Detection to reference inside two minutes for auto-detected
incidents. The prototype's blocking path is designed to fit in ninety seconds of
that.

**Instrumented as.** `occurred_at`, `received_at`, `reference_latency_ms` on
every incident.

---

## Intake quality

### Completeness at first submission

**Definition.** The `completeness.score` at the moment `status` becomes
`notified`.

**Why.** Predicts re-contact rate and cycle time. A report that arrives complete
never generates an outbound call.

**Watch for.** This one is gameable. Raising it by adding blocking fields would
improve the number and damage the business — which is why it is read alongside
abandonment, never alone.

### Re-contact rate

**Definition.** Outbound contacts per claim to obtain information that could
have been captured at FNOL.

**Why.** The direct measure of intake quality, and the cost is not just the call
— it is days of cycle time and a customer who is being asked twice.

### Abandonment rate by field

**Definition.** Where drivers stop, by the last field reached.

**Why.** Tells you exactly which mandatory field is too expensive. This is the
metric that would justify moving something out of Tier 1.

**The hard part.** An abandoned report is invisible in claims data — you cannot
count the claim that never arrived. It has to be instrumented client-side or it
does not exist, and that is precisely why the blocking set is kept small on
principle rather than on evidence.

---

## The telematics advantage

### Auto-detected vs driver-reported ratio

**Definition.** Share of incidents where the record existed before the driver
opened the app.

**Why.** This is how much of the connected-fleet advantage is actually landing.
If it stays low, the product is a form with extra steps and the whole latency
argument evaporates.

### False-positive dismissal rate

**Definition.** Dismissals as a share of auto-detected events, split by reason
chip.

**Why.** The calibration signal for the detection threshold. Also an early
warning: a rising rate predicts drivers disengaging, and a driver who stops
opening the app costs you the true positives too.

**Caveat.** Since detection here is *derived* rather than received from the
partner, this number measures our inference, not Mapon's sensor. See
[open questions](open-questions.md).

---

## Downstream health

### Duplicate merge rate

**Definition.** Incidents merged as duplicates, as a share of all incidents.

**Why.** One collision routinely produces three notifications. Unmerged
duplicates mean **duplicate reserves inflating the loss ratio** — a number
underwriting is measured on, corrupted by an intake bug.

**Watch both directions.** A false merge is worse than a missed one: two records
can be combined later, but one wrongly combined has lost information that may
matter to liability.

### Perishable-field capture rate

**Definition.** Share of incidents capturing witness contact, third-party plate
and scene photographs — measured separately, since they perish at different
rates.

**Why.** The direct test of whether perishability ordering was worth the
argument. It is my recommendation rather than an industry standard, and this is
the number that would prove or kill it.

**Tie to money.** Witness presence routinely decides a contested liability case.
Plate absence blocks subrogation entirely.

### Time to reference issued

**Definition.** Request received to reference returned.

**Why.** Should be sub-second and **independent of any downstream system**. If
this number moves when the TPA is slow, accept-then-forward has been broken
somewhere and the driver is paying for a partner's outage.

**Target.** p99 under one second, including offline, where it is generated on
the device and the true figure is zero.

---

## What I would instrument in week one

In order, and stopping there:

1. **FNOL latency** — the baseline for every other argument, and you cannot
   improve what you have not measured.
2. **Time to reference issued** — cheap, and it verifies accept-then-forward is
   actually working rather than just designed.
3. **Abandonment by field** — client-side, because it is invisible everywhere
   else and it is the only check on the blocking set.

The rest can wait for volume. Three numbers that are trusted beat nine that are
approximate, and a dashboard nobody believes is worse than no dashboard.

---

## Related

- [Decision log](decision-log.md) — the calls these numbers would revisit
- [Open questions](open-questions.md) — including who owns the reserve, which
  sets what all of this is worth
