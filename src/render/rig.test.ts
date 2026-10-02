import { describe, expect, it } from 'vitest';
import { requireContent } from '../content/load.ts';
import type { RawRig } from '../content/schema-rig.ts';
import { sampleClip } from './clips.ts';
import { compileRig, computeBoneMatrices, MATRIX_SIZE, rootMatrix } from './rig.ts';

const DEG = Math.PI / 180;

const stick: RawRig = {
  id: 'stick',
  hipHeight: 10,
  scale: 1,
  strideLength: 20,
  bones: [
    { id: 'body', parent: 'root', at: [0, 0], sprite: 'torso', back: false },
    { id: 'arm', parent: 'body', at: [0, -5], sprite: 'upper', back: true },
    { id: 'hand', parent: 'arm', at: [0, 4], sprite: 'fore', back: false },
  ],
  drawOrder: ['arm', 'hand', 'body'],
  stances: { sword: { hand: -30 } },
  strings: {
    sword: {
      bone: 'body',
      ends: [
        [-3, 1],
        [3, 1],
      ],
      pull: { bone: 'hand', at: [0, 2], clip: 'slash', from: 0.1, to: 0.6 },
    },
  },
  clips: {
    idle: {
      loop: true,
      markers: {},
      channels: {
        body: [
          [0, 0],
          [0.5, 10],
          [1, 0],
        ],
        bob: [[0, -2]],
      },
    },
    walk: { loop: true, markers: {}, channels: { arm: [[0, 90]] } },
    slash: {
      loop: false,
      markers: { hit: 0.5 },
      channels: {
        arm: [
          [0, 0],
          [0.4, 100],
          [1, 20],
        ],
        dx: [
          [0, 0],
          [1, 6],
        ],
      },
    },
  },
};

const rig = compileRig(stick);

function matrices(pose: number[], root: Float32Array) {
  const out = new Float32Array(rig.boneCount * MATRIX_SIZE);
  computeBoneMatrices(rig, Float32Array.from(pose), 0, root, out, 0);
  const rounded = (bone: number) =>
    Array.from(
      out.subarray(bone * MATRIX_SIZE, (bone + 1) * MATRIX_SIZE),
      (v) => Math.round(v * 1000) / 1000 + 0,
    );
  return rounded;
}

describe('compileRig', () => {
  it('zamienia nazwy na indeksy i stopnie na radiany', () => {
    expect(rig.boneCount).toBe(3);
    expect(rig.channelCount).toBe(5);
    expect(Array.from(rig.parent)).toEqual([-1, 0, 1]);
    expect(Array.from(rig.back)).toEqual([0, 1, 0]);
    expect(Array.from(rig.drawOrder)).toEqual([1, 2, 0]);
    expect(rig.sprites).toEqual(['torso', 'upper', 'fore']);
    expect(rig.stances.get('sword')?.[2]).toBeCloseTo(-30 * DEG);
    expect(rig.clips.get('slash')?.markers.hit).toBe(0.5);
  });

  it('kompiluje rig humanoid z treści gry', () => {
    const raw = requireContent().rigs.get('humanoid');
    if (raw === undefined) throw new Error('no humanoid rig');
    const humanoid = compileRig(raw);
    expect(humanoid.boneCount).toBe(11);
    expect(humanoid.channelCount).toBe(13);
    expect([...humanoid.clips.keys()]).toEqual(['idle', 'walk', 'slash', 'shoot']);
    // Każda kość ma rodzica wymienionego wcześniej.
    humanoid.parent.forEach((p, bone) => {
      expect(p).toBeLessThan(bone);
    });
    expect(new Set(humanoid.drawOrder).size).toBe(11);
  });
});

describe('sampleClip', () => {
  const rest = Float32Array.from([1, 2, 3, 4, 5]);
  const sample = (clip: string, t: number) => {
    const out = new Float32Array(rig.channelCount + 2);
    const compiled = rig.clips.get(clip);
    if (compiled === undefined) throw new Error(`no clip ${clip}`);
    sampleClip(compiled, t, rest, out, 2);
    return Array.from(out.subarray(2));
  };

  it('zwraca wartości klatek kluczowych w ich czasach', () => {
    expect(sample('slash', 0)[1]).toBeCloseTo(0);
    expect(sample('slash', 0.4)[1]).toBeCloseTo(100 * DEG);
    expect(sample('slash', 1)[1]).toBeCloseTo(20 * DEG);
  });

  it('między klatkami interpoluje funkcją smoothstep', () => {
    // W połowie odcinka smoothstep daje dokładnie połowę, w jednej czwartej 0,15625.
    expect(sample('slash', 0.2)[1]).toBeCloseTo(50 * DEG);
    expect(sample('slash', 0.1)[1]).toBeCloseTo(100 * 0.15625 * DEG);
    expect(sample('idle', 0.25)[0]).toBeCloseTo(5 * DEG);
  });

  it('kanał z jedną klatką jest stały, a kanały korzenia nie są przeliczane na radiany', () => {
    expect(sample('idle', 0.7)[3]).toBe(-2);
    expect(sample('slash', 0.5)[4]).toBeCloseTo(3);
  });

  it('kanały nieanimowane biorą wartość z postawy', () => {
    const values = sample('walk', 0.3);
    expect(values[0]).toBe(1);
    expect(values[1]).toBeCloseTo(90 * DEG);
    expect(values[2]).toBe(3);
    expect(values[3]).toBe(4);
  });

  it('czas poza zakresem daje wartości skrajnych klatek', () => {
    expect(sample('slash', -0.5)[1]).toBeCloseTo(0);
    expect(sample('slash', 1.5)[1]).toBeCloseTo(20 * DEG);
  });
});

