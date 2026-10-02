# Testy golden

Ustalone walki z [setups.ts](setups.ts) są rozgrywane do końca, a ich wynik (zwycięzca, powód, czas, końcowe HP, hash stanu i hash logu zdarzeń) porównywany z migawką w `__snapshots__/`. Każda walka jest też rozgrywana dwa razy i oba przebiegi muszą być identyczne.

## Kiedy test golden nie przechodzi

Różnica w hashu oznacza, że symulacja zachowuje się inaczej niż wtedy, gdy zapisano migawkę.

1. Ustal przyczynę. Jeśli zmiana zachowania nie była zamierzona, to błąd: napraw kod, nie migawkę.
2. Jeśli zmiana jest zamierzona (nowa reguła, poprawka reguły), zaktualizuj migawki:

   ```bash
   docker compose exec dev pnpm test:golden -u
   ```

3. Przejrzyj diff pliku `.snap`: które walki się zmieniły i czy pasuje to do zmiany. Walki, których zmiana nie powinna dotyczyć, nie mogą zmienić hasha.
4. W opisie commita napisz, które goldeny się zmieniły i dlaczego.

Nie aktualizuj migawek tylko po to, żeby testy przeszły.

## Dodawanie walk

Nowa mechanika dostaje własną walkę w `setups.ts`. Dodanie walki nie zmienia istniejących hashy. Setupy nie korzystają z danych treści gry, żeby zmiana balansu nie ruszała goldenów.

## Czego te testy nie sprawdzają

Testy działają w Node. Zgodność bit w bit między silnikami JS wynika z zasad symulacji (tylko liczby całkowite, bez funkcji przestępnych, bez losowości i zegara), których pilnuje `pnpm deps:check`. Uruchomienie tych samych walk w przeglądarkach dojdzie razem z testem Playwright w M4.
