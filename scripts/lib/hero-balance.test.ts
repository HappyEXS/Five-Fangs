// Reguły balansu bohaterów z decyzji autora gry (ADR 0024), sprawdzane symulacją na treści gry.
// Test nie przypina liczb: pilnuje kierunku, który liczby mają utrzymać po każdej zmianie.
import { describe, expect, it } from 'vitest';
import { rawContent, requireContent } from '../../src/content/load.ts';
import {
  formRows,
  HUMAN_SQUADS,
  HUMAN_TRIBES,
  SKETCH_SQUADS,
  squadBattle,
  squadMatrix,
  TRIBE_SQUADS,
  teamValue,
  tribeBalance,
  versus,
} from './hero-balance.ts';

const content = requireContent();
const rows = formRows(content);
const TIERS = [0, 1, 2];
const SKETCH_TRIBES = ['beasts', 'immortals', 'plants', 'robots'];

interface RawHero {
  id: string;
  kind: string;
  moveSpeed: number;
  range: number;
}
const rawHeroes = rawContent['units/heroes.json'] as RawHero[];

describe('pomiar', () => {
  it('drużyny pokazowe to formy swojego szczepu: cztery końcowe i jedna pierwszej ewolucji', () => {
    for (const [tribe, squad] of Object.entries(TRIBE_SQUADS)) {
      expect(new Set(squad).size, tribe).toBe(5);
      const lines = tribe === 'humans' ? HUMAN_TRIBES : [tribe];
      const tiers = squad.map((unit) => {
        const form = lines
          .map((line) => content.lines.get(line)?.forms.get(unit))
          .find((found) => found !== undefined);
        expect(form, `${tribe}: ${unit}`).toBeDefined();
        return form?.tier;
      });
      if (tribe !== 'humans') expect(tiers.filter((tier) => tier === 2)).toHaveLength(4);
      expect(tiers.every((tier) => tier === 1 || tier === 2)).toBe(true);
    }
  });

  it('obejmuje wszystkie 42 formy, a każda walczy z każdą inną formą swojego stopnia', () => {
    expect(rows).toHaveLength(42);
    for (const row of rows) {
      const peers = rows.filter((other) => other.tier === row.tier).length - 1;
      expect(row.wins + row.draws + row.losses, row.unit).toBe(peers);
    }
  });

  it('pojedynek tej samej formy z obu stron pola daje remis, a wynik pary jest antysymetryczny', () => {
    expect(versus(content, ['reaper'], ['reaper'])).toBe(0);
    const forward = versus(content, ['enigmatix'], ['cleric_b']);
    expect(forward).toBe(1);
    expect(versus(content, ['cleric_b'], ['enigmatix'])).toBe(-forward);
  });

  it('forma środkowa trójki ludzi ma wartość w drużynie zero', () => {
    expect(teamValue(content, 'swordsman_a', 0)).toBe(0);
    expect(teamValue(content, 'swordsman_b', 1)).toBe(0);
    expect(teamValue(content, 'swordsman_b2', 2)).toBe(0);
  });
});

describe('ludzie są wyraźnie słabsi od szczepów ze szkiców', () => {
  it('każda forma ludzi przegrywa więcej pojedynków swojego stopnia, niż wygrywa', () => {
    for (const row of rows.filter((entry) => HUMAN_TRIBES.includes(entry.tribe))) {
      expect(row.wins, row.unit).toBeLessThan(row.losses);
    }
  });

  it('na każdym stopniu średni bilans obu szczepów ludzi jest niższy niż każdego szczepu ze szkiców', () => {
    for (const tier of TIERS) {
      const best = Math.max(...HUMAN_TRIBES.map((tribe) => tribeBalance(rows, tribe, tier)));
      for (const tribe of SKETCH_TRIBES) {
        expect(tribeBalance(rows, tribe, tier), `${tribe}, stopień ${tier}`).toBeGreaterThan(best);
      }
    }
  });

  it('drużyna ludzi przegrywa z drużyną każdego szczepu ze szkiców, z obu stron pola', () => {
    for (const upgrades of [0, content.progression.maxUpgrades]) {
      for (const humans of HUMAN_SQUADS) {
        for (const tribe of SKETCH_SQUADS) {
          const score = versus(
            content,
            TRIBE_SQUADS[tribe] ?? [],
            TRIBE_SQUADS[humans] ?? [],
            upgrades,
          );
          expect(score, `${tribe} przeciw ${humans}, ulepszenia ${upgrades}`).toBe(1);
        }
      }
    }
  });

  it('ludzie nie są bezużyteczni: żadna ich drużyna nie pada, zanim zada cios', () => {
    for (const humans of HUMAN_SQUADS) {
      for (const tribe of SKETCH_SQUADS) {
        const result = squadBattle(content, TRIBE_SQUADS[humans] ?? [], TRIBE_SQUADS[tribe] ?? []);
        const dealt = result.damageDealt.slice(0, 5).reduce((sum, value) => sum + value, 0);
        expect(dealt, `${humans} przeciw ${tribe}`).toBeGreaterThan(500);
      }
    }
  });
});

describe('szczepy ze szkiców są wyrównane między sobą', () => {
  it('żaden nie wygrywa i żaden nie przegrywa ze wszystkimi pozostałymi', () => {
    for (const upgrades of [0, content.progression.maxUpgrades]) {
      const matrix = squadMatrix(content, upgrades);
      for (const tribe of SKETCH_SQUADS) {
        const others = SKETCH_SQUADS.filter((other) => other !== tribe);
        const wins = others.filter((other) => matrix[tribe]?.[other]?.outcome === 'win').length;
        expect(wins, `${tribe}, ulepszenia ${upgrades}`).toBeGreaterThan(0);
        expect(wins, `${tribe}, ulepszenia ${upgrades}`).toBeLessThan(others.length);
      }
    }
  });

  it('żadna forma nie wygrywa wszystkich pojedynków swojego stopnia poza formami bazowymi', () => {
    // Na stopniu bazowym jest tylko sześć form i Orb wygrywa ze wszystkimi; to stan znany,
    // opisany w ADR 0024.
    for (const row of rows.filter((entry) => entry.tier > 0)) {
      const peers = row.wins + row.draws + row.losses;
      expect(row.wins, row.unit).toBeLessThan(peers);
    }
  });
});

describe('skala szybkości', () => {
  it('postać walcząca wręcz chodzi nie wolniej niż 40 i nie szybciej niż 130', () => {
    // Wolniejsza nie dochodzi do celu, zanim odrzut znów ją odsunie; szybsza wybiega przed
    // drużynę i ginie pierwsza.
    for (const hero of rawHeroes.filter((entry) => entry.kind === 'melee')) {
      expect(hero.moveSpeed, hero.id).toBeGreaterThanOrEqual(40);
      expect(hero.moveSpeed, hero.id).toBeLessThanOrEqual(130);
    }
  });

  it('powolny strzelec ma zasięg, przy którym prawie nie musi chodzić', () => {
    // Strzelec z drugiego slotu sięga wtedy frontu przeciwnika ze swojego miejsca.
    const reach = (content.arena.enemySlots[0] ?? 0) - (content.arena.playerSlots[1] ?? 0);
    expect(reach).toBe(260 * 256);
    for (const hero of rawHeroes.filter((entry) => entry.kind === 'ranged')) {
      if (hero.moveSpeed === 0 || hero.moveSpeed >= 30) continue;
      expect(hero.range, hero.id).toBeGreaterThanOrEqual(240);
    }
  });
});
