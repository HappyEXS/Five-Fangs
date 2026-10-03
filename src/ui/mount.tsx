import { render } from 'preact';
import type { RunningApp } from '../game/app.ts';
import { App } from './App.tsx';
// Kolejność ma znaczenie: tokeny i czcionki, wspólne rekwizyty, potem ekrany.
import './styles/base.css';
import './styles/components.css';
import './styles/map.css';
import './styles/squad.css';
import './styles/screens.css';
import './styles/dialogs.css';

export function mountUi(root: HTMLElement, app: RunningApp): void {
  render(<App game={app.game} stage={app.stage} />, root);
}
