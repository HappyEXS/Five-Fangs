// Rysunek i ruch bramy (kolejność ruchów: gate.ts). Dwa żelazne skrzydła na całą scenę; ich
// wewnętrzne krawędzie to rzędy kłów, które po zamknięciu zazębiają się jak szczęki. Po uderzeniu
// skrzydeł rygle z prawego skrzydła wsuwają się w lewe; przy otwieraniu najpierw odskakują.
import type { Gate, GateMotion } from './gate.ts';

/** Geometria w jednostkach sceny (viewBox 1280×720), wspólna dla obu skrzydeł. */
const WIDTH = 1280;
const HEIGHT = 720;
const SEAM = WIDTH / 2;
/** Kły sięgają tyle w każdą stronę od środka; między płytami jest pas kłów 2 × TOOTH. */
const TOOTH = 58;
/** Wysokość jednego kła: pięć kłów na lewym skrzydle. */
const TOOTH_SPAN = HEIGHT / 5;
const LEFT_EDGE = SEAM - TOOTH;
const RIGHT_EDGE = SEAM + TOOTH;
/** Pasy wzmocnień: środek w pionie; po nich jeżdżą rygle. */
const BANDS = [120, 600];
const BAND_HALF = 20;
/** Rygiel: długość i przesunięcie przy zamykaniu (w lewo, przez szczelinę). */
const BOLT_LENGTH = 150;
const BOLT_TRAVEL = 250;
const RIVET_STEP = 64;
const PLANKS = [150, 300, 450];

/** Skrzydło za kulisami: przesunięte o tyle szerokości sceny, że kły też znikają. */
const DOOR_OUT = 56;

const range = (count: number): number[] => Array.from({ length: count }, (_, i) => i);
const points = (list: readonly (readonly [number, number])[]): string =>
  list.map(([x, y]) => `${x},${y}`).join(' ');

/** Lewe skrzydło; prawe to jego lustro z kłami przesuniętymi o pół kła, żeby się zazębiały. */
function Door(props: { side: 'left' | 'right' }) {
  const left = props.side === 'left';
  /** Odbija współrzędną X dla prawego skrzydła. */
  const x = (value: number): number => (left ? value : WIDTH - value);
  const plateEdge = left ? LEFT_EDGE : RIGHT_EDGE;
  const teeth = left
    ? range(5).map((k) => ({
        root: [k * TOOTH_SPAN, (k + 1) * TOOTH_SPAN] as const,
        tip: k * TOOTH_SPAN + TOOTH_SPAN / 2,
      }))
    : range(6).map((k) => ({
        root: [k * TOOTH_SPAN - TOOTH_SPAN / 2, k * TOOTH_SPAN + TOOTH_SPAN / 2] as const,
        tip: k * TOOTH_SPAN,
      }));
  const tipX = left ? RIGHT_EDGE : LEFT_EDGE;
  return (
    <>
      <rect
        class="gate-plate"
        x={left ? -20 : RIGHT_EDGE}
        y={-20}
        width={LEFT_EDGE + 20}
        height={HEIGHT + 40}
      />
      {PLANKS.map((plank) => (
        <g key={plank}>
          <line class="gate-plank" x1={x(plank)} y1={0} x2={x(plank)} y2={HEIGHT} />
          {/* Jaśniejsza krawędź deski: płaskie żelazo bez gradientu, ale z fazą. */}
          <line class="gate-glint" x1={x(plank + 7)} y1={0} x2={x(plank + 7)} y2={HEIGHT} />
        </g>
      ))}
      {BANDS.map((band) => (
        <rect
          key={band}
          class="gate-band"
          x={left ? -20 : RIGHT_EDGE}
          y={band - BAND_HALF}
          width={LEFT_EDGE + 20}
          height={BAND_HALF * 2}
        />
      ))}
      {BANDS.flatMap((band) =>
        range(Math.floor(LEFT_EDGE / RIVET_STEP)).map((i) => (
          <circle
            key={`${band}:${i}`}
            class="gate-rivet"
            cx={x(RIVET_STEP / 2 + i * RIVET_STEP)}
            cy={band}
            r={6}
          />
        )),
      )}
      {range(10).map((i) => (
        <circle
          key={`edge:${i}`}
          class="gate-rivet"
          cx={x(LEFT_EDGE - 30)}
          cy={36 + i * 72}
          r={7}
        />
      ))}
      {/* Kły lewego skrzydła są jaśniejsze niż prawego: po zamknięciu widać dwie szczęki. */}
      {teeth.map(({ root, tip }) => (
        <polygon
          key={tip}
          class="gate-tooth"
          points={points([
            [plateEdge, root[0]],
            [tipX, tip],
            [plateEdge, root[1]],
          ])}
        />
      ))}
      <line class="gate-edge" x1={plateEdge} y1={0} x2={plateEdge} y2={HEIGHT} />
    </>
  );
}

