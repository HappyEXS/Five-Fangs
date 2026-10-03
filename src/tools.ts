// Wejście narzędzi deweloperskich (ADR 0010). Serwowane tylko przez `pnpm dev` pod /tools.html;
// build produkcyjny ma jedno wejście (index.html), więc ten kod nie trafia do dist/.
//
//   /tools.html              piaskownica walki
//   /tools.html?view=atlas   podgląd atlasu postaci i jego wariantów
//   /tools.html?view=perf    pomiar czasu klatki i alokacji renderera
//   /tools.html?view=anim    edytor animacji
import { DEV_TOOLS_MARKER } from './core/dev-markers.ts';
import { startAnimEditor } from './tools/anim/editor.tsx';
import { startAtlasPreview } from './tools/atlas-preview.ts';
import { startPerf } from './tools/perf.ts';
import { startSandbox } from './tools/sandbox.tsx';
import './ui/styles/base.css';
import './ui/styles/components.css';
import './tools/tools.css';

const stage = document.getElementById('stage');
const canvas = document.getElementById('game');
const ui = document.getElementById('ui');

if (stage === null || !(canvas instanceof HTMLCanvasElement) || ui === null) {
  throw new Error('tools.html is missing #stage, #game or #ui');
}

// Znacznik, po którym `pnpm check:dist` wykryłby ten kod w buildzie produkcyjnym.
document.documentElement.dataset.tools = DEV_TOOLS_MARKER;

const view = new URLSearchParams(location.search).get('view');
if (view === 'atlas') {
  void startAtlasPreview(stage, canvas);
} else if (view === 'anim') {
  void startAnimEditor(stage, canvas, ui);
} else if (view === 'perf') {
  void startPerf(stage, canvas, ui);
} else {
  void startSandbox(stage, canvas, ui);
}
