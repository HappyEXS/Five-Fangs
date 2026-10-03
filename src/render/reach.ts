// Zasięg postaci w poziomie: jak daleko przed stopy, za stopy i w górę sięgają jej części
// we wszystkich klatkach klipów idle, chodu i ataku. Liczony raz w beginBattle z prawdziwej
// geometrii rigu i atlasu; renderer na jego podstawie pilnuje, żeby postać przy krawędzi pola
// (np. po odrzucie) ani padająca po śmierci nie wystawała poza scenę.
import type { UnitLook } from './animation.ts';
import type { Sprite } from './atlas.ts';
import { sampleClip } from './clips.ts';
import { computeBoneMatrices, MATRIX_SIZE, rootMatrix } from './rig.ts';
import { LOGICAL_WIDTH } from './viewport.ts';

/** Próbki na klip: klatki kluczowe są gęstsze niż co 1/32 klipu tylko wyjątkowo. */
const SAMPLES = 32;
/** Zapas na wygładzanie pozy między klipami (poza pośrednia bywa minimalnie szersza). */
const SLACK = 4;
/** Połowa szerokości paska i liczby życia nad głową: też nie może wystawać. */
export const HP_HALF_WIDTH = 26;

export interface Reach {
  /** Odległość od stóp do najdalszego punktu za plecami postaci, w jednostkach sceny. */
  back: number;
  /** Do najdalszego punktu przed postacią. */
  front: number;
  /** Od stóp do najwyższego punktu. */
  height: number;
}

/**
 * Mierzy zasięg postaci patrzącej w prawo. `sprites[bone]` to część rysowana na kości albo null.
 * Wołane poza gorącą pętlą: alokuje bufory robocze.
 */
export function measureReach(look: UnitLook, sprites: readonly (Sprite | null)[]): Reach {
  const { rig } = look;
  const pose = new Float32Array(rig.channelCount);
  const root = new Float32Array(MATRIX_SIZE);
  const matrices = new Float32Array(rig.boneCount * MATRIX_SIZE);
  let minX = -HP_HALF_WIDTH;
  let maxX = HP_HALF_WIDTH;
  let minY = 0;
  for (const clip of [look.idle, look.walk, look.attack]) {
    for (let i = 0; i <= SAMPLES; i++) {
      sampleClip(clip, i / SAMPLES, look.rest, pose, 0);
      const bob = pose[rig.boneCount] ?? 0;
      const dx = pose[rig.boneCount + 1] ?? 0;
      rootMatrix(root, 0, 0, 0, look.scale, look.scale, dx, bob - rig.hipHeight);
      computeBoneMatrices(rig, pose, 0, root, matrices, 0);
      for (let bone = 0; bone < rig.boneCount; bone++) {
        const sprite = sprites[bone];
        if (sprite === null || sprite === undefined) continue;
        const m = bone * MATRIX_SIZE;
        const a = matrices[m] ?? 1;
        const b = matrices[m + 1] ?? 0;
        const c = matrices[m + 2] ?? 0;
        const d = matrices[m + 3] ?? 1;
        const e = matrices[m + 4] ?? 0;
        const f = matrices[m + 5] ?? 0;
        for (let corner = 0; corner < 4; corner++) {
          const u = sprite.offsetX + (corner & 1 ? sprite.width : 0);
          const v = sprite.offsetY + (corner & 2 ? sprite.height : 0);
          const x = a * u + c * v + e;
          const y = b * u + d * v + f;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
        }
      }
    }
  }
  return { back: SLACK - minX, front: maxX + SLACK, height: SLACK - minY };
}

/**
 * Pozycja X postaci na scenie przesunięta tak, by cała mieściła się w szerokości sceny.
 * `facing` 1 = patrzy w prawo; `fall` 0..1 to postęp padania do tyłu po śmierci (obrót o 90°
 * wokół stóp, więc za plecami postać sięga wtedy na swoją wysokość). Poza krawędziami zwraca
 * `x` bez zmian. Liczby, nie obiekty: funkcja jest wołana w gorącej pętli i nie alokuje.
 */
export function keepOnStage(
  x: number,
  facing: number,
  back: number,
  front: number,
  height: number,
  fall: number,
): number {
  let behind = back;
  let ahead = front;
  if (fall > 0) {
    const tilt = (fall * Math.PI) / 2;
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);
    behind = back * cos + height * sin;
    ahead = front * cos;
  }
  const left = facing > 0 ? behind : ahead;
  const right = facing > 0 ? ahead : behind;
  if (x < left) return left;
  if (x > LOGICAL_WIDTH - right) return LOGICAL_WIDTH - right;
  return x;
}
