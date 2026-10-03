// Wzór papieru dla grafik SVG (kafle mapy): kolor arkusza i ta sama tekstura ziarna co w CSS.
// CSS odwołuje się do niego przez `fill: url(#ff-paper)`.
import { GRAIN_TILE, PAPER_GRAIN } from './paper.ts';

/** Bok wzoru w jednostkach kafla mapy (viewBox 100×80): ziarno w skali zbliżonej do okien. */
const PATTERN = 180;

export function PaperDefs() {
  return (
    <svg class="paper-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="ff-paper" patternUnits="userSpaceOnUse" width={PATTERN} height={PATTERN}>
          <rect width={PATTERN} height={PATTERN} style={{ fill: 'var(--sheet)' }} />
          <image
            href={PAPER_GRAIN}
            width={PATTERN}
            height={PATTERN}
            data-tile={GRAIN_TILE}
            preserveAspectRatio="none"
          />
        </pattern>
      </defs>
    </svg>
  );
}
