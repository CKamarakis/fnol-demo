/* Injected into a throwaway copy of the built artifact by tests/capture.mjs.
   Runs inside the real page, in real Chrome, and reports one line into the DOM
   for the runner to read out of --dump-dom. Never shipped. */
(function () {
  var out = function (msg) {
    var pre = document.createElement('pre');
    pre.id = 'probe-result';
    // Assembled, never written literally: the probe's own source appears in
    // --dump-dom, and a literal marker here matches before the real result.
    pre.textContent = ['PROBE', 'RESULT'].join('_') + ':' + msg;
    document.body.appendChild(pre);
  };

  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  (async function () {
    try {
      await wait(700);

      var slot = document.querySelector('[data-act="shoot"][data-v="wide"]');
      if (!slot) return out('FAIL no slot rendered');

      // A real photograph, at a real camera's aspect and size.
      var c = document.createElement('canvas');
      c.width = 1200; c.height = 900;
      var g = c.getContext('2d');
      g.fillStyle = '#3a6ea5'; g.fillRect(0, 0, 1200, 900);
      g.fillStyle = '#ffcc00'; g.fillRect(300, 200, 600, 500);
      var blob = await new Promise(function (r) { c.toBlob(r, 'image/jpeg', 0.9); });
      if (!blob) return out('FAIL could not build a test image');
      var file = new File([blob], 'scene.jpg', { type: 'image/jpeg' });

      // Headless cannot open a file picker, so intercept the click on the input
      // the handler creates and deliver the file as a camera would.
      var realClick = HTMLInputElement.prototype.click;
      var seen = null;
      HTMLInputElement.prototype.click = function () {
        if (this.type === 'file') {
          seen = this;
          var dt = new DataTransfer();
          dt.items.add(file);
          this.files = dt.files;
          this.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
        return realClick.call(this);
      };

      slot.click();
      HTMLInputElement.prototype.click = realClick;
      if (!seen) return out('FAIL handler never created a file input');
      if (seen.accept.indexOf('image') < 0) return out('FAIL input does not accept images');
      if (seen.getAttribute('capture') !== 'environment') return out('FAIL no rear-camera capture hint');

      await wait(1200);

      var img = document.querySelector('.pslot .pthumb');
      if (!img) return out('FAIL thumbnail not rendered into the slot');
      if (img.src.slice(0, 11) !== 'data:image/') return out('FAIL rendered src is not a data url');

      var raw = localStorage.getItem('fnol.demo.v1');
      var st = JSON.parse(raw).draft.photos.wide;
      if (!st) return out('FAIL nothing reached the store');
      if (st.skipped) return out('FAIL recorded as skipped');
      if (!st.kb || st.kb < 1) return out('FAIL no byte count: ' + st.kb);
      if (st.thumb) return out('FAIL pixels were persisted to localStorage');
      if (raw.length > 400000) return out('FAIL storage payload too large: ' + raw.length);

      if (!/1 of 2 covered/.test(document.body.textContent)) return out('FAIL counter did not update');

      /* --- a second frame of the SAME named thing --- */
      var add = document.querySelector('[data-act="add-photo"][data-v="wide"]');
      if (!add) return out('FAIL no "add another" on the captured slot');

      var blob2 = await new Promise(function (r) { c.toBlob(r, 'image/jpeg', 0.8); });
      var file2 = new File([blob2], 'scene-2.jpg', { type: 'image/jpeg' });
      HTMLInputElement.prototype.click = function () {
        if (this.type === 'file') {
          if (!this.multiple) { seen = 'notmultiple'; return; }
          var dt2 = new DataTransfer();
          dt2.items.add(file2);
          this.files = dt2.files;
          this.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
        return realClick.call(this);
      };
      add.click();
      HTMLInputElement.prototype.click = realClick;
      if (seen === 'notmultiple') return out('FAIL add-another does not allow several at once');

      await wait(1200);

      var raw2 = localStorage.getItem('fnol.demo.v1');
      var st2 = JSON.parse(raw2).draft.photos.wide;
      if (!st2.extra || st2.extra.length !== 1) {
        return out('FAIL extra frame not recorded: ' + JSON.stringify(st2.extra));
      }
      if (st2.extra[0].thumb) return out('FAIL extra pixels were persisted');
      if (!st2.extra[0].kb) return out('FAIL extra frame has no byte count');
      // The lead image must survive an add — adding is not retaking.
      if (!document.querySelector('.pslot .pthumb')) return out('FAIL lead image lost on add');
      if (!document.querySelector('.pextra-item img')) return out('FAIL extra thumbnail not rendered');
      // The count badge tells the driver the slot holds more than one.
      var badge = document.querySelector('.pslot .pcount');
      if (!badge || badge.textContent.trim() !== '2') {
        return out('FAIL slot does not show 2 frames: ' + (badge && badge.textContent));
      }
      // Named things covered stays 1 — extras are not new categories.
      if (!/1 of 2 covered/.test(document.body.textContent)) {
        return out('FAIL extras wrongly counted as another slot covered');
      }

      out('PASS kb=' + st.kb + ' extra=' + st2.extra.length
        + ' rendered=' + img.src.length + 'B storage=' + raw2.length + 'B');
    } catch (e) {
      out('FAIL threw: ' + (e && e.message));
    }
  })();
})();
