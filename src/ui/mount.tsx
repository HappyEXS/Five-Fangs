import { render } from 'preact';
import type { RunningApp } from '../game/app.ts';
import { App } from './App.tsx';
import { installPaper } from './paper.ts';
// Kolejność ma znaczenie: tokeny i czcionki, wspólne rekwizyty, potem ekrany.
import './styles/base.css';
import './styles/components.css';
import './styles/map.css';
import './styles/squad.css';
import './styles/runes.css';
import './styles/screens.css';
import './styles/dialogs.css';
import './styles/gate.css';

export function mountUi(root: HTMLElement, app: RunningApp): void {
  installPaper(document.documentElement);
  render(<App game={app.game} stage={app.stage} />, root);
}
