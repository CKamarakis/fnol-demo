import { createRoot } from 'react-dom/client';
import { App, Chrome } from './App.jsx';
import './core/actions.jsx';   // registers the delegated event listeners
import './boot.js';            // restores persisted state, starts the heartbeat

/* Two roots: the demo harness bar, and the product below it. Keeping them
   separate is deliberate — the chrome is scaffolding and must never be
   mistaken for the thing being demonstrated. */
createRoot(document.getElementById('chrome')).render(<Chrome />);
createRoot(document.getElementById('root')).render(<App />);
