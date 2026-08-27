---
name: copy
description: Write, review or fix any string a driver reads — labels, buttons, toasts, placeholders, the language packs, and the text blocks on a screen. Use whenever driver-facing copy is created or changed, or when asked to check the voice. Enforces the seven voice rules and runs tests/copy.mjs.
---

# Driver-facing copy

Every string a driver reads at a roadside obeys seven rules. They are stated
here in full, and `tests/copy.mjs` enforces them so they cannot quietly drift.

## The seven rules

### 1. No em dash, no en dash

Never `—` or `–` in a driver-facing string. It is the tell of generated prose
and it reads as filler where a decision should be.

A sentence that reaches for one wants something else:

| Instead of | Write |
|---|---|
| `No signal — you can keep going.` | `No signal. You can keep going.` |
| `Yes — ADR load` | `Yes, an ADR load` |
| `Photographs — 3 of 5 covered` | `Photographs · 3 of 5 covered` |
| `Skip — I'll do this later` | `Skip, I'll do this later` |

Full stop when the second half is its own statement. Comma when it is a
continuation. Middot (`·`) when it separates a label from a count or a code,
which is the separator this project already uses.

**The one exception:** a bare `'—'` alone in quotes is the empty-value glyph
in a summary row (`Vehicle: —`). That is typography, not prose, and the test
exempts it.

### 2. Lean

No label past **18 words**. No explaining the same thing twice. If a label
needs a second clause to make sense, the first clause is wrong.

The limit is generous on purpose. It catches an explanation that grew, not a
sentence someone thought about.

### 3. Formal but friendly, and directing

The screen directs. It does not petition, apologise, or cheer.

- No "please" (or *bitte*). It softens an instruction into a request the
  driver can decline, on a screen whose job is to direct.
- No "sorry". State the fact.
- No "are you sure?". Make it undoable instead — this is already the working
  agreement.
- No exclamation marks. Nobody at a roadside wants cheering.

Friendly comes from brevity and from not blaming: skipping is fine and is
recorded as a known gap, never framed as failure.

### 4. Second person singular

The driver is **you**. Never "the driver", never the passive where an
instruction is meant.

- English: *you*.
- German: **du**, not *Sie*. Dutch: **je**, not *u*. French: **tu**.
- "The other driver" is a third party and is exempt.

The flow addresses one person standing beside a truck, not an office.

### 5. The driver is on our side

Never strict, never chasing. The person reading this just had a collision and
is reporting it at all — they are doing us a favour, not answering to us.

- No "we will chase this", "you must", "required", "failure to".
- No scolding: "don't forget", "make sure you".
- Only the six blocking fields block, and they say so themselves. Everything
  else is skippable and says *that* instead.

State what **we** do, not what the driver owes:

| Instead of | Write |
|---|---|
| `We'll chase the rest.` | `We can find the rest from it.` |
| `we will chase this one hard` | `add the number whenever you have it` |
| `You must provide this` | `You can continue without it` |

### 6. A yes/no question needs no accompanying text

Two buttons and a question are self-explanatory. A paragraph under them is
either restating the question or apologising for asking it, and it pushes the
next control off the screen.

Text conditional on an **answer** is fine — that is new information the driver
asked for by answering, not a preamble. `{d.hazardous === true && (...)}` is
exactly right.

### 7. Question every text block

For each block on a screen, ask: **does the driver act differently for having
read it?** If not, delete it. If it survives, it belongs somewhere specific:

| What it does | Where it goes |
|---|---|
| Explains what to do on this screen | the **subtitle** (`sub:`) |
| Argues why the product is built this way | a `dn()` **design note** |
| Tells the driver why it is worth doing *now* | the `why:` in `PERISHABLE` |
| Nothing the driver can act on | deleted |

A block that survives says one thing **once**. Worked example, from the photos
screen:

> ~~Tap a slot to open the camera. The silhouette shows what to frame. Add as
> many as you need. **Skipping one is fine and is logged**, a skipped slot is a
> known gap where an unnamed pile of photos is not.~~

Three faults. "Tap a slot to open the camera" is the instruction for the whole
screen, so it is the subtitle. Everything after "skipping one is fine" defends
the *design* to a reader evaluating the product — that is a design note, not
driver copy. What is left is two sentences:

> The silhouette shows what to frame. Add as many as you need.
> **Skipping one is fine.**

Explanatory cards are also where jargon hides. `Why this is here, in this
position:` was about our ordering, which is our concern; `Why now:` is the
driver's. Same for the reasons themselves — "highest value per character typed
in the entire form" is an argument about form design, not a reason to write
down a phone number.

## Scope

These rules cover **driver-facing strings only**:

- `src/screens/driver/`
- `src/components/DriverShell.jsx`, `src/components/Choice.jsx`
- `src/data/domain.js` — all five language packs
- `src/core/actions.jsx` — the toasts
- `src/boot.js`

**Exempt, deliberately:**

- Code comments.
- `dn()` design notes and the hoisted `*_NOTE` / `*_DN` consts. They are the
  product argument, addressed to whoever is reading the source or watching the
  demo, and they quote the wording they argue against.
- The demo chrome (`components/Chrome.jsx`, the DEMO timer rail, the
  failure-theatre toasts). It talks *about* the driver to the person running
  the demo. It is styled unlike the product for the same reason it is allowed
  a different voice.
- `ACORD_MAP` / `ACORD_OMITTED` and `logAdd()` meta — the audit tables and the
  System-pane trace, read by a handler.

## How to run this

```bash
node tests/copy.mjs     # the four rules, on their own
npm test                # the whole suite, copy.mjs included
npm run verify          # build, then test — before committing
```

`tests/copy.mjs` is picked up automatically by `tests/run.mjs`, so it is part
of `npm test` and `npm run verify` already.

## When writing new copy

1. Draft it, then read it back as if you were standing on a hard shoulder.
2. Check it against the four rules above.
3. Run `node tests/copy.mjs`.
4. If you add a screen, add its strings to all five language packs in
   `src/data/domain.js` — the rules apply to every language, not just English.

## When the test flags something

Fix the copy, not the test. The exemption lists in `tests/copy.mjs` exist for
prose that genuinely is not driver-facing; widening one to let a real string
through defeats the point. If a string is genuinely demo-harness copy that the
scanner has misfiled, say so rather than editing the exemption silently.

## Anti-patterns this replaces

All of these shipped before the rules existed:

- **A dash standing in for a decision.** `paused — window left open` was two
  facts glued together because neither had been chosen as the main one.
- **Formal address in DE/NL.** *Sie* and *u* were the original translations.
  They are correct German and Dutch, and they are wrong here: the flow speaks
  to one driver, not to a company.
- **Chasing the driver.** `we will chase this one hard` and `We'll chase the
  rest` both made the driver the party being pursued, on a screen they opened
  voluntarily.
- **The same fact three times.** The other-insurer screen said "last on the
  list on purpose" as a subtitle, "genuinely optional, skip it without a
  second thought" as a Note, and the perishability reason underneath. One
  fact, three blocks, none of them telling the driver what to type.
- **A card defending the design to the driver.** Anything of the form "X is
  better than Y because…" is a design note. The driver is not choosing between
  X and Y; they are standing next to a damaged truck.
