// Reguły łączące treść z wygenerowanym atlasem: każda skórka ma komplet części swojego rigu,
// a każdy pocisk swój sprite. Leżą w scripts/, bo moduł `content` nie importuje assetów.
import type { CompiledUnit } from '../../src/content/compile.ts';
import type { ContentIssue } from '../../src/content/issues.ts';
import type { GameContent } from '../../src/content/load.ts';

export function contentAssetIssues(
  content: GameContent,
  spriteNames: ReadonlySet<string>,
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const check = (source: string, unit: CompiledUnit): void => {
    const { visual } = unit;
    const rig = content.rigs.get(visual.rig);
    if (rig === undefined) return;
    const missing = new Set<string>();
    for (const bone of rig.bones) {
      const name = `${visual.skin}/${bone.sprite}`;
      if (!spriteNames.has(name)) missing.add(name);
    }
    for (const name of missing) {
      issues.push({ source, message: `${unit.id}: w atlasie brakuje sprite'a "${name}"` });
    }
    if (visual.projectileSprite !== null && !spriteNames.has(`fx/${visual.projectileSprite}`)) {
      issues.push({
        source,
        message: `${unit.id}: w atlasie brakuje sprite'a pocisku "fx/${visual.projectileSprite}"`,
      });
    }
  };
  for (const unit of content.heroes.values()) check('units/heroes.json', unit);
  for (const unit of content.enemies.values()) check('units/enemies.json', unit);
  for (const unit of content.summons.values()) check('units/summons.json', unit);
  return issues;
}
