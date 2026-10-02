// Wczytanie składów referencyjnych dla skryptu balansu i walidatora treści.

import referenceJson from '../../src/content/data/balance/reference-squads.json' with {
  type: 'json',
};
import type { ContentIssue } from '../../src/content/issues.ts';
import type { GameContent } from '../../src/content/load.ts';
import { type Reference, referenceSchema, validateReference } from './balance.ts';

export interface ReferenceResult {
  readonly reference: Reference | null;
  readonly issues: readonly ContentIssue[];
}

export function loadReference(content: GameContent, raw: unknown = referenceJson): ReferenceResult {
  const parsed = referenceSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      source: 'balance/reference-squads.json',
      message: `${issue.path.join('.')}: ${issue.message}`,
    }));
    return { reference: null, issues };
  }
  return { reference: parsed.data, issues: validateReference(content, parsed.data) };
}
