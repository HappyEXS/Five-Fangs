import { render } from 'preact';
import { App } from './App.tsx';
import './styles.css';

export function mountUi(root: HTMLElement): void {
  render(<App />, root);
}
