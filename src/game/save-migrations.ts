// Migracje zapisu vN → vN+1 (ADR 0005). Klucz to wersja wejściowa. Starych migracji nigdy
// nie usuwamy: gracz może wrócić z zapisem z dowolnej wcześniejszej wersji gry.
//
// Każda migracja ma test z zapisanym przykładowym plikiem w tests/fixtures/saves/.

export type Migration = (save: Record<string, unknown>) => Record<string, unknown>;

export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  // Wersja 1 jest pierwszą; pierwsza migracja będzie miała klucz 1 i zwróci zapis w wersji 2.
};
