// Rig wycinankowy (ADR 0004): hierarchia kości skompilowana do tablic typowanych
// i ręcznie liczone macierze afiniczne, 6 wartości na kość, bez alokacji i bez DOMMatrix.
import type { RawRig } from '../content/schema-rig.ts';
import { type CompiledClip, compileClip } from './clips.ts';

/** Liczba wartości macierzy afinicznej: a, b, c, d, e, f jak w `ctx.setTransform`. */
export const MATRIX_SIZE = 6;

export interface CompiledRig {
  readonly id: string;
  readonly boneCount: number;
  readonly boneIds: readonly string[];
  /**
   * Liczba kanałów pozy: kąty kości (radiany), potem `bob` i `dx` korzenia (jednostki rigu).
   * Indeksy tych dwóch to `boneCount` i `boneCount + 1`.
   */
  readonly channelCount: number;
  /** Indeks kości nadrzędnej albo -1 dla kości zaczepionej w korzeniu. */
  readonly parent: Int8Array;
  /** Punkt zaczepienia względem pivota rodzica. */
  readonly atX: Float32Array;
  readonly atY: Float32Array;
  /** 1 dla kończyn po dalszej stronie postaci. */
  readonly back: Uint8Array;
  /** Nazwa części w skórce dla każdej kości. */
  readonly sprites: readonly string[];
  /** Indeksy kości w kolejności rysowania. */
  readonly drawOrder: Uint8Array;
  readonly hipHeight: number;
  /** Jednostki logiczne sceny na jednostkę rigu. */
  readonly scale: number;
  readonly strideLength: number;
  readonly clips: ReadonlyMap<string, CompiledClip>;
  /** Postawy: wartości kanałów, których klip nie animuje. */
  readonly stances: ReadonlyMap<string, Float32Array>;
}

const DEG_TO_RAD = Math.PI / 180;

export function compileRig(raw: RawRig): CompiledRig {
  const boneIds = raw.bones.map((bone) => bone.id);
  const boneCount = boneIds.length;
  const channels = [...boneIds, 'bob', 'dx'];

  const clips = new Map<string, CompiledClip>();
  for (const [name, clip] of Object.entries(raw.clips)) {
    clips.set(name, compileClip(clip, channels, boneCount));
  }
  const stances = new Map<string, Float32Array>();
  for (const [name, angles] of Object.entries(raw.stances)) {
    const rest = new Float32Array(channels.length);
    for (const [bone, degrees] of Object.entries(angles)) {
      const index = boneIds.indexOf(bone);
      if (index !== -1) rest[index] = degrees * DEG_TO_RAD;
    }
    stances.set(name, rest);
  }

  return {
    id: raw.id,
    boneCount,
    boneIds,
    channelCount: channels.length,
    parent: Int8Array.from(raw.bones, (bone) => boneIds.indexOf(bone.parent)),
    atX: Float32Array.from(raw.bones, (bone) => bone.at[0]),
    atY: Float32Array.from(raw.bones, (bone) => bone.at[1]),
    back: Uint8Array.from(raw.bones, (bone) => (bone.back ? 1 : 0)),
    sprites: raw.bones.map((bone) => bone.sprite),
    drawOrder: Uint8Array.from(raw.drawOrder, (id) => boneIds.indexOf(id)),
    hipHeight: raw.hipHeight,
    scale: raw.scale,
    strideLength: raw.strideLength,
    clips,
    stances,
  };
}

/**
 * Macierz korzenia postaci do `out[0..5]`: stopy w punkcie (feetX, feetY), obrót całej postaci
 * wokół stóp o `angle`, skala (`scaleX` ujemna odbija postać), potem przesunięcie do bioder
 * z kanałami `dx` i `bob` pozy.
 */
export function rootMatrix(
  out: Float32Array,
  feetX: number,
  feetY: number,
  angle: number,
  scaleX: number,
  scaleY: number,
  hipX: number,
  hipY: number,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const a = cos * scaleX;
  const b = sin * scaleX;
  const c = -sin * scaleY;
  const d = cos * scaleY;
  out[0] = a;
  out[1] = b;
  out[2] = c;
  out[3] = d;
  out[4] = a * hipX + c * hipY + feetX;
  out[5] = b * hipX + d * hipY + feetY;
}

/**
 * Liczy macierze wszystkich kości do `out`, od indeksu `outOffset`, po 6 wartości na kość.
 * `pose[poseOffset + i]` to kąt kości `i` w radianach; `root` to macierz korzenia.
 * Kości są w kolejności obliczeń, więc macierz rodzica jest zawsze gotowa.
 */
export function computeBoneMatrices(
  rig: CompiledRig,
  pose: Float32Array,
  poseOffset: number,
  root: Float32Array,
  out: Float32Array,
  outOffset: number,
): void {
  const { parent, atX, atY, boneCount } = rig;
  for (let bone = 0; bone < boneCount; bone++) {
    const p = parent[bone] ?? -1;
    let a: number;
    let b: number;
    let c: number;
    let d: number;
    let e: number;
    let f: number;
    if (p < 0) {
      a = root[0] ?? 1;
      b = root[1] ?? 0;
      c = root[2] ?? 0;
      d = root[3] ?? 1;
      e = root[4] ?? 0;
      f = root[5] ?? 0;
    } else {
      const base = outOffset + p * MATRIX_SIZE;
      a = out[base] ?? 1;
      b = out[base + 1] ?? 0;
      c = out[base + 2] ?? 0;
      d = out[base + 3] ?? 1;
      e = out[base + 4] ?? 0;
      f = out[base + 5] ?? 0;
    }
    const angle = pose[poseOffset + bone] ?? 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const tx = atX[bone] ?? 0;
    const ty = atY[bone] ?? 0;
    const target = outOffset + bone * MATRIX_SIZE;
    // Macierz rodzica × (przesunięcie do punktu zaczepienia × obrót kości).
    out[target] = a * cos + c * sin;
    out[target + 1] = b * cos + d * sin;
    out[target + 2] = c * cos - a * sin;
    out[target + 3] = d * cos - b * sin;
    out[target + 4] = a * tx + c * ty + e;
    out[target + 5] = b * tx + d * ty + f;
  }
}
