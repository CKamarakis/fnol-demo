/**
 * Entry point. The build resolves this module graph depth-first and
 * concatenates it into a single file, so the import order here is what
 * determines the order of the emitted bundle.
 */
import './core/dom.js';
import './data/domain.js';
import './core/store.js';
import './core/FakeApi.js';
import './components/svg.js';
import './components/Chrome.js';
import './components/DriverShell.js';
import './screens/driver/index.js';
import './screens/fleet/index.js';
import './screens/system/index.js';
import './screens/export/index.js';
import './core/render.js';
import './core/canvas.js';
import './core/actions.js';
import './boot.js';
