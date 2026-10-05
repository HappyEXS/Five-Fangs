// Skórki szczepu Beasts na szkielecie humanoid: siedem postaci według szkiców autora gry.
// Każda ma komplet części rigu (udo, goleń, tułów, ramię, przedramię, głowa, broń) we własnych
// rozmiarach i z własnymi pivotami.
import type { PlaceholderSprite } from '../part-spec.ts';
import { batfangParts } from './beasts/batfang.ts';
import { ignitixParts } from './beasts/ignitix.ts';
import { ironbeakParts } from './beasts/ironbeak.ts';
import { monstrosityParts } from './beasts/monstrosity.ts';
import { reaperParts } from './beasts/reaper.ts';
import { spikerParts } from './beasts/spiker.ts';
import { tuskovatorParts } from './beasts/tuskovator.ts';
import { beastFx } from './fx.ts';
import type { PartCanvas } from './kit.ts';

/** Skórki w kolejności drzewa ewolucji; id skórki równa się id jednostki. */
const BEASTS: readonly (readonly [string, () => Record<string, PartCanvas>])[] = [
  ['monstrosity', monstrosityParts],
  ['batfang', batfangParts],
  ['reaper', reaperParts],
  ['spiker', spikerParts],
  ['ironbeak', ironbeakParts],
  ['tuskovator', tuskovatorParts],
  ['ignitix', ignitixParts],
];

export const BEAST_SKINS: readonly string[] = BEASTS.map(([id]) => id);

export function beastSprites(): PlaceholderSprite[] {
  const sprites: PlaceholderSprite[] = [];
  for (const [id, parts] of BEASTS) {
    for (const [slot, canvas] of Object.entries(parts())) {
      sprites.push({ name: `${id}/${slot}`, part: canvas.part, image: canvas.image });
    }
  }
  for (const [name, canvas] of Object.entries(beastFx())) {
    sprites.push({ name: `fx/${name}`, part: canvas.part, image: canvas.image });
  }
  return sprites;
}
