// Walidacja całej treści gry. Każdy nowy typ danych dopisuje tu swój walidator.
// Reguły wynikające z niezmienników symulacji sprawdza dodatkowo scripts/lib/content-sim-checks.ts,
// bo `content` może importować z `sim` tylko typy.
import type { Dictionary } from '../core/i18n.ts';
import { dictionaries, SOURCE_LANGUAGE } from './i18n/index.ts';
import { validateDictionaries } from './i18n/validate.ts';
import type { ContentIssue } from './issues.ts';
import { type GameContent, loadContent, type RawContent, rawContent } from './load.ts';

/** Klucz i18n z nazwą jednostki. */
export function unitNameKey(unitId: string): string {
  return `unit.${unitId}.name`;
}

function missingNames(content: GameContent, source: Dictionary): ContentIssue[] {
  const issues: ContentIssue[] = [];
  for (const [file, units] of [
    ['units/heroes.json', content.heroes],
    ['units/enemies.json', content.enemies],
  ] as const) {
    for (const id of units.keys()) {
      const key = unitNameKey(id);
      if (source[key] === undefined) {
        issues.push({ source: file, message: `${id}: brak tekstu "${key}" w słowniku` });
      }
    }
  }
  return issues;
}

export function validateContent(raw: RawContent = rawContent): ContentIssue[] {
  const issues: ContentIssue[] = [...validateDictionaries(dictionaries, SOURCE_LANGUAGE)];
  const { content, issues: loadIssues } = loadContent(raw);
  issues.push(...loadIssues);
  if (content !== null) issues.push(...missingNames(content, dictionaries[SOURCE_LANGUAGE]));
  return issues;
}
