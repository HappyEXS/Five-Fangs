import { render } from 'preact';
import type { RunningApp } from '../game/app.ts';
import { App } from './App.tsx';
import './styles.css';

export function mountUi(root: HTMLElement, app: RunningApp): void {
  render(<App game={app.game} stage={app.stage} />, root);
}
