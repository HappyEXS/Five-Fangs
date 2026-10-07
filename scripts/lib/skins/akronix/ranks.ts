// Akronix, górny rząd szkicu autora: zwiadowcy (Bowix, Assasinix), żołnierze (Katanix, Defenix)
// i wojownik Poisonix. Chude sylwetki w czerni, łyse blade głowy z przepaską na oczach; postacie
// odróżnia broń, peleryna i to, co noszą na sobie.
import { intersect, union } from '../../raster.ts';
import { type PartCanvas, RAG_HARD, RUST, STEEL } from '../kit.ts';
import { bandHead, slimTorso, wrapFore, wrapShin, wrapThigh, wrapUpper } from './body.ts';
import { BAND, CLOTH, LEATHER, SKIN, VENOM, WOOD } from './palette.ts';
import { axe, crescentBow, dartGauntlet, flaskInHand, katana, pavise } from './weapons.ts';

/** Kołczan na plecach: skórzana tuleja i lotki strzał nad barkiem. */
function quiver(c: PartCanvas): void {
  for (const [x, y] of [
    [-9.4, -27.6],
    [-7.4, -28.4],
    [-5.6, -27.2],
  ] as const) {
    c.fill(c.line(-5.4, -17, x, y + 1.6, 0.3), WOOD.dark);
    c.form(c.horn(x + 0.4, y + 2.6, x, y, 1, 0.3), BAND, { rag: 0.3, shadow: 0.4 });
  }
  c.form(c.line(-2.6, -7.4, -6.6, -21, 2.3), LEATHER, { rag: RAG_HARD });
}

/** Bowix, zwiadowca: łucznik z kołczanem, bez peleryny. */
export function bowixParts(): Record<string, PartCanvas> {
  return {
    thigh: wrapThigh(CLOTH),
    shin: wrapShin(CLOTH),
    torso: slimTorso({
      cloak: 'none',
      strap: true,
      sash: true,
      salt: 101,
      bounds: [-17, -32, 10, 13],
      behind: quiver,
    }),
    upper: wrapUpper(CLOTH),
    fore: wrapFore(CLOTH, SKIN),
    head: bandHead({ hair: 'none', band: true, mouth: 'line', salt: 111 }),
    weapon: crescentBow(),
  };
}

/** Assasinix, zwiadowca: długa peleryna z wysokim kołnierzem, rękawica z wyrzutnią strzałek. */
export function assasinixParts(): Record<string, PartCanvas> {
  return {
    thigh: wrapThigh(CLOTH),
    shin: wrapShin(CLOTH),
    torso: slimTorso({
      cloak: 'long',
      sash: true,
      salt: 102,
      over: (c) => {
        // Kołnierz postawiony aż pod brodę.
        c.form(
          c.poly([
            [-4.6, -19],
            [-4, -25],
            [0, -22.6],
            [4.4, -24.4],
            [4.6, -19],
          ]),
          CLOTH,
          { rag: 0.4, rim: 0.4 },
        );
      },
    }),
    upper: wrapUpper(CLOTH),
    fore: wrapFore(CLOTH, LEATHER, 1, LEATHER),
    head: bandHead({ hair: 'none', band: true, mouth: 'line', salt: 112 }),
    weapon: dartGauntlet(),
  };
}

/** Katanix, żołnierz: bez peleryny, pochwa katany przy biodrze, włosy związane w węzeł. */
export function katanixParts(): Record<string, PartCanvas> {
  return {
    thigh: wrapThigh(CLOTH),
    shin: wrapShin(CLOTH),
    torso: slimTorso({
      cloak: 'none',
      sash: true,
      salt: 103,
      behind: (c) => {
        c.form(c.line(1, -4.4, -13, 1.6, 1.2), LEATHER, { rag: RAG_HARD });
        c.ink(c.dot(-13, 1.6, 1.3), STEEL.shade, STEEL.dark);
      },
      over: (c, inside) => {
        // Naramiennik z utwardzanej skóry na bliższym barku.
        c.form(c.oval(0.8, -19.6, 4.4, 2.3), LEATHER, { rag: RAG_HARD, rim: 0.5 });
        c.fill(intersect(inside, c.line(-3, -12, 3.4, -12.6, 0.3)), CLOTH.dark, 0.7);
      },
    }),
    upper: wrapUpper(CLOTH),
    fore: wrapFore(CLOTH, SKIN, 1, LEATHER),
    head: bandHead({ hair: 'topknot', band: true, mouth: 'line', salt: 113 }),
    weapon: katana(),
  };
}

/** Defenix, żołnierz: peleryna, stalowy naramiennik, topór i pawęż ze znakiem szczepu. */
export function defenixParts(): Record<string, PartCanvas> {
  return {
    thigh: wrapThigh(CLOTH, 1.1),
    shin: wrapShin(CLOTH, 1.1),
    torso: slimTorso({
      cloak: 'long',
      strap: true,
      salt: 104,
      over: (c) => {
        const plate = c.form(c.oval(0.6, -19.4, 5.2, 2.8), STEEL, { rag: RAG_HARD, rim: 0.7 });
        c.patches(plate, RUST, 0.25, 1.8, 0.85);
        c.form(c.box(0.2, -3.6, 4.2, 1.5, 0.5), LEATHER, { rag: RAG_HARD, shadow: 0.5 });
      },
    }),
    upper: wrapUpper(CLOTH, 1.1),
    fore: wrapFore(CLOTH, LEATHER, 1.1, STEEL),
    head: bandHead({ hair: 'none', band: true, mouth: 'line', salt: 114 }),
    weapon: axe(14, 1.8),
    offhand: pavise(),
  };
}

/** Poisonix, wojownik: zaczesane włosy, pas z fiolkami przez pierś, kolba z jadem w dłoni. */
export function poisonixParts(): Record<string, PartCanvas> {
  return {
    thigh: wrapThigh(CLOTH),
    shin: wrapShin(CLOTH),
    torso: slimTorso({
      cloak: 'short',
      strap: true,
      sash: true,
      salt: 105,
      over: (c) => {
        // Fiolki na pasie: szkło z odrobiną świecącego jadu.
        for (const [x, y] of [
          [-2.6, -16.4],
          [0, -12.8],
          [2.6, -9.4],
        ] as const) {
          c.ink(
            union(c.box(x, y, 0.9, 1.5, 0.4), c.box(x, y - 1.8, 0.5, 0.5, 0.1)),
            STEEL.light,
            STEEL.dark,
          );
          c.fill(c.box(x, y + 0.5, 0.5, 0.7, 0.2), VENOM);
        }
      },
    }),
    upper: wrapUpper(CLOTH),
    fore: wrapFore(CLOTH, LEATHER, 1, LEATHER),
    head: bandHead({ hair: 'swept', band: true, mouth: 'line', salt: 115 }),
    weapon: flaskInHand(),
  };
}
