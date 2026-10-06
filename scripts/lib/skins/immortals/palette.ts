// Kolory szczepu Immortals: stare, ściemniałe złoto (kolor szczepu ze szkicu autora), popielata
// tkanina szat, sadza kapturów i blade światło aureoli.
import type { Palette } from '../kit.ts';

const INK = '#130f08';

export const GOLD = { main: '#8c6f2e', shade: '#523f17', light: '#c0a252', dark: INK };
export const ASH = { main: '#8a8370', shade: '#544d3d', light: '#b2aa92', dark: INK };
export const SOOT = { main: '#2a2420', shade: '#15110f', light: '#4c4239', dark: '#0a0705' };
/** Pióra: brudna biel z ciemnymi końcami. */
export const FEATHER = { main: '#958d77', shade: '#5a5343', light: '#b9b19a', dark: INK };
/** Porcelana masek i bielmo oka. */
export const PORCELAIN = { main: '#bdb6a0', shade: '#857e6a', light: '#dcd6c1', dark: INK };
/** Światło aureoli i oczu. */
export const HALO = '#ffe9a6';

export function immortal(base: typeof GOLD, accent: string, glow: string = HALO): Palette {
  return { ...base, accent, glow };
}
