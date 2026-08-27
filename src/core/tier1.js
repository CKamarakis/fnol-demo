/* ==================================================================
   §4 TIER 1 READINESS — what "six are answered" means, in one place
   ==================================================================

   There are two ways through the blocking six: the form (S1Tier1.jsx) and the
   chat (Chat.jsx). They render nothing alike and share no markup, but they must
   agree exactly on whether the report can be submitted — a driver who answers
   six questions in the chat and is told two are missing, or worse is allowed to
   submit five, is reading a bug in the only part of the product that blocks.

   These predicates were inline in S1Tier1.jsx. Copying them into the chat is
   the obvious move and the wrong one: the copy drifts on the first change and
   nothing fails until a driver is standing on a hard shoulder. So both screens
   call these, and a change to the rule happens once. */

/**
 * "Yes, someone is hurt" is not an answer on its own — it is the start of one.
 *
 * Which party decides whether this is also a liability notification, and the
 * band decides the reserve; a bare yes leaves the handler phoning back for
 * both, which is the call this product exists to avoid. "No one" stays a single
 * tap, because the common case must not get slower to protect the rare one.
 *
 * This is a completeness rule for ONE of the six, not a seventh blocking field.
 */
export function injuryAnswered(d) {
  return d.injured === false
    || (d.injured === true
        && (d.injuredParties || []).length > 0
        && (d.injurySeverity || []).length > 0);
}

/** All six settled. For a theft, `drivable` arrives derived rather than asked. */
export function tier1Ready(d) {
  return !!(d.vehicleConfirmed && d.timeConfirmed && d.locationConfirmed
    && d.typeConfirmed && injuryAnswered(d) && d.drivable !== null);
}

/**
 * How many of the six the DRIVER has settled.
 *
 * Counts answers, not pre-filled values: counting what arrived from the truck
 * opened the screen at "5 of 6" and told a driver they had completed five
 * things before touching anything.
 */
export function tier1Answered(d) {
  return [
    d.vehicleConfirmed,
    d.timeConfirmed,
    d.locationConfirmed,
    d.typeConfirmed,
    injuryAnswered(d),
    d.drivable !== null,
  ].filter(Boolean).length;
}
