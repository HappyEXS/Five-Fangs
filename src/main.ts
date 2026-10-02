// Wejście gry.
import { startApp } from './game/app.ts';
import { mountUi } from './ui/mount.tsx';

const stage = document.getElementById('stage');
const canvas = document.getElementById('game');
const ui = document.getElementById('ui');

if (stage === null || !(canvas instanceof HTMLCanvasElement) || ui === null) {
  throw new Error('index.html is missing #stage, #game or #ui');
}

const app = startApp(stage, canvas);
mountUi(ui, app);
