// Eksport i import klipu edytora animacji. Eksport ma układ pliku rigs/<rig>.json
// (wpis obiektu "clips"), więc daje się wkleić do pliku bez przeróbek.
import { clipSchema, type RawClip } from '../../content/schema-rig.ts';

/** Wcięcie wpisu w obiekcie "clips" pliku rigu. */
const INDENT = '    ';

/** Zaokrąglenie usuwa szum zmiennoprzecinkowy z suwaków; dwa miejsca to dużo więcej niż widać. */
function tidy(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

/** Klip z wartościami zaokrąglonymi tak, jak trafią do pliku. */
export function tidyClip(clip: RawClip): RawClip {
  const channels: RawClip['channels'] = {};
  for (const [name, keys] of Object.entries(clip.channels)) {
    channels[name] = keys.map(([time, value]) => [time, tidy(value)]);
  }
  return { loop: clip.loop, markers: { ...clip.markers }, channels };
}

/** Wpis `"<nazwa>": { ... }` do obiektu "clips" pliku rigu. */
export function exportClip(name: string, clip: RawClip): string {
  const tidied = tidyClip(clip);
  const lines = [`${INDENT}${JSON.stringify(name)}: {`, `${INDENT}  "loop": ${tidied.loop},`];
  const markers = Object.entries(tidied.markers);
  if (markers.length > 0) {
    const body = markers.map(([key, time]) => `${JSON.stringify(key)}: ${time}`).join(', ');
    lines.push(`${INDENT}  "markers": { ${body} },`);
  }
  lines.push(`${INDENT}  "channels": {`);
  const channels = Object.entries(tidied.channels);
  channels.forEach(([channel, keys], index) => {
    const body = keys.map(([time, value]) => `[${time}, ${value}]`).join(', ');
    const comma = index < channels.length - 1 ? ',' : '';
    lines.push(`${INDENT}    ${JSON.stringify(channel)}: [${body}]${comma}`);
  });
  lines.push(`${INDENT}  }`, `${INDENT}}`);
  return lines.join('\n');
}

export type ImportResult =
  | { readonly ok: true; readonly name: string | null; readonly clip: RawClip }
  | { readonly ok: false; readonly error: string };

function parseJson(text: string): unknown {
  const trimmed = text.trim().replace(/,$/, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    // Wpis skopiowany z pliku rigu: `"nazwa": { ... }` bez otaczających klamer.
    return JSON.parse(`{${trimmed}}`);
  }
}

/**
 * Czyta klip z tekstu: sam obiekt klipu albo wpis `"<nazwa>": { ... }` (z klamrami lub bez).
 * `channels` to kanały rigu; klip z nieznanym kanałem jest odrzucany.
 */
export function importClip(text: string, channels: readonly string[]): ImportResult {
  let data: unknown;
  try {
    data = parseJson(text);
  } catch {
    return { ok: false, error: 'to nie jest poprawny JSON' };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: 'oczekiwany obiekt klipu' };
  }

  let name: string | null = null;
  let candidate: unknown = data;
  const entries = Object.entries(data);
  const [only] = entries;
  if (!('channels' in data) && entries.length === 1 && only !== undefined) {
    [name, candidate] = only;
  }

  const parsed = clipSchema.safeParse(candidate);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return { ok: false, error: details.join('; ') };
  }
  const unknown = Object.keys(parsed.data.channels).filter(
    (channel) => !channels.includes(channel),
  );
  if (unknown.length > 0) {
    return { ok: false, error: `nieznane kanały: ${unknown.join(', ')}` };
  }
  return { ok: true, name, clip: parsed.data };
}
