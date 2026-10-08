// Kolory szczepu Akronix: wrogowie w sadzy i czerni, z bladą skórą i ciemnoczerwoną przepaską
// na oczach (znak szczepu; na szkicu autora każda postać ma czarną opaskę z węzłem z tyłu głowy).
// Czerwień jest brudna i ciemna, jak zetlałe sukno: styl nie pokazuje krwi (ADR 0019).
import type { Palette } from '../kit.ts';

const INK = '#0a0708';

export type Tone = Pick<Palette, 'main' | 'shade' | 'light' | 'dark'>;

/** Sukno ubrań i peleryn: sadza z fioletowym odcieniem. */
export const CLOTH: Tone = { main: '#2f2732', shade: '#18131b', light: '#51445a', dark: INK };
/** Blada, popielata skóra. */
export const SKIN: Tone = { main: '#b3a791', shade: '#766c5b', light: '#d3c9b2', dark: INK };
/** Przepaska, szarfy i proporce. */
export const BAND: Tone = { main: '#6c2a25', shade: '#3c1513', light: '#95443a', dark: INK };
/** Skóra butów, pasów i karwaszy. */
export const LEATHER: Tone = { main: '#4b3727', shade: '#281b12', light: '#70543a', dark: INK };
/** Zmierzwione, czarne włosy. */
export const HAIR: Tone = { main: '#1c171b', shade: '#0d0a0c', light: '#3b3139', dark: '#040304' };
/** Ciemne drewno łuków i drzewc. */
export const WOOD: Tone = { main: '#3d2c1f', shade: '#21160e', light: '#5e452f', dark: INK };
/** Stare, matowe złoto korony generała. */
export const OLD_GOLD: Tone = { main: '#8a6c2c', shade: '#4f3c16', light: '#bb9a4c', dark: INK };
/** Skóra rogatej bestii Hornixa. */
export const HIDE: Tone = { main: '#5b4a40', shade: '#33261f', light: '#806b5c', dark: INK };
/** Żar w oczach widziany przez przepaskę. */
export const EMBER = '#ff8a4a';
/** Trucizna Poisonixa. */
export const VENOM = '#a9d44a';

export function akronix(base: Tone = CLOTH): Palette {
  return { ...base, accent: BAND.main, glow: EMBER };
}
