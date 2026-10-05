// Ustalone walki dla testów golden. Każda zmiana tych definicji albo zachowania symulacji
// zmienia hashe w __snapshots__; aktualizacja (`pnpm test:golden -u`) musi być świadoma
// i opisana w commicie (CLAUDE.md).
//
// Setupy celowo nie korzystają z danych treści gry: zmiana balansu nie może ruszać goldenów.
import { CLOSE_SLOTS, melee, ranged, setupOf, u } from '../../src/sim/fixtures.ts';
import type { BattleSetup } from '../../src/sim/types.ts';

const brute = () =>
  melee({ maxHp: 800, attack: 35, moveStep: 384, attackInterval: 43, knockback: u(25) });
const swordsman = () => melee({ knockback: u(15) });
const archer = () => ranged();

export const GOLDEN_SETUPS: Readonly<Record<string, BattleSetup>> = {
  // Podstawowy pojedynek wręcz z dojściem do przeciwnika.
  'duel-melee': setupOf([melee()], [melee({ maxHp: 450 })]),

  // Strzelec przeciw nadchodzącemu wojownikowi: pociski, potem walka w zwarciu.
  'archer-vs-melee': setupOf([archer()], [melee({ maxHp: 300 })]),

  // Obie strony giną w tym samym ticku.
  'mutual-kill': setupOf([melee({ maxHp: 80 })], [melee({ maxHp: 80 })], CLOSE_SLOTS),

  // Nikt nikogo nie dosięga: limit czasu.
  stalemate: setupOf([melee({ moveStep: 0 })], [melee({ moveStep: 0 })], {
    timeLimitTicks: 300,
  }),

  // Odrzut po obu stronach, w tym z pocisków.
  'knockback-brawl': setupOf(
    [swordsman(), swordsman(), ranged({ knockback: u(8) })],
    [brute(), brute(), archer()],
  ),

  // Pełne składy mieszane.
  'full-5v5': setupOf(
    [swordsman(), swordsman(), archer(), archer(), archer()],
    [brute(), brute(), brute(), archer(), archer()],
  ),

  // Wielu strzelców w jeden cel: kolejność pocisków i jednoczesne trafienia.
  'archers-focus': setupOf(
    [archer(), archer(), archer(), archer(), archer()],
    [brute(), melee({ maxHp: 200, moveStep: u(4) })],
  ),

  // Nierówne prędkości: sojusznicy mijają się w drodze do celu.
  'uneven-speeds': setupOf(
    [melee({ moveStep: 128 }), melee({ moveStep: u(6) }), melee({ moveStep: u(3) })],
    [brute(), archer(), melee({ moveStep: u(5), attackInterval: 20 })],
  ),

  // Leczenie okresowe po obu stronach: drużynowe u gracza, własne u przeciwnika.
  healers: setupOf(
    [swordsman(), ranged({ healAmount: 12, healInterval: 45, healTeam: true }), archer()],
    [brute(), melee({ healAmount: 20, healInterval: 60 }), archer()],
  ),

  // Szał po obu stronach: wręcz u gracza, z pocisków u przeciwnika.
  enrage: setupOf(
    [melee({ enrageHpPercent: 60, enrageAttackPercent: 50, knockback: u(15) }), archer()],
    [brute(), ranged({ enrageHpPercent: 80, enrageAttackPercent: 100 })],
  ),

  // Kradzież życia: wręcz u przeciwnika, z pocisków przebijających u gracza.
  lifesteal: setupOf(
    [swordsman(), ranged({ pierce: true, lifestealPercent: 50 })],
    [melee({ lifestealPercent: 40, knockback: u(15) }), brute(), archer()],
  ),

  // Cios obszarowy po obu stronach, z odrzutem, szałem i kradzieżą życia.
  splash: setupOf(
    [
      melee({ splashRadius: u(45), knockback: u(15) }),
      melee({ splashRadius: u(30), lifestealPercent: 25 }),
      archer(),
    ],
    [
      brute(),
      melee({ splashRadius: u(60), enrageHpPercent: 50, enrageAttackPercent: 60 }),
      melee({ maxHp: 300 }),
      archer(),
    ],
  ),

  // Pociski przebijające z odrzutem przeciw szeregowi wrogów.
  'pierce-line': setupOf(
    [swordsman(), ranged({ pierce: true, knockback: u(6) }), ranged({ pierce: true })],
    [brute(), brute(), melee(), ranged({ pierce: true })],
  ),

  // Celowanie w koniec szyku po obu stronach: pociski mijają front, strzelcy stoją w miejscu.
  'target-last': setupOf(
    [swordsman(), archer(), ranged({ targetLast: true, range: u(1000), attack: 60 })],
    [
      brute(),
      melee({ maxHp: 300 }),
      archer(),
      ranged({ targetLast: true, range: u(1000), knockback: u(20) }),
    ],
  ),
};