describe('macierze kości', () => {
  it('poza zerowa: kości przesunięte o punkty zaczepienia', () => {
    const root = new Float32Array(6);
    rootMatrix(root, 100, 200, 0, 1, 1, 0, -10);
    const m = matrices([0, 0, 0, 0, 0], root);
    expect(m(0)).toEqual([1, 0, 0, 1, 100, 190]);
    expect(m(1)).toEqual([1, 0, 0, 1, 100, 185]);
    expect(m(2)).toEqual([1, 0, 0, 1, 100, 189]);
  });

  it('obrót rodzica przenosi dziecko: dodatni kąt to obrót zgodny z ruchem wskazówek zegara', () => {
    const root = new Float32Array(6);
    rootMatrix(root, 0, 0, 0, 1, 1, 0, 0);
    // Ramię obrócone o 90°: jego oś „w dół” wskazuje teraz w lewo, więc dłoń ląduje na x = -4.
    const m = matrices([0, 90 * DEG, 0, 0, 0], root);
    expect(m(1)).toEqual([0, 1, -1, 0, 0, -5]);
    expect(m(2)).toEqual([0, 1, -1, 0, -4, -5]);
  });

  it('skala i odbicie korzenia przechodzą na wszystkie kości', () => {
    const root = new Float32Array(6);
    rootMatrix(root, 50, 0, 0, -2, 2, 3, -10);
    const m = matrices([0, 0, 0, 0, 0], root);
    // Biodra: x = 50 - 2 × 3, y = 2 × (-10).
    expect(m(0)).toEqual([-2, 0, 0, 2, 44, -20]);
    expect(m(2)).toEqual([-2, 0, 0, 2, 44, -22]);
  });

  it('obrót korzenia obraca postać wokół stóp', () => {
    const root = new Float32Array(6);
    rootMatrix(root, 10, 20, 90 * DEG, 1, 1, 0, -10);
    // Biodra 10 jednostek nad stopami po obrocie o 90° leżą 10 jednostek w prawo od stóp.
    const m = matrices([0, 0, 0, 0, 0], root);
    expect(m(0).slice(4)).toEqual([20, 20]);
  });

  it('pisze od podanego offsetu i nie rusza reszty tablicy', () => {
    const root = new Float32Array(6);
    rootMatrix(root, 0, 0, 0, 1, 1, 0, 0);
    const out = new Float32Array(rig.boneCount * MATRIX_SIZE + 12).fill(7);
    const pose = Float32Array.from([9, 9, 0, 0, 0, 0, 0]);
    computeBoneMatrices(rig, pose, 2, root, out, 6);
    expect(Array.from(out.subarray(0, 6))).toEqual([7, 7, 7, 7, 7, 7]);
    // `+ 0` zamienia ujemne zero z mnożenia przez sinus na zwykłe zero.
    expect(Array.from(out.subarray(6, 12), (v) => v + 0)).toEqual([1, 0, 0, 1, 0, 0]);
    expect(Array.from(out.subarray(24))).toEqual([7, 7, 7, 7, 7, 7]);
  });
});

describe('cięciwy', () => {
  it('kompilują się do indeksów kości i odwołania do klipu', () => {
    const string = rig.strings.get('sword');
    expect(string).toMatchObject({
      bone: 0,
      ax: -3,
      ay: 1,
      bx: 3,
      by: 1,
      pullBone: 2,
      pullX: 0,
      pullY: 2,
      from: 0.1,
      to: 0.6,
    });
    expect(string?.clip).toBe(rig.clips.get('slash'));
  });

  it('rig humanoid ma cięciwę łuku naciąganą w klipie shoot', () => {
    const raw = requireContent().rigs.get('humanoid');
    if (raw === undefined) throw new Error('no humanoid rig');
    const humanoid = compileRig(raw);
    const string = humanoid.strings.get('bow');
    expect(string?.bone).toBe(humanoid.boneIds.indexOf('weapon'));
    expect(string?.pullBone).toBe(humanoid.boneIds.indexOf('foreB'));
    expect(string?.clip).toBe(humanoid.clips.get('shoot'));
    expect(humanoid.strings.has('sword')).toBe(false);
  });
});
