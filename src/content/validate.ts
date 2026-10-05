// Walidacja całej treści gry. Każdy nowy typ danych dopisuje tu swój walidator.
// Reguły wynikające z niezmienników symulacji sprawdza dodatkowo scripts/lib/content-sim-checks.ts,
// bo `content` może importować z `sim` tylko typy.
import type { Dictionary } from '../core/i18n.ts';
import { dictionaries, SOURCE_LANGUAGE } from './i18n/index.ts';
import { levelNameKey, lineNameKey, unitNameKey, worldNameKey } from './i18n/keys.ts';
import { validateDictionaries } from './i18n/validate.ts';
import type { ContentIssue } from './issues.ts';
import { type GameContent, loadContent, type RawContent, rawContent } from './load.ts';

export { levelNameKey, lineNameKey, unitNameKey, worldNameKey };

function missingNames(content: GameContent, source: Dictionary): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const require = (file: string, id: string, key: string): void => {
    if (source[key] === undefined) {
      issues.push({ source: file, message: `${id}: brak tekstu "${key}" w słowniku` });
    }
  };
  for (const id of content.heroes.keys()) require('units/heroes.json', id, unitNameKey(id));
  for (const id of content.enemies.keys()) require('units/enemies.json', id, unitNameKey(id));
  for (const id of content.lines.keys()) require('lines.json', id, lineNameKey(id));
  for (const world of content.worlds) require('worlds.json', world.id, worldNameKey(world.id));
  for (const level of content.levels.values()) {
    require(`levels/${level.world}.json`, level.id, levelNameKey(level.id));
  }
  return issues;
}

/** Forma bohatera, która nie należy do żadnej linii, jest nieosiągalna w grze. */
function orphanHeroes(content: GameContent): ContentIssue[] {
  const inLines = new Set<string>();
  for (const line of content.lines.values())
    for (const form of line.forms.keys()) inLines.add(form);
  const issues: ContentIssue[] = [];
  for (const id of content.heroes.keys()) {
    if (!inLines.has(id)) {
      issues.push({ source: 'units/heroes.json', message: `${id}: nie należy do żadnej linii` });
    }
  }
  return issues;
}

/** Bez bohatera startowego nowa gra nie miałaby czym wygrać pierwszego poziomu. */
function starterLines(content: GameContent): ContentIssue[] {
  const hasStarter = [...content.lines.values()].some((line) => line.starter);
  return hasStarter ? [] : [{ source: 'lines.json', message: 'żadna linia nie jest startowa' }];
}

export function validateContent(raw: RawContent = rawContent): ContentIssue[] {
  const issues: ContentIssue[] = [...validateDictionaries(dictionaries, SOURCE_LANGUAGE)];
  const { content, issues: loadIssues } = loadContent(raw);
  issues.push(...loadIssues);
  if (content !== null) {
    issues.push(...missingNames(content, dictionaries[SOURCE_LANGUAGE]));
    issues.push(...orphanHeroes(content));
    issues.push(...starterLines(content));
  }
  return issues;
}
