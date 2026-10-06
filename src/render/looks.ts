// Wygląd jednostki z treści gry rozwiązany do struktur renderera: skompilowane rigi i `UnitLook`
// (rig, postawa, klipy). Wspólne dla renderera walki i miniaturek postaci.
import type { UnitVisual } from '../content/compile.ts';
import type { RawRig } from '../content/schema-rig.ts';
import type { UnitLook } from './animation.ts';
import type { Atlas, Sprite } from './atlas.ts';
import { type CompiledRig, compileRig } from './rig.ts';

export interface RenderAssets {
  readonly atlas: Atlas;
  readonly rigs: ReadonlyMap<string, RawRig>;
}

export interface CompiledRigs {
  readonly byId: ReadonlyMap<string, CompiledRig>;
  /** Największa liczba kości i kanałów pozy wśród rigów: rozmiary buforów sceny. */
  readonly maxBones: number;
  readonly maxChannels: number;
}

export function compileRigs(raw: ReadonlyMap<string, RawRig>): CompiledRigs {
  const byId = new Map<string, CompiledRig>();
  let maxBones = 1;
  let maxChannels = 1;
  for (const [id, source] of raw) {
    const rig = compileRig(source);
    byId.set(id, rig);
    maxBones = Math.max(maxBones, rig.boneCount);
    maxChannels = Math.max(maxChannels, rig.channelCount);
  }
  return { byId, maxBones, maxChannels };
}

/** Rig, postawa i klipy jednostki. Rzuca, gdy treść odwołuje się do czegoś, czego rig nie ma. */
export function resolveLook(rigs: CompiledRigs, visual: UnitVisual): UnitLook {
  const rig = rigs.byId.get(visual.rig);
  if (rig === undefined) throw new Error(`Unknown rig "${visual.rig}"`);
  const rest = rig.stances.get(visual.stance);
  const idle = rig.clips.get('idle');
  const walk = rig.clips.get('walk');
  const attack = rig.clips.get(visual.attackClip);
  if (rest === undefined || idle === undefined || walk === undefined || attack === undefined) {
    throw new Error(`Rig "${visual.rig}" is missing clips or stance for skin "${visual.skin}"`);
  }
  return {
    rig,
    rest,
    idle,
    walk,
    attack,
    scale: rig.scale * visual.scale,
    string: rig.strings.get(visual.stance) ?? null,
  };
}

/** Części skórki dla kolejnych kości rigu; null, gdy atlas nie ma danej części. */
export function skinParts(atlas: Atlas, rig: CompiledRig, skin: string): (Sprite | null)[] {
  return rig.sprites.map((part) => atlas.sprites.get(`${skin}/${part}`) ?? null);
}
