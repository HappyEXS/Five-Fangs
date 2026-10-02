// Raport „Zgłoś problem” (docs/ARCHITECTURE.md §6.3). Gra nie ma backendu, więc gracz kopiuje
// raport do schowka i wysyła go sam. Walka jest deterministyczna: wejście symulacji wystarcza,
// żeby odtworzyć ją w piaskownicy (`/tools.html?setup=...`).
import type { BattleSetup } from '../sim/types.ts';
import type { ErrorEntry } from './errors.ts';
import type { Save } from './save-schema.ts';
import { type GameVersion, versionLabel } from './version.ts';

export interface ReportInput {
  readonly version: GameVersion;
  readonly userAgent: string;
  readonly language: string;
  readonly screen: string;
  readonly scene: string;
  readonly save: Save;
  readonly errors: readonly ErrorEntry[];
  readonly lastBattle: BattleSetup | null;
  readonly now: Date;
}

export function buildReport(input: ReportInput): string {
  const { version, save } = input;
  const lines = [
    'Five Fangs – problem report',
    `version: ${versionLabel(version)}, built ${version.builtAt}`,
    `time: ${input.now.toISOString()}`,
    `browser: ${input.userAgent}`,
    `language: ${input.language}, screen: ${input.screen}`,
    `scene: ${input.scene}`,
    `save: v${save.saveVersion}, gold ${save.gold}, levels cleared ${
      Object.values(save.levels).filter((level) => level.cleared).length
    }`,
    `squad: ${JSON.stringify(save.squad)}`,
    `lines: ${JSON.stringify(save.lines)}`,
    '',
    `errors (${input.errors.length}):`,
  ];
  if (input.errors.length === 0) lines.push('  none');
  for (const error of input.errors) {
    lines.push(`  [${error.at}] ${error.kind}: ${error.message}`);
    if (error.context !== null) lines.push(`    context: ${error.context}`);
    if (error.stack !== null) {
      for (const frame of error.stack.split('\n').slice(0, 6)) lines.push(`    ${frame.trim()}`);
    }
  }
  lines.push('', 'last battle setup:');
  lines.push(input.lastBattle === null ? '  none' : JSON.stringify(input.lastBattle));
  return lines.join('\n');
}
