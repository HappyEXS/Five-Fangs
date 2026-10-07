// Kaisarix, generał Akronixów: wysoki grzebień włosów, wielka wystrzępiona peleryna, stalowe
// naramienniki i topór o płomienistym ostrzu. Za plecami niesie drzewce z kulą w koronie
// (na szkicu autora korona stoi nad kulą po lewej stronie postaci) i proporcem szczepu.
import { BONE, type PartCanvas, RAG_HARD, RUST, STEEL } from '../kit.ts';
import { bandHead, emblem, slimTorso, wrapFore, wrapShin, wrapThigh, wrapUpper } from './body.ts';
import { BAND, CLOTH, OLD_GOLD, WOOD } from './palette.ts';
import { flameHalberd } from './weapons.ts';

/** Drzewce za plecami: proporzec, kula i korona na szczycie. */
function standard(c: PartCanvas): void {
  c.form(c.line(-5, -4, -9.4, -36.4, 0.8), WOOD, { rag: RAG_HARD });
  const flag = c.form(
    c.poly([
      [-9, -33.6],
      [-17.6, -32.4],
      [-15, -29.4],
      [-18.4, -26.6],
      [-15.4, -23.6],
      [-17.4, -20.4],
      [-7.4, -22],
    ]),
    BAND,
    { rag: 0.6, shadow: 0.6 },
  );
  c.patches(flag, BAND.shade, 0.25, 2.2, 0.8);
  emblem(c, -12.4, -27.6, 2.6, BONE);
  const orb = c.form(c.dot(-9.8, -39.4, 2.9), OLD_GOLD, { rag: RAG_HARD, rim: 0.7 });
  c.patches(orb, OLD_GOLD.shade, 0.25, 1.6, 0.8);
  c.form(
    c.poly([
      [-13, -42],
      [-13.6, -47],
      [-11.6, -44.6],
      [-10, -48],
      [-8.4, -44.6],
      [-6.4, -47],
      [-7, -42],
    ]),
    OLD_GOLD,
    { rag: RAG_HARD, rim: 0.7 },
  );
}

function armour(c: PartCanvas): void {
  // Naramienniki z kolcem i napierśnik ze znakiem szczepu.
  for (const [x, y, r] of [
    [-2.6, -19.6, 4.2],
    [1.6, -19.4, 5.6],
  ] as const) {
    const plate = c.form(c.oval(x, y, r, r * 0.55), STEEL, { rag: RAG_HARD, rim: 0.7 });
    c.patches(plate, RUST, 0.25, 1.8, 0.85);
  }
  c.ink(c.horn(2, -21.6, 4.6, -26, 1.2, 0.2), STEEL.light, STEEL.dark);
  const chest = c.form(c.box(0.6, -12.4, 3.9, 4, 1.2), STEEL, { rag: RAG_HARD, rim: 0.6 });
  c.patches(chest, RUST, 0.22, 1.8, 0.85);
  emblem(c, 0.8, -12.4, 2.3, BAND.light);
  c.form(c.box(0.2, -4.2, 4.4, 1.6, 0.5), BAND, { rag: RAG_HARD, shadow: 0.5 });
  c.form(c.horn(2.6, -3.4, 4.2, 5.4, 1.5, 0.5), BAND, { rag: 0.4, shadow: 0.5 });
}

export function kaisarixParts(): Record<string, PartCanvas> {
  return {
    thigh: wrapThigh(CLOTH, 1.15),
    shin: wrapShin(CLOTH, 1.15, true),
    torso: slimTorso({
      cloak: 'grand',
      salt: 107,
      bounds: [-21, -51, 11, 14],
      behind: standard,
      over: armour,
    }),
    upper: wrapUpper(CLOTH, 1.15),
    fore: wrapFore(CLOTH, STEEL, 1.15, STEEL),
    head: bandHead({ hair: 'crest', band: true, mouth: 'line', salt: 117 }),
    weapon: flameHalberd(),
  };
}
