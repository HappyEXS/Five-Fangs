// Znaczniki kodu, który nie może trafić do builda produkcyjnego.
// Wejście narzędzi dev oraz moduły debug w rendererze odwołują się do tych stałych,
// a `pnpm check:dist` szuka ich w dist/. Znalezienie znacznika oznacza, że kod
// deweloperski przeciekł do paczki (ADR 0010).

export const DEV_TOOLS_MARKER = 'ff:dev-tools';
export const DEBUG_MARKER = 'ff:debug-only';
