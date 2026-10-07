// Szczep wrogów w zakładce Bohaterowie (np. Akronix): poczet postaci zamiast drzewa ewolucji.
// Wrogów nie da się kupić ani rozwijać, więc nie ma tu cen, kosztów ani strzałek: kolumna pocztu
// to stopień w szczepie, na scenie stoi stopień wybranej postaci, a karta pokazuje jej statystyki.
import { rankNameKey, tribeNameKey } from '../content/i18n/keys.ts';
import type { CompiledEnemyTribe } from '../content/load-tribes.ts';
import type { StageControls } from '../game/battle-stage.ts';
import type { Game } from '../game/game.ts';
import { t, tName } from '../game/i18n.ts';
import { tribeStands } from '../game/stage-stands.ts';
import { StatTable, unitName } from './common.tsx';
import { Portrait } from './Portrait.tsx';

export function tribeName(tribeId: string): string {
  return tName(tribeNameKey(tribeId));
}

/** Stopnie szczepu w kolejności z treści, każdy ze swoimi postaciami. */
function ranksOf(tribe: CompiledEnemyTribe): { rank: string; units: string[] }[] {
  const ranks: { rank: string; units: string[] }[] = [];
  for (const member of tribe.members) {
    const last = ranks[ranks.length - 1];
    if (last !== undefined && last.rank === member.rank) last.units.push(member.unit);
    else ranks.push({ rank: member.rank, units: [member.unit] });
  }
  return ranks;
}

export function FoeTribe(props: {
  game: Game;
  stage: StageControls;
  tribe: CompiledEnemyTribe;
  /** Id wybranej postaci. */
  unit: string;
}) {
  const { game, stage, tribe } = props;
  const selected = tribe.members.find((member) => member.unit === props.unit);
  const spec = game.content.enemies.get(props.unit)?.base;
  const stands = tribeStands(game.content, tribe.id, props.unit);

  return (
    <>
      <section class="sheet tree-sheet">
        <ol class="roster" aria-label={t('heroes.foes.roster')}>
          {ranksOf(tribe).map(({ rank, units }) => (
            <li key={rank} class="roster-rank">
              <span class="roster-title">{tName(rankNameKey(rank))}</span>
              {units.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  class="tree-node"
                  data-form={unit}
                  aria-pressed={unit === props.unit}
                  onClick={() => game.openHeroes(tribe.id, unit)}
                >
                  <Portrait stage={stage} unit={unit} mirrored />
                  <span class="tree-name">{unitName(unit)}</span>
                </button>
              ))}
            </li>
          ))}
        </ol>
      </section>

      {selected !== undefined && spec !== undefined && (
        <section class="sheet form-card" data-details={selected.unit}>
          <header class="card-head">
            <Portrait stage={stage} unit={selected.unit} mirrored />
            <div class="card-title">
              <h3 class="hero-name">{unitName(selected.unit)}</h3>
              <p class="hero-form">
                <span>{tribeName(tribe.id)}</span>
                <span>{tName(rankNameKey(selected.rank))}</span>
              </p>
            </div>
          </header>
          <StatTable spec={spec} />
        </section>
      )}

      {/* Pod podłogą nazwy postaci stojących na scenie: cały stopień wybranej postaci. */}
      {stands.map((stand) => (
        <button
          key={stand.unitId}
          type="button"
          class="path-name"
          data-form={stand.unitId}
          aria-pressed={stand.unitId === props.unit}
          style={{ left: `${stand.position * 100}%` }}
          onClick={() => game.openHeroes(tribe.id, stand.unitId)}
        >
          {unitName(stand.unitId)}
        </button>
      ))}
    </>
  );
}
