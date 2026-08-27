import { I } from '../../core/utils.js';
import { T } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.jsx';
import { svgForm, svgRoady } from '../../components/svg.js';

/* ---------- S0-CHOICE — form or chat, before the six ---------- */

const MODE_NOTE =
  'Two presentations of the <b>same six fields</b>. Not two products: both write the same draft keys ' +
  'through the same handlers, and the record that reaches the handler is byte-identical either way. ' +
  '<code>tests/rules.mjs</code> runs both paths with the same answers and fails if the drafts differ.' +
  '<br><br>' +
  'The choice is offered because the preference is <b>real and not predictable from the persona</b>. ' +
  'A form is faster for someone who wants to see the whole shape and answer out of order; one ' +
  'question at a time is easier when you are shaken, standing on a hard shoulder, and cannot hold ' +
  'six things in your head. Guessing which applies to a given driver on a given day is exactly the ' +
  'kind of assumption this prototype exists to stop making.' +
  '<br><br>' +
  'It costs one tap on the fastest path. That is the honest price, and it is why the choice sits ' +
  '<b>here</b> rather than in a settings screen nobody opens.';

const ROADY_NOTE =
  '<b style="color:#546b62">Roady is a script, not a model.</b> Constraint 1 forbids every network ' +
  'primitive in this file, so there is nothing to call and nothing that could reason. The questions ' +
  'are the same six, asked in a fixed order, with the same buttons the form uses.' +
  '<br><br>' +
  'So it does not free-type, does not interpret a sentence, and does not volunteer. A chat that ' +
  'guesses at what a driver typed guesses <i>wrong</i> at a roadside, and the cost of that lands on ' +
  'the person least able to absorb it. Taps are not a limitation being apologised for here. They ' +
  'are the reason this is safe to ship. See <code>docs/whats-faked.md</code>.';

/**
 * The fork.
 *
 * Deliberately in the product rather than in the demo chrome. A chrome toggle
 * would frame the two as alternatives being compared by whoever is watching;
 * put here, it is a choice the driver makes, which is what it would be.
 */
export function scrModeChoice() {
  const d = Store.s.draft;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="scroll">
        <div className="pad" style={{ paddingTop: '16px' }}>
          <h2 className="h2">{T('modeTitle')}</h2>
          <p className="sub" style={{ fontSize: '14.5px' }}>{T('modeSub')}</p>

          <div className="sp16" />

          {/* Not a Choice pair: these two do not select, they go. A tick box
              on a control that leaves the screen promises a state that never
              gets read back.

              Roady first. It is the one that needs explaining, and the
              qualifier sits on IT rather than on the form — "recommended for
              experienced drivers" on the fast path tells a driver who has just
              had a collision that the quick way is not for them, which is a
              judgement at the worst possible moment. Saying Roady is handy on a
              first report makes the same recommendation without grading the
              person reading it. */}
          <button className="mode-card" data-act="set-intake-mode" data-v="chat">
            <span className="mode-art" dangerouslySetInnerHTML={{ __html: svgRoady() }} />
            <span className="mode-body">
              <span className="mode-title">{T('modeChat')}</span>
              <span className="mode-sub">{T('modeChatSub')}</span>
            </span>
            <span className="mode-chev" dangerouslySetInnerHTML={{ __html: I.chev }} />
          </button>

          <button className="mode-card" data-act="set-intake-mode" data-v="form">
            <span className="mode-art" dangerouslySetInnerHTML={{ __html: svgForm() }} />
            <span className="mode-body">
              <span className="mode-title">{T('modeForm')}</span>
              <span className="mode-sub">{T('modeFormSub')}</span>
            </span>
            <span className="mode-chev" dangerouslySetInnerHTML={{ __html: I.chev }} />
          </button>

          {dn('One set of fields, two ways in', MODE_NOTE)}
          {dn('What Roady is, and is not', ROADY_NOTE)}

          <div className="sp28" />
        </div>
      </div>
    </div>
  );
}
