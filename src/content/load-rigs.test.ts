import { describe, expect, it } from 'vitest';
import type { ContentIssue } from './issues.ts';
import { loadContent, type RawContent, rawContent } from './load.ts';
import { loadRigs } from './load-rigs.ts';

const rig = {
  id: 'stick',
  hipHeight: 10,
  scale: 1,
  strideLength: 20,
  bones: [
    { id: 'body', parent: 'root', at: [0, 0], sprite: 'torso' },
    { id: 'arm', parent: 'body', at: [0, -5], sprite: 'upper', back: true },
  ],
  drawOrder: ['arm', 'body'],
  portrait: { bone: 'body', center: [0, -6], size: 12 },
  stances: { sword: { arm: -30 } },
  clips: {
    idle: {
      loop: true,
      channels: {
        body: [
          [0, 0],
          [1, 0],
        ],
      },
    },
    walk: {
      loop: true,
      channels: {
        arm: [
          [0, 10],
          [0.5, -10],
          [1, 10],
        ],
        bob: [[0, 0]],
      },
    },
  },
};

function problems(overrides: Record<string, unknown>): string[] {
  const issues: ContentIssue[] = [];
  loadRigs({ stick: { ...rig, ...overrides } }, issues);
  return issues.map((i) => i.message);
}

describe('rig humanoid z treści gry', () => {
  const { content, issues } = loadContent();
  const humanoid = content?.rigs.get('humanoid');

  it('wczytuje się bez problemów i ma dane z prototypu', () => {
    expect(issues).toEqual([]);
    expect(humanoid?.bones.map((b) => b.id)).toEqual([
      'torso',
      'head',
      'armB',
      'foreB',
      'offhand',
      'thighB',
      'shinB',
      'thighF',
      'shinF',
      'armF',
      'foreF',
      'weapon',
    ]);
    // Drugą rękę (tarcza, druga broń) mają tylko niektóre skórki; rysuje się przed bliższą ręką.
    expect(humanoid?.bones.filter((b) => b.optional).map((b) => b.id)).toEqual(['offhand']);
    expect(humanoid?.drawOrder.slice(-4)).toEqual(['offhand', 'armF', 'weapon', 'foreF']);
    expect(humanoid?.bones.filter((b) => b.back).map((b) => b.id)).toEqual([
      'armB',
      'foreB',
      'thighB',
      'shinB',
    ]);
    expect(Object.keys(humanoid?.clips ?? {})).toEqual([
      'idle',
      'walk',
      'slash',
      'shoot',
      'cleave',
      'snipe',
      // Ataki bestii: dziobnięcie, cios kłem, plucie, salwa kolców.
      'peck',
      'gore',
      'spit',
      'volley',
      // Ataki trzech kolejnych szczepów: rzut, uniesienie rąk, przyzwanie, dziobnięcie kulą.
      'cast',
      'flare',
      'summon',
      'jab',
    ]);
    expect(humanoid?.clips.slash?.markers.hit).toBe(0.5);
    expect(humanoid?.stances.sword).toEqual({ weapon: -75 });
    expect(humanoid?.portrait.bone).toBe('head');
  });
});

