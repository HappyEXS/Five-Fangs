// Stary papier: tekstura arkuszy, przycisków i kafli mapy (ADR 0015, uzupełnienie). Szum SVG
// zamiast pliku graficznego: kilkaset bajtów, bez zapytań, skaluje się z ekranem. Kolor bazowy
// daje CSS (--sheet), tekstura tylko go przyciemnia ziarnem, włóknami i plamami.

/** Zamienia SVG na adres data: (CSP pozwala na obrazy data:, kod nie robi żadnych zapytań). */
function svgUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Bok kafla ziarna w pikselach; `stitchTiles` zszywa szum na krawędziach kafla. */
export const GRAIN_TILE = 240;

/**
 * Ziarno i włókna: drobne ciemne plamki oraz krótkie, rzadkie smugi włókien. Długie i gęste
 * smugi wyglądały jak słoje drewna, nie jak papier.
 * Kanał R szumu wyznacza przezroczystość brązu, więc tło prześwituje między plamkami.
 */
export const PAPER_GRAIN = svgUri(
  `<svg xmlns='http://www.w3.org/2000/svg' width='${GRAIN_TILE}' height='${GRAIN_TILE}'>` +
    `<filter id='s' x='0' y='0' width='100%' height='100%'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='3' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 0.29 0 0 0 0 0.18 0 0 0 0 0.07 1.25 0 0 0 -0.58'/>` +
    `</filter>` +
    `<filter id='f' x='0' y='0' width='100%' height='100%'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='0.04 0.28' numOctaves='2' seed='8' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 0.40 0 0 0 0 0.27 0 0 0 0 0.12 1.3 0 0 0 -0.72'/>` +
    `</filter>` +
    `<rect width='100%' height='100%' filter='url(#f)'/>` +
    `<rect width='100%' height='100%' filter='url(#s)'/>` +
    `</svg>`,
);

/** Plamy i przebarwienia: rzadkie, duże, miękkie; kafel większy, żeby się nie powtarzały. */
export const PAPER_STAINS = svgUri(
  `<svg xmlns='http://www.w3.org/2000/svg' width='560' height='560'>` +
    `<filter id='m' x='0' y='0' width='100%' height='100%'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='0.007' numOctaves='4' seed='21' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 0.45 0 0 0 0 0.28 0 0 0 0 0.09 1.9 0 0 0 -0.98'/>` +
    `</filter>` +
    `<rect width='100%' height='100%' filter='url(#m)'/>` +
    `</svg>`,
);

/**
 * Udostępnia tekstury arkuszom w CSS jako zmienne `--paper-grain` i `--paper-stains`. Bez tego
 * wywołania (np. w narzędziach dev) arkusze mają sam kolor papieru.
 */
export function installPaper(root: HTMLElement): void {
  root.style.setProperty('--paper-grain', `url("${PAPER_GRAIN}")`);
  root.style.setProperty('--paper-stains', `url("${PAPER_STAINS}")`);
}
