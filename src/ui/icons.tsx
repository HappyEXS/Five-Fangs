// Znaki graficzne interfejsu jako SVG w kodzie: bez plików, bez zapytań, skalują się z czcionką.
// Kieł jest znakiem rozpoznawczym gry: pięć kłów to pięć slotów składu.

/** Kształt kła w polu 40×52: szeroka nasada u góry, boki wklęsłe ku ostremu czubkowi. */
export const FANG_PATH = 'M9 2H31Q36 2 36 7C36 22 25 30 20 50C15 30 4 22 4 7Q4 2 9 2Z';

/** Skala wysokości kolejnych kłów znaku: środkowy najdłuższy, żeby rząd miał rytm szczęki. */
const MARK_HEIGHTS = [0.5, 0.58, 0.66, 0.58, 0.5];
const MARK_FANGS = [0, 1, 2, 3, 4];

/** Pięć kłów w rzędzie: znak gry obok jej nazwy. */
export function FangMark() {
  return (
    <svg class="fang-mark" viewBox="0 0 132 36" aria-hidden="true">
      {MARK_FANGS.map((i) => (
        <path
          key={i}
          transform={`translate(${4 + i * 26} 1) scale(0.5 ${MARK_HEIGHTS[i] ?? 0.5})`}
          d={FANG_PATH}
        />
      ))}
    </svg>
  );
}

export function Coin() {
  return (
    <svg class="icon icon-coin" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 6.5v11M9 9.5h4.2a1.8 1.8 0 010 3.6H9" />
    </svg>
  );
}

export function Lock() {
  return (
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.5 11V8a4.5 4.5 0 019 0v3" fill="none" />
      <rect x="5" y="11" width="14" height="10" rx="2" />
    </svg>
  );
}

export function Gear() {
  return (
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.5l2 2.6 3.2-.6.6 3.2 2.7 1.9-1.6 2.9 1.6 2.9-2.7 1.9-.6 3.2-3.2-.6-2 2.6-2-2.6-3.2.6-.6-3.2-2.7-1.9 1.6-2.9-1.6-2.9 2.7-1.9.6-3.2 3.2.6z"
        fill="none"
      />
      <circle cx="12" cy="12" r="3" fill="none" />
    </svg>
  );
}

/** Dwie sylwetki obok siebie: skład. */
export function SquadIcon() {
  return (
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="8" r="3.2" />
      <path d="M2.5 20c0-4 2.4-6 5.5-6s5.5 2 5.5 6z" />
      <circle cx="17" cy="9.5" r="2.6" />
      <path d="M15 20c0-3.2 1-4.8 2.6-5 2.4.2 4 2 4 5z" />
    </svg>
  );
}

/** Otwarta księga: informacje o bohaterach. */
export function BookIcon() {
  return (
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 6.5C9.5 4.8 6 4.6 3 5.4v13c3-.8 6.5-.6 9 1.1 2.5-1.7 6-1.9 9-1.1v-13c-3-.8-6.5-.6-9 1.1z" />
      <path d="M12 6.5v13" class="icon-hole" />
    </svg>
  );
}

/** Metka z ceną: sklep. */
export function TagIcon() {
  return (
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 4.5h8.5l9.5 9.5-7 7L4.5 11.5z" />
      <circle cx="8" cy="9" r="1.6" class="icon-hole" />
    </svg>
  );
}

/** Odcisk kła: poziom ukończony. */
export function FangStamp() {
  return (
    <svg class="icon icon-stamp" viewBox="0 0 40 52" aria-hidden="true">
      <path d={FANG_PATH} />
    </svg>
  );
}
