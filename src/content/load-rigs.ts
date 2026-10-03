// Wczytanie rigów z klipami animacji i sprawdzenie ich spójności.
import type { ContentIssue } from './issues.ts';
import { parse } from './parse.ts';
import { type RawRig, ROOT_CHANNELS, rigSchema } from './schema-rig.ts';

/** Klipy, które musi mieć każdy rig: renderer używa ich dla stanów Idle i Moving. */
export const REQUIRED_CLIPS = ['idle', 'walk'] as const;

function rigIssues(source: string, rig: RawRig): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const report = (message: string): void => {
    issues.push({ source, message });
  };

  const bones = new Set<string>();
  for (const bone of rig.bones) {
    if (bone.id === 'root' || ROOT_CHANNELS.some((channel) => channel === bone.id)) {
      report(`kość nie może nazywać się "${bone.id}"`);
    }
    if (bones.has(bone.id)) report(`powtórzona kość "${bone.id}"`);
    if (bone.parent !== 'root' && !bones.has(bone.parent)) {
      report(`kość "${bone.id}": rodzic "${bone.parent}" musi być wymieniony wcześniej`);
    }
    bones.add(bone.id);
  }

  const drawn = [...rig.drawOrder].sort().join(',');
  if (drawn !== [...bones].sort().join(',')) {
    report('drawOrder musi zawierać każdą kość dokładnie raz');
  }

  for (const [stance, angles] of Object.entries(rig.stances)) {
    for (const bone of Object.keys(angles)) {
      if (!bones.has(bone)) report(`postawa "${stance}": nieznana kość "${bone}"`);
    }
  }

  for (const [stance, string] of Object.entries(rig.strings)) {
    const label = `cięciwa "${stance}"`;
    if (rig.stances[stance] === undefined) report(`${label}: nieznana postawa`);
    for (const bone of [string.bone, string.pull.bone]) {
      if (!bones.has(bone)) report(`${label}: nieznana kość "${bone}"`);
    }
    if (rig.clips[string.pull.clip] === undefined) {
      report(`${label}: nieznany klip "${string.pull.clip}"`);
    }
    if (string.pull.from >= string.pull.to) report(`${label}: "from" musi być mniejsze niż "to"`);
  }

  for (const required of REQUIRED_CLIPS) {
    if (rig.clips[required] === undefined) report(`brak wymaganego klipu "${required}"`);
  }
  for (const [name, clip] of Object.entries(rig.clips)) {
    for (const [channel, keys] of Object.entries(clip.channels)) {
      const label = `klip "${name}", kanał "${channel}"`;
      if (!bones.has(channel) && !ROOT_CHANNELS.some((root) => root === channel)) {
        report(`${label}: nieznana kość`);
      }
      const first = keys[0];
      const last = keys[keys.length - 1];
      if (first === undefined || last === undefined) continue;
      if (first[0] !== 0) report(`${label}: pierwsza klatka musi mieć czas 0`);
      if (keys.length > 1 && last[0] !== 1) report(`${label}: ostatnia klatka musi mieć czas 1`);
      for (let i = 1; i < keys.length; i++) {
        if ((keys[i]?.[0] ?? 0) <= (keys[i - 1]?.[0] ?? 0)) {
          report(`${label}: czasy klatek muszą rosnąć`);
          break;
        }
      }
      // Pętla bez skoku: wartość na końcu cyklu równa wartości na początku.
      if (clip.loop && first[1] !== last[1]) {
        report(`${label}: w klipie zapętlonym pierwsza i ostatnia wartość muszą być równe`);
      }
    }
  }
  return issues;
}

/** Waliduje rigi. Klucz mapy wejściowej to nazwa pliku bez rozszerzenia; musi równać się id rigu. */
export function loadRigs(
  raw: Readonly<Record<string, unknown>>,
  issues: ContentIssue[],
): Map<string, RawRig> | null {
  const rigs = new Map<string, RawRig>();
  let failed = false;
  for (const [file, data] of Object.entries(raw)) {
    const source = `rigs/${file}.json`;
    const rig = parse(source, rigSchema, data, issues);
    if (rig === null) {
      failed = true;
      continue;
    }
    if (rig.id !== file) {
      issues.push({ source, message: `id "${rig.id}" nie zgadza się z nazwą pliku` });
    }
    issues.push(...rigIssues(source, rig));
    rigs.set(rig.id, rig);
  }
  return failed ? null : rigs;
}
