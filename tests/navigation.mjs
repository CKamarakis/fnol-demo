/**
 * Back-navigation history.
 *
 * Mirrors the Store.set/back logic from src/core/store.js. A driver who taps
 * the wrong thing must always be able to correct it — the one exception being
 * the 112 screen, where a Back button above a safety instruction is the wrong
 * affordance.
 *
 *   node tests/navigation.mjs
 */
const St = {
  s: { screen: 's0', navStack: [] },
  save() {}, emit() {},
  set(patch) {
    if (patch && patch.screen && patch.screen !== this.s.screen && !patch.__noHist) {
      if (patch.screen === 's0') this.s.navStack = [];
      else if (!TRANSIENT.includes(this.s.screen)) {
        this.s.navStack = [...this.s.navStack, this.s.screen];
      }
    }
    if (patch) delete patch.__noHist;
    Object.assign(this.s, patch); this.save(); this.emit();
  },
  back() {
    const st = [...this.s.navStack];
    const prev = st.pop();
    if (prev == null) return;
    this.s.navStack = st;
    this.set({ screen: prev, __noHist: true });
  },
};

/** Screens the driver passes through rather than navigates to. */
const TRANSIENT = ['emg'];
const NO_BACK = ['s0', ...TRANSIENT];
const backVisible = () => !NO_BACK.includes(St.s.screen) && St.s.navStack.length > 0;

let failed = 0;
const is = (got, want, msg) => {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a !== b) { console.error(`FAIL  ${msg}\n      got ${a}\n      want ${b}`); failed++; }
  else console.log(`pass  ${msg}`);
};

// a mistap on screen two must be correctable
St.set({ screen: 's1' });
is(backVisible(), true, 'back is visible on screen 2');
is(St.s.navStack, ['s0'], 'cold open is on the stack');
St.back();
is(St.s.screen, 's0', 'back from s1 returns to the cold open');

// deep in the optional flow
St.set({ screen: 's1' }); St.set({ screen: 's2' });
St.set({ screen: 'gaps' }); St.set({ screen: 'witness' });
is(St.s.navStack, ['s0', 's1', 's2', 'gaps'], 'full trail recorded');
St.back(); is(St.s.screen, 'gaps', 'unwinds one step');
St.back(); St.back(); is(St.s.screen, 's1', 'unwinds to s1');
St.back(); is(St.s.screen, 's0', 'reaches the root');
is(backVisible(), false, 'hidden at the root — nothing behind it');
St.back(); is(St.s.screen, 's0', 'back on an empty stack is a no-op');

// safety: never offer Back above a 112 instruction
St.set({ screen: 'emg' });
is(backVisible(), false, 'hidden on the emergency screen');

// The injury route passes THROUGH 112 on the way to the six questions, so
// Back from there must reach the cold open. Landing on a safety instruction
// the driver already dismissed is both confusing and slightly alarming.
St.set({ screen: 's0' });
St.set({ screen: 'emg' });
is(St.s.navStack, ['s0'], 'entering 112 records the cold open');
St.set({ screen: 's1' });
is(St.s.navStack, ['s0'], 'leaving 112 does not record it');
is(backVisible(), true, 'back is offered after the safety route');
St.back();
is(St.s.screen, 's0', 'back from the six questions reaches the cold open, not 112');

// going forward again after going back must re-push, or Back gets stuck
St.set({ screen: 's0' }); St.set({ screen: 's1' }); St.set({ screen: 's2' });
St.back(); St.set({ screen: 'photos' });
is(St.s.navStack, ['s0', 's1'], 'forward after back re-pushes');

// returning to the cold open resets the trail
St.set({ screen: 's0' }); is(St.s.navStack, [], 'entering s0 resets history');

// hygiene
St.set({ screen: 's1' }); St.set({ screen: 's1' });
is(St.s.navStack, ['s0'], 'no self-push on a same-screen set');
const before = [...St.s.navStack];
St.set({ lang: 'de' });
is(St.s.navStack, before, 'a non-screen patch leaves history alone');
is(St.s.__noHist, undefined, '__noHist is never persisted into state');

console.log(failed ? `\n${failed} failure(s)` : '\nall navigation assertions passed');
process.exit(failed ? 1 : 0);
