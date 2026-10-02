// Wejście narzędzi deweloperskich (ADR 0010). Serwowane tylko przez `pnpm dev` pod /tools.html;
// build produkcyjny ma jedno wejście (index.html), więc ten kod nie trafia do dist/.
import { DEV_TOOLS_MARKER } from './core/dev-markers.ts';
import { startSandbox } from './tools/sandbox.ts';
import './ui/styles.css';

const stage = document.getElementById('stage');
const canvas = document.getElementById('game');
const ui = document.getElementById('ui');

if (stage === null || !(canvas instanceof HTMLCanvasElement) || ui === null) {
  throw new Error('tools.html is missing #stage, #game or #ui');
}

// Znacznik, po którym `pnpm check:dist` wykryłby ten kod w buildzie produkcyjnym.
document.documentElement.dataset.tools = DEV_TOOLS_MARKER;
startSandbox(stage, canvas, ui);
