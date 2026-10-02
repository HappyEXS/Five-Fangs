# ADR 0005: Wersjonowany zapis w `localStorage` z łańcuchem migracji

- Status: zaakceptowany
- Data: 2026-10-02

## Kontekst

Gra nie ma backendu, więc postęp gracza istnieje tylko w jego przeglądarce. Projekt będzie rozwijany miesiącami i kształt zapisu na pewno się zmieni. Utrata postępu po aktualizacji jest niedopuszczalna.

## Decyzja

1. Zapis to jeden obiekt JSON w `localStorage` z polami `saveVersion` i `gameVersion`. Kształt wersji 1: [ARCHITECTURE.md §6.2](../ARCHITECTURE.md).
2. Dostęp do `localStorage` ma wyłącznie moduł zapisu w `game`.
3. Wczytanie: parsowanie → migracje `vN → vN+1` po kolei → walidacja schematem Zod bieżącej wersji.
4. Każda zmiana kształtu podnosi `saveVersion`, dodaje migrację i fixture w `tests/fixtures/saves/` z testem. Migracji nie usuwamy.
5. Błąd parsowania, migracji lub walidacji: uszkodzony zapis jest kopiowany pod osobny klucz, gra startuje z nowym zapisem i informuje gracza.
6. Zapis z `saveVersion` wyższym niż obsługiwany nie jest nadpisywany; gra prosi o odświeżenie strony.
7. Gracz może wyeksportować zapis do pliku i zaimportować go z pliku.

## Konsekwencje

- Zapis jest mały (złoto, 6 linii, kilkanaście run, 30 poziomów), więc limit `localStorage` nie jest problemem. Przejście na IndexedDB rozważymy dopiero przy zapisie powyżej ok. 1 MB.
- Zapis jest zgodny w przód, ale nie wstecz: rollback wersji gry, która podniosła `saveVersion`, zostawia graczy z prośbą o odświeżenie ([DEPLOY.md §8](../DEPLOY.md)).
- Wyczyszczenie danych przeglądarki usuwa postęp. Jedynym zabezpieczeniem jest eksport do pliku.
- Statystyki bohaterów nie są zapisywane; liczy je `resolveUnitSpec` z danych treści, więc zmiana balansu działa na istniejące zapisy bez migracji.
