// Podgląd postaci w edytorze animacji: ta sama ścieżka rysowania co w walce
// (sampleClip → macierze kości → drawRigParts), bez symulacji.
import type { RawRig } from '../../content/schema-rig.ts';
import type { UnitLook } from '../../render/animation.ts';
import type { Atlas } from '../../render/atlas.ts';
import { drawBackground } from '../../render/background.ts';
import { GROUND_Y } from '../../render/camera.ts';
import { sampleClip } from '../../render/clips.ts';
import { debugOptions } from '../../render/debug.ts';
import { drawRigParts, drawString } from '../../render/draw-rig.ts';
import { compileRig, computeBoneMatrices, rootMatrix } from '../../render/rig.ts';
import { createScene, type Scene } from '../../render/scene.ts';
import type { Viewport } from '../../render/viewport.ts';

/** Powiększenie postaci względem jej rozmiaru w walce. */
const ZOOM = 3;
/** Środek postaci i poziom stóp na scenie: lewa część, którą panel zostawia odsłoniętą. */
const FEET_X = 300;
const FEET_Y = GROUND_Y + 60;

export interface PreviewInput {
  readonly rig: RawRig;
  readonly skin: string;
  readonly stance: string;
  readonly clipName: string;
  readonly time: number;
  readonly pivots: boolean;
}

export interface RigPreview {
  draw(viewport: Viewport, input: PreviewInput): void;
}

/** Skórki z atlasu, które mają sprite dla każdej części rigu. */
export function skinsFor(atlas: Atlas, rig: RawRig): string[] {
  const parts = new Set(rig.bones.map((bone) => bone.sprite));
  const skins = new Set<string>();
  for (const name of atlas.sprites.keys()) {
    const slash = name.indexOf('/');
    if (slash > 0) skins.add(name.slice(0, slash));
  }
  return [...skins]
    .filter((skin) => [...parts].every((part) => atlas.sprites.has(`${skin}/${part}`)))
    .sort();
}

export function createRigPreview(ctx: CanvasRenderingContext2D, atlas: Atlas): RigPreview {
  // Rig jest kompilowany ponownie tylko po zmianie danych (klip, skórka, postawa), nie co klatkę.
  let source: RawRig | null = null;
  let sourceSkin = '';
  let sourceStance = '';
  let sourceClip = '';
  let scene: Scene | null = null;
  let look: UnitLook | null = null;

  function prepare(input: PreviewInput): void {
    const rig = compileRig(input.rig);
    const clip = rig.clips.get(input.clipName);
    const rest = rig.stances.get(input.stance) ?? new Float32Array(rig.channelCount);
    scene = createScene(ctx, atlas, rig.boneCount, rig.channelCount);
    look =
      clip === undefined
        ? null
        : {
            rig,
            rest,
            idle: clip,
            walk: clip,
            attack: clip,
            scale: rig.scale * ZOOM,
            string: rig.strings.get(input.stance) ?? null,
          };
    rig.sprites.forEach((part, bone) => {
      if (scene !== null)
        scene.boneSprites[bone] = atlas.sprites.get(`${input.skin}/${part}`) ?? null;
    });
    scene.projectileSprites[0] = atlas.sprites.get('fx/arrow') ?? null;
    source = input.rig;
    sourceSkin = input.skin;
    sourceStance = input.stance;
    sourceClip = input.clipName;
  }

  return {
    draw(viewport, input) {
      if (
        input.rig !== source ||
        input.skin !== sourceSkin ||
        input.stance !== sourceStance ||
        input.clipName !== sourceClip
      ) {
        prepare(input);
      }
      drawBackground(ctx, viewport);
      if (scene === null || look === null) return;
      const { rig, scale } = look;
      const { pose } = scene.animator;

      sampleClip(look.attack, input.time, look.rest, pose, 0);
      const bob = pose[rig.boneCount] ?? 0;
      const dx = pose[rig.boneCount + 1] ?? 0;
      rootMatrix(scene.root, FEET_X, FEET_Y, 0, scale, scale, dx, bob - rig.hipHeight);
      computeBoneMatrices(rig, pose, 0, scene.root, scene.matrices, 0);

      debugOptions.pivots = input.pivots;
      drawRigParts(scene, 0, look, viewport, false);
      const { string } = look;
      if (string !== null) {
        const pulled =
          string.clip === look.attack && input.time >= string.from && input.time <= string.to;
        drawString(scene, look, string, 0, pulled, viewport);
      }
      ctx.setTransform(viewport.scale, 0, 0, viewport.scale, 0, 0);
    },
  };
}
