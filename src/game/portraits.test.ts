import { afterEach, describe, expect, it } from 'vitest';
import unitsMeta from '../assets/generated/units.json' with { type: 'json' };
import { requireContent } from '../content/load.ts';
import { type Atlas, parseAtlasMeta } from '../render/atlas.ts';
import { clearErrors, recentErrors } from './errors.ts';
import { contentPortraits } from './portraits.ts';

const atlas: Atlas = {
  images: [],
  sprites: parseAtlasMeta(unitsMeta),
  width: unitsMeta.width,
  height: unitsMeta.height,
};

describe('contentPortraits', () => {
  afterEach(clearErrors);

  it('bez canvasu zwraca null i zapisuje błąd, zamiast zatrzymać grę', () => {
    // Testy działają w Node bez DOM, czyli tak, jak przeglądarka, która odmówiła canvasu.
    expect(contentPortraits(requireContent(), atlas)).toBeNull();
    const errors = recentErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]?.context).toBe('portraits');
  });
});
