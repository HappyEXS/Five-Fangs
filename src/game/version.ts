// Wersja gry wpieczona w paczkę przy buildzie. Te same dane leżą w dist/version.json.

export interface GameVersion {
  version: string;
  commit: string;
  builtAt: string;
}

export const gameVersion: GameVersion = {
  version: __APP_VERSION__,
  commit: __APP_COMMIT__,
  builtAt: __APP_BUILT_AT__,
};

/** Krótka etykieta dla gracza i raportów, np. `0.1.0 (5c1b596)`. */
export function versionLabel(v: GameVersion): string {
  return `${v.version} (${v.commit.slice(0, 7)})`;
}
