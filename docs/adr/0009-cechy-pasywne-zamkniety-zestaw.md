# ADR 0009: Cechy pasywne jako zamknięty zestaw sterowany danymi

- Status: zaakceptowany
- Data: 2026-10-02

## Kontekst

Autor gry nie chce umiejętności aktywnych, many ani cooldownów, ale chce, by bohaterowie mogli mieć proste, unikalne zdolności: leczenie siebie lub drużyny co pewien czas, pociski przebijające. System ma być otwarty na kolejne zdolności tego rodzaju.

Możliwe podejścia:

1. Ogólny silnik efektów: wyzwalacze, warunki i akcje składane w danych.
2. Zamknięty zestaw cech: każda cecha to nazwany wariant z parametrami w danych i kodem w symulacji.

Silnik ogólny przenosi logikę gry do JSON-ów, utrudnia utrzymanie zera alokacji i determinizmu, a przy kilku–kilkunastu cechach nie zwraca kosztu budowy.

## Decyzja

Wybieramy zamknięty zestaw.

- W danych jednostka ma listę `traits`; schemat Zod to unia dyskryminowana po polu `type`.
- Kompilacja treści spłaszcza cechy do pól `UnitSpec` (np. `pierce`, `healAmount`, `healInterval`, `healTeam`). Sim nie interpretuje list ani stringów.
- Każda cecha działa w ustalonej fazie ticka i zmienia HP wyłącznie przez wspólną kolejkę rozstrzyganą jednocześnie ([ARCHITECTURE.md §3.4](../ARCHITECTURE.md)).
- Na start: `periodicHeal` i `pierce` ([GAME_DESIGN.md §6](../GAME_DESIGN.md)).

Dodanie cechy wymaga: wariantu w schemacie, pól w `UnitSpec` i kompilacji, kodu w odpowiedniej fazie, testów jednostkowych z przypadkami brzegowymi, reguł walidatora, świadomej aktualizacji hashy golden oraz wpisu w GAME_DESIGN.md.

## Konsekwencje

- Parametry cech (wartości, interwały) balansuje się w danych; nowe zachowanie wymaga kodu i przeglądu.
- Jedna jednostka ma najwyżej jedną cechę danego typu. Łączenie różnych typów jest dozwolone.
- Wrogowie i bossowie używają tych samych cech co bohaterowie.
- Jeśli liczba cech przekroczy kilkanaście albo pojawi się potrzeba łączenia wyzwalaczy z akcjami, wrócimy do pytania o silnik ogólny w nowym ADR.
- `UnitSpec` rośnie o pola z każdą cechą; to akceptowalne przy 10 jednostkach w walce.

## Uzupełnienie z 2026-10-05

Zestaw ma sześć cech: `periodicHeal`, `pierce`, `enrage`, `lifesteal`, `splash` i `targetLast` (celowanie w koniec szyku wroga, GAME_DESIGN.md §6). `targetLast` jest pierwszą cechą, która zmienia wybór celu, a nie skutek trafienia. Zmieściła się w tym samym trybie pracy: flaga w `UnitSpec`, wybór celu w fazie decyzji, tryb pocisku w fazie pocisków (ADR 0007, uzupełnienie), reguły w `validateSetup` i walidatorze treści, testy i własna walka golden.
