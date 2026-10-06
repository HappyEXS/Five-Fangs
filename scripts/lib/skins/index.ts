// Skórki czterech szczepów na szkielecie humanoid, według szkiców autora gry. Każda ma komplet
// części rigu (udo, goleń, tułów, ramię, przedramię, głowa, broń) we własnych rozmiarach
// i z własnymi pivotami. Id skórki równa się id jednostki.
import type { PlaceholderSprite } from '../part-spec.ts';
import { batfangParts } from './beasts/batfang.ts';
import { ignitixParts } from './beasts/ignitix.ts';
import { ironbeakParts } from './beasts/ironbeak.ts';
import { monstrosityParts } from './beasts/monstrosity.ts';
import { reaperParts } from './beasts/reaper.ts';
import { spikerParts } from './beasts/spiker.ts';
import { tuskovatorParts } from './beasts/tuskovator.ts';
import { skinFx } from './fx.ts';
import { cardinalParts } from './immortals/cardinal.ts';
import { enigmatixParts } from './immortals/enigmatix.ts';
import { guardianParts } from './immortals/guardian-of-hell.ts';
import { orbParts } from './immortals/orb.ts';
import { polarisParts } from './immortals/polaris.ts';
import { ultimusParts } from './immortals/ultimus.ts';
import { xartixParts } from './immortals/xartix.ts';
import type { PartCanvas } from './kit.ts';
import { bushSkin, sproutSkin } from './plants/bush.ts';
import { iceIvyParts } from './plants/ice-ivy.ts';
import { ivyParts } from './plants/ivy.ts';
import { motherTreeParts } from './plants/mother-tree.ts';
import { oakWarriorParts } from './plants/oak-warrior.ts';
import { toxicIvyParts } from './plants/toxic-ivy.ts';
import { trunkParts } from './plants/trunk.ts';
import { axBotParts } from './robots/ax-bot.ts';
import { botParts } from './robots/bot.ts';
import { egzoBotParts } from './robots/egzo-bot.ts';
import { holoBotParts } from './robots/holo-bot.ts';
import { thermobotParts } from './robots/thermobot.ts';
import { titanBotParts } from './robots/titan-bot.ts';
import { whirlBotParts } from './robots/whirl-bot.ts';

type Parts = () => Record<string, PartCanvas>;

/** Skórki szczepów w kolejności drzew ewolucji. */
const TRIBES: Readonly<Record<string, readonly (readonly [string, Parts])[]>> = {
  beasts: [
    ['monstrosity', monstrosityParts],
    ['batfang', batfangParts],
    ['reaper', reaperParts],
    ['spiker', spikerParts],
    ['ironbeak', ironbeakParts],
    ['tuskovator', tuskovatorParts],
    ['ignitix', ignitixParts],
  ],
  immortals: [
    ['orb', orbParts],
    ['cardinal', cardinalParts],
    ['guardian_of_hell', guardianParts],
    ['polaris', polarisParts],
    ['ultimus', ultimusParts],
    ['xartix', xartixParts],
    ['enigmatix', enigmatixParts],
  ],
  plants: [
    ['bush', bushSkin],
    ['trunk', trunkParts],
    ['ivy', ivyParts],
    ['oak_warrior', oakWarriorParts],
    ['mother_tree', motherTreeParts],
    ['ice_ivy', iceIvyParts],
    ['toxic_ivy', toxicIvyParts],
    ['sprout', sproutSkin],
  ],
  robots: [
    ['bot', botParts],
    ['egzo_bot', egzoBotParts],
    ['holo_bot', holoBotParts],
    ['thermobot', thermobotParts],
    ['ax_bot', axBotParts],
    ['whirl_bot', whirlBotParts],
    ['titan_bot', titanBotParts],
  ],
};

/** Id skórek per szczep, w kolejności drzewa ewolucji. */
export const TRIBE_SKINS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  Object.entries(TRIBES).map(([tribe, skins]) => [tribe, skins.map(([id]) => id)]),
);

export function tribeSprites(): PlaceholderSprite[] {
  const sprites: PlaceholderSprite[] = [];
  for (const skins of Object.values(TRIBES)) {
    for (const [id, parts] of skins) {
      for (const [slot, canvas] of Object.entries(parts())) {
        sprites.push({ name: `${id}/${slot}`, part: canvas.part, image: canvas.image });
      }
    }
  }
  for (const [name, canvas] of Object.entries(skinFx())) {
    sprites.push({ name: `fx/${name}`, part: canvas.part, image: canvas.image });
  }
  return sprites;
}
