// pnpm battle – rozgrywa walkę w konsoli i wypisuje log zdarzeń.
//
//   pnpm battle swordsman,archer vs brute,brute     jednostki z treści gry, kolejno od slotu 0
//   pnpm battle swordsman,-,archer vs brute         "-" zostawia slot pusty
//   pnpm battle golden:full-5v5                     ustalona walka z tests/golden/setups.ts
//   pnpm battle golden:full-5v5 --link              adres piaskownicy odtwarzającej tę walkę

import { requireContent } from '../src/content/load.ts';
import { subunitsToUnits, TICKS_PER_SECOND } from '../src/core/units.ts';
import {
  type BattleSetup,
  battleResult,
  createBattle,
  createEventBuffer,
  drainEvents,
  EVENT_ATTACK_HIT,
  EVENT_ATTACK_STARTED,
  EVENT_BATTLE_ENDED,
  EVENT_DAMAGED,
  EVENT_DIED,
  EVENT_DODGED,
  EVENT_HEALED,
  EVENT_KNOCKED_BACK,
  EVENT_PROJECTILE_EXPIRED,
  EVENT_PROJECTILE_HIT,
  EVENT_PROJECTILE_SPAWNED,
  OUTCOME_IN_PROGRESS,
  stepBattle,
  TEAM_SIZE,
  type UnitSpec,
} from '../src/sim/index.ts';
import { GOLDEN_SETUPS } from '../tests/golden/setups.ts';

function fail(message: string): never {
  console.error(message);
  console.error(
    '\nUżycie: pnpm battle <gracz> vs <przeciwnik>   albo   pnpm battle golden:<nazwa>',
  );
  process.exit(1);
}

const content = requireContent();
const names: string[] = new Array(TEAM_SIZE * 2).fill('');

function parseTeam(text: string, offset: number): (UnitSpec | null)[] {
  const ids = text.split(',').map((part) => part.trim());
  if (ids.length > TEAM_SIZE) fail(`Za dużo jednostek w składzie: ${text}`);
  const team: (UnitSpec | null)[] = [];
  for (let slot = 0; slot < TEAM_SIZE; slot++) {
    const id = ids[slot];
    if (id === undefined || id === '' || id === '-') {
      team.push(null);
      continue;
    }
    const unit = content.heroes.get(id) ?? content.enemies.get(id);
    if (unit === undefined) {
      const known = [...content.heroes.keys(), ...content.enemies.keys()].join(', ');
      fail(`Nieznana jednostka "${id}". Dostępne: ${known}`);
    }
    names[offset + slot] = id;
    team.push(unit.base);
  }
  return team;
}

function parseSetup(args: readonly string[]): BattleSetup {
  const first = args[0];
  if (first === undefined) fail('Brak argumentów.');
  if (first.startsWith('golden:')) {
    const name = first.slice('golden:'.length);
    const setup = GOLDEN_SETUPS[name];
    if (setup === undefined) {
      fail(`Nieznana walka golden "${name}". Dostępne: ${Object.keys(GOLDEN_SETUPS).join(', ')}`);
    }
    return setup;
  }
  const separator = args.indexOf('vs');
  if (separator === -1) fail('Brak słowa "vs" między składami.');
  return {
    arena: content.arena,
    player: parseTeam(args.slice(0, separator).join(''), 0),
    enemy: parseTeam(args.slice(separator + 1).join(''), TEAM_SIZE),
  };
}

const args = process.argv.slice(2).filter((arg) => arg !== '--link');
const setup = parseSetup(args);

// --link: zamiast logu wypisz adres piaskownicy odtwarzającej dokładnie tę walkę.
if (process.argv.includes('--link')) {
  console.log(
    `http://localhost:5173/tools.html?setup=${encodeURIComponent(JSON.stringify(setup))}`,
  );
  process.exit(0);
}
const battle = createBattle(setup);

const unit = (id: number): string => {
  const name = names[id];
  return name === undefined || name === '' ? `#${id}` : `#${id} ${name}`;
};
const pos = (subunits: number): string => subunitsToUnits(subunits).toFixed(1);

function describe(type: number, a: number, b: number, c: number): string {
  switch (type) {
    case EVENT_ATTACK_STARTED:
      return `${unit(a)} zaczyna atak na ${unit(b)}`;
    case EVENT_ATTACK_HIT:
      return `${unit(a)} trafia ${unit(b)}`;
    case EVENT_PROJECTILE_SPAWNED:
      return `${unit(b)} wypuszcza pocisk ${a} z x=${pos(c)}`;
    case EVENT_PROJECTILE_HIT:
      return `pocisk ${a} trafia ${unit(b)} na x=${pos(c)}`;
    case EVENT_PROJECTILE_EXPIRED:
      return `pocisk ${a} opuszcza pole`;
    case EVENT_DAMAGED:
      return `${unit(a)} dostaje ${b} obrażeń od ${unit(c)}`;
    case EVENT_HEALED:
      return `${unit(a)} odzyskuje ${b} HP`;
    case EVENT_KNOCKED_BACK:
      return `${unit(a)} odrzucony o ${pos(b)}`;
    case EVENT_DIED:
      return `${unit(a)} ginie`;
    case EVENT_DODGED:
      return `${unit(a)} unika ataku ${unit(b)}`;
    case EVENT_BATTLE_ENDED:
      return 'koniec walki';
    default:
      return `zdarzenie ${type} (${a}, ${b}, ${c})`;
  }
}

const frame = createEventBuffer();
while (battle.state.outcome === OUTCOME_IN_PROGRESS) {
  stepBattle(battle);
  frame.count = 0;
  drainEvents(battle, frame);
  for (let i = 0; i < frame.count; i++) {
    const line = describe(frame.type[i] ?? 0, frame.a[i] ?? 0, frame.b[i] ?? 0, frame.c[i] ?? 0);
    console.log(`${String(battle.state.tick).padStart(5)}  ${line}`);
  }
}

const result = battleResult(battle);
const seconds = (result.ticks / TICKS_PER_SECOND).toFixed(1);
console.log(
  `\nWynik: ${result.outcome} (${result.reason}) po ${result.ticks} tickach (${seconds} s)`,
);
console.log('Jednostka            HP   zadane  otrzymane');
for (let id = 0; id < TEAM_SIZE * 2; id++) {
  const spec = id < TEAM_SIZE ? setup.player[id] : setup.enemy[id - TEAM_SIZE];
  if (spec == null) continue;
  console.log(
    `${unit(id).padEnd(18)} ${String(result.finalHp[id] ?? 0).padStart(4)}  ${String(result.damageDealt[id] ?? 0).padStart(7)}  ${String(result.damageTaken[id] ?? 0).padStart(9)}`,
  );
}
console.log(
  `Hash stanu ${result.stateHash.toString(16).padStart(8, '0')}, hash zdarzeń ${result.eventHash.toString(16).padStart(8, '0')}`,
);
