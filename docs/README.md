# Documentation

Private study project. No partner API was contacted; every downstream response
in the prototype is simulated. Start with [what's faked](whats-faked.md) if you
want to know where the demo stops and reality would begin.

## Read in this order

| Document | What it covers |
| --- | --- |
| [Decision log](decision-log.md) | Twelve decisions, each with **what would change my mind**. The core document — it shows the reasoning, not just the result. |
| [Field spec](field-spec.md) | Every field, its requirement level, and how fast it perishes. The half-life column is what drives the whole form order. |
| [`openapi.yaml`](../openapi.yaml) | The contract, checkable. `tests/contract.mjs` asserts it matches the implementation rather than drifting from it. |
| [Metrics](metrics.md) | Nine numbers, each tied to a euro consequence. Plus the three I would instrument in week one. |
| [Open questions](open-questions.md) | What I would need from the insurer and the partners — and the risks I would raise before being asked. |
| [What's faked](whats-faked.md) | Every simulation named, alongside the shorter list of what genuinely works. |

## The short version

Six fields block submission and nothing else does, because an abandoned FNOL is
worse than an incomplete one. Everything after them is ordered by **how fast it
disappears** rather than by logical grouping — witness contact is gone in ten
minutes, the other party's insurer can be chased next week.

The circumstances section is the European Accident Statement rather than a
schema we invented, because it records agreed facts without either party
admitting liability and every European handler already reads it.

No field anywhere asks whose fault it was.

The driver's submission never depends on a partner being reachable: accept,
persist, acknowledge, then forward asynchronously. The claim reference is issued
by us within a second, and offline it is generated on the device.

A failed coverage check is flagged for human review, never rejected at the
roadside.
