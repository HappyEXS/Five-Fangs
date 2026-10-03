# ADR 0012: Własny skrypt granic modułów zamiast dependency-cruiser

- Status: zaakceptowany (odstępstwo od briefu startowego, §2)
- Data: 2026-10-02

## Kontekst

Brief wskazywał dependency-cruiser (albo reguły Biome) do wymuszania dozwolonych kierunków importów w CI. Projekt używa TypeScript 7. dependency-cruiser 18.5 korzysta z API kompilatora TypeScript w wersjach poniżej 7 i z TypeScript 7 nie widzi plików `.ts` w ogóle (`depcruise --info` pokazuje rozszerzenie `.ts` jako nieobsługiwane).

Możliwości:

1. Cofnąć TypeScript do wersji 6.
2. Doinstalować drugi kompilator (swc) tylko po to, by dependency-cruiser mógł parsować pliki.
3. Wyrazić reguły przez `noRestrictedImports` w Biome z nadpisaniami per katalog.
4. Napisać własny skrypt.

Reguły projektu są proste: siedem katalogów, tabela dozwolonych kierunków, jeden wyjątek dla importów typów. Chcemy też sprawdzać rzeczy, których żadne z gotowych narzędzi nie robi wprost: listę pakietów zewnętrznych dozwolonych w warstwie oraz zakazane API w `sim`.

## Decyzja

Granice modułów sprawdza `scripts/check-deps.ts` (`pnpm deps:check`), bez zależności zewnętrznych. Logika jest w `scripts/lib/module-boundaries.ts` i ma testy jednostkowe.

Skrypt sprawdza dla każdego pliku w `src/`:

- kierunki importów między warstwami według tabeli z [ARCHITECTURE.md §1](../ARCHITECTURE.md), w tym regułę „`content` importuje z `sim` tylko typy”;
- pakiety zewnętrzne dozwolone w warstwie (`core` i `sim` nie mogą importować żadnych; pliki testowe mogą dodatkowo używać `vitest` i modułów `node:`);
- że dynamiczne importy poza narzędziami mają literał jako ścieżkę;
- że `src/sim` nie używa losowości, zegara, funkcji przestępnych, potęgowania ani tablic zmiennoprzecinkowych (ADR 0002).

## Konsekwencje

- Zero dodatkowych zależności deweloperskich; sprawdzenie trwa milisekundy.
- Importy są wykrywane wyrażeniami regularnymi po usunięciu komentarzy, nie parserem. Tekst wyglądający jak import wewnątrz napisu może dać fałszywy alarm; w praktyce dotyczy to tylko testów samego skryptu, które leżą poza `src/`.
- Tylko `import type ... from` liczy się jako import typów. `import { type X }` przy `verbatimModuleSyntax` zostawia import w kodzie wynikowym, więc jest traktowany jak zwykły.
- Importy względne muszą mieć jawne rozszerzenie pliku, co i tak wymusza uruchamianie skryptów bezpośrednio przez Node.
- Dodanie nowej warstwy albo nowego pakietu runtime wymaga zmiany tabel w skrypcie, czyli świadomej decyzji widocznej w przeglądzie kodu.
- Skrypt nie wykrywa cykli w obrębie jednej warstwy. Jeśli staną się problemem, wrócimy do gotowego narzędzia.
