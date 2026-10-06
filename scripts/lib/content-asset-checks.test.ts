import { describe, expect, it } from 'vitest';
import unitsMeta from '../../src/assets/generated/units.json' with { type: 'json' };
import { requireContent } from '../../src/content/load.ts';
import { contentAssetIssues } from './content-asset-checks.ts';

const content = requireContent();
const sprites = new Set(Object.keys(unitsMeta.sprites));

describe('contentAssetIssues', () => {
  it('każda jednostka gry ma komplet sprite’ów w atlasie', () => {
    expect(contentAssetIssues(content, sprites)).toEqual([]);
  });

  it('zgłasza brakującą część skórki, każdą nazwę raz', () => {
    const partial = new Set(sprites);
    partial.delete('brute/thigh');
    // Część „thigh” jest używana przez dwie kości (udo przednie i tylne).
    expect(contentAssetIssues(content, partial)).toEqual([
      { source: 'units/enemies.json', message: 'brute: w atlasie brakuje sprite\'a "brute/thigh"' },
    ]);
  });

  it('sprawdza także skórki jednostek przyzywanych', () => {
    const partial = new Set(sprites);
    partial.delete('sprout/head');
    expect(contentAssetIssues(content, partial)).toEqual([
      {
        source: 'units/summons.json',
        message: 'sprout: w atlasie brakuje sprite\'a "sprout/head"',
      },
    ]);
  });

  it('zgłasza brakujący sprite pocisku u każdego strzelca', () => {
    const partial = new Set(sprites);
    partial.delete('fx/arrow');
    expect(contentAssetIssues(content, partial).map((i) => i.message)).toEqual([
      // Testowe kopie form (drzewa ewolucji) też strzelają.
      'archer_a: w atlasie brakuje sprite\'a pocisku "fx/arrow"',
      'archer_b: w atlasie brakuje sprite\'a pocisku "fx/arrow"',
      'cleric_a: w atlasie brakuje sprite\'a pocisku "fx/arrow"',
      'cleric_b: w atlasie brakuje sprite\'a pocisku "fx/arrow"',
      'archer_c: w atlasie brakuje sprite\'a pocisku "fx/arrow"',
      'archer_b2: w atlasie brakuje sprite\'a pocisku "fx/arrow"',
      'archer_c2: w atlasie brakuje sprite\'a pocisku "fx/arrow"',
      'cleric_c: w atlasie brakuje sprite\'a pocisku "fx/arrow"',
      'cleric_b2: w atlasie brakuje sprite\'a pocisku "fx/arrow"',
      'cleric_c2: w atlasie brakuje sprite\'a pocisku "fx/arrow"',
      'shaman: w atlasie brakuje sprite\'a pocisku "fx/arrow"',
    ]);
  });
});
