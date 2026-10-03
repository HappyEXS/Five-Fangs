// Panel piaskownicy: składy obu stron, sterowanie odtwarzaniem i przełączniki debug.
// Narzędzie deweloperskie, więc teksty nie przechodzą przez i18n.
import type { Signal } from '@preact/signals';
import { TEAM_SIZE } from '../sim/index.ts';
import type { SandboxConfig, SlotConfig, TeamConfig } from './sandbox-config.ts';

export interface PlaybackState {
  readonly tick: number;
  readonly outcome: string;
  readonly paused: boolean;
  readonly speed: number;
}

export interface DebugFlags {
  readonly pivots: boolean;
  readonly ranges: boolean;
  readonly perf: boolean;
}

export interface SandboxPanelProps {
  readonly units: readonly string[];
  /** Walka pochodzi z gotowego wejścia symulacji; składów nie da się wtedy edytować. */
  readonly fixedSetup: boolean;
  readonly config: Signal<SandboxConfig>;
  readonly playback: Signal<PlaybackState>;
  readonly debug: Signal<DebugFlags>;
  readonly onRestart: () => void;
  readonly onPause: () => void;
  readonly onStep: () => void;
  readonly onSpeed: (speed: number) => void;
  readonly onDebug: (flag: keyof DebugFlags) => void;
}

const SLOTS = Array.from({ length: TEAM_SIZE }, (_, slot) => slot);
const SPEEDS = [1, 2, 4];
const DEBUG_LABELS: readonly [keyof DebugFlags, string][] = [
  ['pivots', 'pivoty (P)'],
  ['ranges', 'zasięgi (G)'],
  ['perf', 'pomiary (O)'],
];

function withSlot(team: TeamConfig, slot: number, entry: SlotConfig | null): (SlotConfig | null)[] {
  return SLOTS.map((index) => (index === slot ? entry : (team[index] ?? null)));
}

function TeamRow(props: {
  label: string;
  side: 'player' | 'enemy';
  units: readonly string[];
  config: Signal<SandboxConfig>;
}) {
  const { config, side } = props;
  const team = config.value[side];
  const update = (slot: number, entry: SlotConfig | null): void => {
    config.value = { ...config.value, [side]: withSlot(team, slot, entry) };
  };
  return (
    <div class="sandbox-team">
      <span class="sandbox-team-label">{props.label}</span>
      {SLOTS.map((slot) => {
        const entry = team[slot] ?? null;
        return (
          <span class="sandbox-slot" key={slot}>
            <select
              aria-label={`${props.label}, slot ${slot}: jednostka`}
              value={entry?.unit ?? ''}
              onChange={(event) => {
                const unit = event.currentTarget.value;
                update(slot, unit === '' ? null : { unit, rank: entry?.rank ?? 0 });
              }}
            >
              <option value="">–</option>
              {props.units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              max={99}
              aria-label={`${props.label}, slot ${slot}: ranga`}
              value={entry?.rank ?? 0}
              disabled={entry === null}
              onChange={(event) => {
                const rank = Math.max(
                  0,
                  Math.min(99, Math.trunc(Number(event.currentTarget.value))),
                );
                if (entry !== null) update(slot, { unit: entry.unit, rank: rank || 0 });
              }}
            />
          </span>
        );
      })}
    </div>
  );
}

export function SandboxPanel(props: SandboxPanelProps) {
  const playback = props.playback.value;
  const debug = props.debug.value;
  return (
    <div class="sandbox-panel">
      <div class="sandbox-status">
        tick {playback.tick} · x{playback.speed}
        {playback.paused ? ' · PAUZA' : ''} · {playback.outcome}
      </div>
      {props.fixedSetup ? (
        <div>walka z parametru setup (wygląd jednostek zastępczy)</div>
      ) : (
        <>
          <TeamRow label="gracz" side="player" units={props.units} config={props.config} />
          <TeamRow label="wróg" side="enemy" units={props.units} config={props.config} />
        </>
      )}
      <div class="sandbox-controls">
        <button type="button" onClick={props.onRestart}>
          start (R)
        </button>
        <button type="button" aria-pressed={playback.paused} onClick={props.onPause}>
          pauza (spacja)
        </button>
        <button type="button" disabled={!playback.paused} onClick={props.onStep}>
          tick (.)
        </button>
        {SPEEDS.map((speed) => (
          <button
            type="button"
            key={speed}
            aria-pressed={playback.speed === speed}
            onClick={() => props.onSpeed(speed)}
          >
            x{speed}
          </button>
        ))}
        {DEBUG_LABELS.map(([flag, label]) => (
          <label key={flag}>
            <input type="checkbox" checked={debug[flag]} onChange={() => props.onDebug(flag)} />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
