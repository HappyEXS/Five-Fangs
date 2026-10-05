// Pociski bestii. Lecą w prawo, pivot w środku, jak strzała.
import { union } from '../raster.ts';
import { BONE, type PartCanvas, partCanvas } from './kit.ts';

const INK = '#26150f';

/** Kieł wypluwany przez Batfanga. */
function fang(): PartCanvas {
  const c = partCanvas(-9, -4, 9, 4);
  c.fill(c.horn(-8, 0, -1, 0, 0.3, 1.2), '#ffffff', 0.35);
  c.ink(c.arc([-3, -0.6], [3, -2.2], [8, 0.6], 2.2, 0.25), BONE, INK);
  return c;
}

/** Kolec Spikera: kościany, z ciemnym czubkiem. */
function spike(): PartCanvas {
  const c = partCanvas(-12, -3, 12, 3);
  c.ink(c.horn(-9.5, 0, 10, 0, 1.7, 0.2), BONE, INK);
  c.fill(c.horn(4, 0, 10, 0, 0.6, 0.1), '#5b3a1c');
  return c;
}

/** Kula ognia Ignitixa z ogonem płomienia. */
function fireball(): PartCanvas {
  const c = partCanvas(-14, -7, 10, 7);
  const flame = union(
    c.dot(2.5, 0, 5.4),
    c.horn(1, -1.5, -11.5, -3.6, 4, 0.3),
    c.horn(1, 1.2, -10, 3.4, 4, 0.3),
    c.horn(1, 0, -12.5, 0, 4.4, 0.4),
  );
  c.ink(flame, '#f26a1b', '#7a1f0a');
  c.fill(union(c.dot(3, 0, 3.6), c.horn(2, 0, -7, 0, 2.8, 0.3)), '#ffd166');
  c.fill(c.dot(3.6, -0.2, 1.7), '#fff6d8');
  return c;
}

export function beastFx(): Record<string, PartCanvas> {
  return { fang: fang(), spike: spike(), fireball: fireball() };
}