export interface GateParts {
  root: HTMLDivElement | null;
  left: SVGSVGElement | null;
  right: SVGSVGElement | null;
  bolts: SVGGElement | null;
}

/** Odtwarza animację do końca i zostawia element w stanie końcowym. */
async function run(
  element: Element | null,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Promise<void> {
  if (element === null) return;
  const animation = element.animate(keyframes, { ...options, fill: 'forwards' });
  try {
    await animation.finished;
  } catch {
    // Animację przerwało odmontowanie bramy; nic do zrobienia.
    return;
  }
  animation.commitStyles();
  animation.cancel();
}

const DOOR_OPEN_LEFT = `translateX(-${DOOR_OUT}%)`;
const DOOR_OPEN_RIGHT = `translateX(${DOOR_OUT}%)`;
const DOOR_SHUT = 'translateX(0)';
const BOLT_LOCKED = `translateX(-${BOLT_TRAVEL}px)`;
const BOLT_FREE = 'translateX(0)';
/** Drgnięcie sceny po uderzeniu skrzydeł: kilka malejących wychyleń. */
const SLAM = ['0', '-0.35em', '0.3em', '-0.18em', '0.1em', '0'].map((shift) => ({
  transform: `translateX(${shift})`,
}));
const JOLT = ['0', '0.12em', '-0.08em', '0'].map((shift) => ({
  transform: `translateX(${shift})`,
}));

/** Ruch bramy na Web Animations API; przy ograniczonym ruchu sama zmiana przezroczystości. */
export function createGateMotion(parts: GateParts): GateMotion {
  const place = (left: string, right: string, bolts: string): void => {
    if (parts.left !== null) parts.left.style.transform = left;
    if (parts.right !== null) parts.right.style.transform = right;
    if (parts.bolts !== null) parts.bolts.style.transform = bolts;
  };
  return {
    async close(reduced) {
      if (reduced) {
        place(DOOR_SHUT, DOOR_SHUT, BOLT_LOCKED);
        await run(parts.root, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
        return;
      }
      if (parts.root !== null) parts.root.style.opacity = '1';
      // Skrzydła przyspieszają aż do uderzenia: ciężkie żelazo, nie szuflada.
      const shut = { duration: 430, easing: 'cubic-bezier(0.6, 0, 0.95, 0.55)' };
      await Promise.all([
        run(parts.left, [{ transform: DOOR_OPEN_LEFT }, { transform: DOOR_SHUT }], shut),
        run(parts.right, [{ transform: DOOR_OPEN_RIGHT }, { transform: DOOR_SHUT }], shut),
      ]);
      await run(parts.root, SLAM, { duration: 170 });
      await run(parts.bolts, [{ transform: BOLT_FREE }, { transform: BOLT_LOCKED }], {
        duration: 150,
        easing: 'cubic-bezier(0.5, 0, 1, 1)',
      });
    },
    async open(reduced) {
      if (reduced) {
        await run(parts.root, [{ opacity: 1 }, { opacity: 0 }], { duration: 160 });
        place(DOOR_OPEN_LEFT, DOOR_OPEN_RIGHT, BOLT_FREE);
        return;
      }
      await run(parts.bolts, [{ transform: BOLT_LOCKED }, { transform: BOLT_FREE }], {
        duration: 130,
        easing: 'ease-out',
      });
      await run(parts.root, JOLT, { duration: 90 });
      const part = { duration: 560, easing: 'cubic-bezier(0.5, 0, 0.2, 1)' };
      await Promise.all([
        run(parts.left, [{ transform: DOOR_SHUT }, { transform: DOOR_OPEN_LEFT }], part),
        run(parts.right, [{ transform: DOOR_SHUT }, { transform: DOOR_OPEN_RIGHT }], part),
      ]);
    },
  };
}

export function GateView(props: { gate: Gate; parts: GateParts }) {
  const { parts } = props;
  return (
    <div
      ref={(element) => {
        parts.root = element;
      }}
      class="gate"
      data-phase={props.gate.phase.value}
      aria-hidden="true"
    >
      <svg
        ref={(element) => {
          parts.left = element;
        }}
        class="gate-door gate-left"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <Door side="left" />
      </svg>
      <svg
        ref={(element) => {
          parts.right = element;
        }}
        class="gate-door gate-right"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <Door side="right" />
        <g
          ref={(element) => {
            parts.bolts = element;
          }}
          class="gate-bolts"
        >
          {BANDS.map((band) => (
            <rect
              key={band}
              class="gate-bolt"
              x={RIGHT_EDGE + 20}
              y={band - 11}
              width={BOLT_LENGTH}
              height={22}
              rx={6}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
