import { describe, expect, it } from 'vitest';
import { createGate, type GateDeps, HOLD_MS } from './gate.ts';

/** Zależności bramy, które zapisują kolejność zdarzeń; ruch kończy się natychmiast. */
function recorder(reduced = false) {
  const log: string[] = [];
  const deps: GateDeps = {
    motion: {
      close: async (r) => {
        log.push(`close${r ? ' (bez ruchu)' : ''}`);
      },
      open: async (r) => {
        log.push(`open${r ? ' (bez ruchu)' : ''}`);
      },
    },
    reducedMotion: () => reduced,
    wait: async (ms) => {
      log.push(`wait ${ms}`);
    },
  };
  return { log, deps };
}

describe('brama', () => {
  it('przejście: zamyka, w zamknięciu zmienia scenę, czeka i otwiera', async () => {
    const { log, deps } = recorder();
    const gate = createGate(deps);
    const phases: string[] = [];
    await gate.pass(() => {
      phases.push(gate.phase.value);
      log.push('zmiana sceny');
    });
    expect(log).toEqual(['close', 'zmiana sceny', `wait ${HOLD_MS}`, 'open']);
    // Scena zmienia się dopiero, gdy brama jest zamknięta.
    expect(phases).toEqual(['closed']);
    expect(gate.phase.value).toBe('open');
    expect(gate.busy.value).toBe(false);
  });

  it('przejście przez zamkniętą bramę nie zamyka jej drugi raz', async () => {
    const { log, deps } = recorder();
    const gate = createGate(deps);
    await gate.close();
    expect(gate.phase.value).toBe('closed');
    await gate.pass(() => log.push('zmiana sceny'));
    expect(log).toEqual(['close', 'zmiana sceny', `wait ${HOLD_MS}`, 'open']);
  });

  it('wywołanie w trakcie ruchu nie zaczyna drugiego przejścia', async () => {
    const { log, deps } = recorder();
    const gate = createGate(deps);
    const first = gate.pass(() => log.push('pierwsza'));
    const second = gate.pass(() => log.push('druga'));
    expect(gate.busy.value).toBe(true);
    await Promise.all([first, second]);
    expect(log.filter((entry) => entry === 'pierwsza' || entry === 'druga')).toEqual(['pierwsza']);
  });

  it('fazy po kolei: zamykanie, zamknięta, otwieranie, otwarta', async () => {
    const { log, deps } = recorder();
    const seen: string[] = [];
    // Ruch zapisuje fazę bramy w chwili, gdy się zaczyna.
    const phaseNow = (): string => gate.phase.value;
    const gate = createGate({
      ...deps,
      motion: {
        close: async (r) => {
          seen.push(phaseNow());
          await deps.motion.close(r);
        },
        open: async (r) => {
          seen.push(phaseNow());
          await deps.motion.open(r);
        },
      },
    });
    await gate.pass(() => seen.push(phaseNow()));
    seen.push(phaseNow());
    expect(seen).toEqual(['closing', 'closed', 'opening', 'open']);
    // Otwarta brama nie otwiera się drugi raz.
    log.length = 0;
    await gate.open();
    expect(log).toEqual([]);
  });

  it('przy ograniczonym ruchu przekazuje to animacjom', async () => {
    const { log, deps } = recorder(true);
    await createGate(deps).pass(() => undefined);
    expect(log).toEqual(['close (bez ruchu)', `wait ${HOLD_MS}`, 'open (bez ruchu)']);
  });
});