describe('walidacja rigu', () => {
  it('poprawny rig nie ma problemów', () => {
    expect(problems({})).toEqual([]);
  });

  it('rodzic musi być wymieniony przed dzieckiem, a nazwy kości unikalne i niezastrzeżone', () => {
    const reversed = [rig.bones[1], rig.bones[0]];
    expect(problems({ bones: reversed })).toContain(
      'kość "arm": rodzic "body" musi być wymieniony wcześniej',
    );
    const twice = [rig.bones[0], rig.bones[0], rig.bones[1]];
    expect(problems({ bones: twice })).toContain('powtórzona kość "body"');
    const reserved = [{ ...rig.bones[0], id: 'bob' }];
    expect(
      problems({ bones: reserved, drawOrder: ['bob'], stances: {}, clips: rig.clips }),
    ).toContain('kość nie może nazywać się "bob"');
  });

  it('kadr miniaturki musi wskazywać istniejącą kość i mieć dodatni bok', () => {
    expect(problems({ portrait: { bone: 'head', center: [0, 0], size: 12 } })).toEqual([
      'miniaturka: nieznana kość "head"',
    ]);
    expect(problems({ portrait: { bone: 'body', center: [0, 0], size: 0 } })).not.toEqual([]);
    expect(problems({ portrait: undefined })).not.toEqual([]);
  });

  it('drawOrder musi zawierać każdą kość dokładnie raz', () => {
    expect(problems({ drawOrder: ['body'] })).toEqual([
      'drawOrder musi zawierać każdą kość dokładnie raz',
    ]);
    expect(problems({ drawOrder: ['body', 'arm', 'arm'] })).toHaveLength(1);
  });

  it('postawy i kanały klipów mogą odwoływać się tylko do istniejących kości', () => {
    expect(problems({ stances: { sword: { leg: 5 } } })).toEqual([
      'postawa "sword": nieznana kość "leg"',
    ]);
    const clips = { ...rig.clips, idle: { loop: true, channels: { leg: [[0, 0]] } } };
    expect(problems({ clips })).toEqual(['klip "idle", kanał "leg": nieznana kość']);
  });

  it('wymaga klipów idle i walk', () => {
    expect(problems({ clips: { idle: rig.clips.idle } })).toEqual(['brak wymaganego klipu "walk"']);
  });

  it('sprawdza czasy klatek kluczowych', () => {
    const clip = (keys: number[][]) => ({
      ...rig.clips,
      idle: { loop: false, channels: { body: keys } },
    });
    expect(
      problems({
        clips: clip([
          [0.1, 0],
          [1, 0],
        ]),
      }),
    ).toEqual(['klip "idle", kanał "body": pierwsza klatka musi mieć czas 0']);
    expect(
      problems({
        clips: clip([
          [0, 0],
          [0.8, 5],
        ]),
      }),
    ).toEqual(['klip "idle", kanał "body": ostatnia klatka musi mieć czas 1']);
    expect(
      problems({
        clips: clip([
          [0, 0],
          [0.6, 5],
          [0.6, 6],
          [1, 0],
        ]),
      }),
    ).toEqual(['klip "idle", kanał "body": czasy klatek muszą rosnąć']);
  });

  it('klip zapętlony musi kończyć się tak, jak się zaczyna', () => {
    const clips = {
      ...rig.clips,
      idle: {
        loop: true,
        channels: {
          body: [
            [0, 0],
            [1, 7],
          ],
        },
      },
    };
    expect(problems({ clips })).toEqual([
      'klip "idle", kanał "body": w klipie zapętlonym pierwsza i ostatnia wartość muszą być równe',
    ]);
  });

  it('id rigu musi zgadzać się z nazwą pliku, a błąd schematu zatrzymuje wczytanie', () => {
    const issues: ContentIssue[] = [];
    loadRigs({ other: rig }, issues);
    expect(issues.map((i) => `${i.source}: ${i.message}`)).toEqual([
      'rigs/other.json: id "stick" nie zgadza się z nazwą pliku',
    ]);
    expect(loadRigs({ stick: { ...rig, hipHeight: -1 } }, [])).toBeNull();
  });
});

describe('powiązanie ataków z animacją', () => {
  const attack = (overrides: Record<string, unknown>) => ({
    id: 'slash',
    swingDuration: 0.4,
    hitFraction: 0.5,
    clip: 'slash',
    stance: 'sword',
    ...overrides,
  });
  const shoot = {
    id: 'shoot',
    swingDuration: 0.6,
    hitFraction: 0.5,
    clip: 'shoot',
    stance: 'bow',
    projectile: { speed: 400, sprite: 'arrow' },
  };
  const messages = (overrides: Partial<RawContent>) =>
    loadContent({ ...rawContent, ...overrides }).issues.map((i) => i.message);

  it('znacznik hit klipu musi równać się hitFraction ataku', () => {
    const issues = messages({ 'attacks.json': [attack({ hitFraction: 0.4 }), shoot] });
    expect(issues).toContain(
      'swordsman_a: znacznik hit klipu "slash" (0.5) różni się od hitFraction ataku "slash" (0.4)',
    );
  });

  it('klip i postawa ataku muszą istnieć w rigu jednostki', () => {
    expect(messages({ 'attacks.json': [attack({ clip: 'stab' }), shoot] })).toContain(
      'swordsman_a: rig "humanoid" nie ma klipu "stab" ataku "slash"',
    );
    expect(messages({ 'attacks.json': [attack({ stance: 'spear' }), shoot] })).toContain(
      'brute: rig "humanoid" nie ma postawy "spear"',
    );
  });

  it('jednostka musi wskazywać istniejący rig', () => {
    const hero = {
      id: 'swordsman_a',
      kind: 'melee',
      maxHp: 600,
      attack: 40,
      moveSpeed: 60,
      attackSpeed: 1,
      range: 30,
      knockback: 15,
      attackType: 'slash',
      skin: 'swordsman_a',
      rig: 'quadruped',
    };
    const issues = messages({ 'units/heroes.json': [hero] });
    expect(issues).toContain('swordsman_a: nieznany rig "quadruped"');
  });
});

describe('walidacja cięciwy', () => {
  const string = {
    bone: 'body',
    ends: [
      [-3, 1],
      [3, 1],
    ],
    pull: { bone: 'arm', at: [0, 2], clip: 'walk', from: 0.1, to: 0.6 },
  };

  it('poprawna cięciwa nie ma problemów', () => {
    expect(problems({ strings: { sword: string } })).toEqual([]);
  });

  it('sprawdza postawę, kości, klip i przedział fazy', () => {
    expect(problems({ strings: { spear: string } })).toEqual(['cięciwa "spear": nieznana postawa']);
    expect(problems({ strings: { sword: { ...string, bone: 'tail' } } })).toEqual([
      'cięciwa "sword": nieznana kość "tail"',
    ]);
    const badPull = { ...string, pull: { ...string.pull, clip: 'shoot', from: 0.6, to: 0.2 } };
    expect(problems({ strings: { sword: badPull } })).toEqual([
      'cięciwa "sword": nieznany klip "shoot"',
      'cięciwa "sword": "from" musi być mniejsze niż "to"',
    ]);
  });
});
