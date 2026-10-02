# Roadmap – Five Fangs

Milestone'y rozbite na zadania wielkości 0,5–2 dni. Każdy milestone kończy się działającym, wdrożonym buildem. Po ukończeniu zadania zmień jego status w tym pliku.

Statusy: `—` do zrobienia · `w toku` · `gotowe`.

Każde zadanie kończy się przejściem `pnpm typecheck && pnpm lint && pnpm test && pnpm validate-content`; poniższe kryteria są dodatkowe.

## Etap planowania

| Zadanie | Status |
|---|---|
| Uzgodnienie pytań otwartych, dokumenty planistyczne, ADR 0001–0010 | gotowe (2026-10-02) |

## M0 – Fundamenty i deploy (ok. 6 dni)

Cel: puste, ale kompletne repozytorium z CI i działającym deployem na Render.

| Id | Zadanie | Dni | Kryterium ukończenia | Status |
|---|---|---|---|---|
| M0-1 | Repozytorium i narzędzia: `git init`, pnpm (Corepack, `packageManager`), `.node-version`, TypeScript strict, Vite z `base: './'`, Biome, Vitest | 0,5 | `pnpm dev` pokazuje pustą stronę; `typecheck`, `lint`, `test` przechodzą | gotowe |
| M0-2 | Struktura katalogów i granice modułów (własny skrypt, ADR 0012; `pnpm deps:check`) | 0,5 | Celowo zabroniony import (np. `sim` → `render`) powoduje błąd `deps:check` | gotowe |
| M0-3 | `core`: matematyka całkowita, hash FNV-1a, pętla stałego kroku (akumulator, limit skoku, mnożnik prędkości, pauza), pule, RNG dla kosmetyki | 1,5 | Testy jednostkowe; pętla testowana na sztucznym zegarze | gotowe |
| M0-4 | Pusta scena: canvas 1280×720 z letterboxem i DPR ≤ 2, nakładka Preact, szkielet i18n (PL/EN) | 0,5 | Strona skaluje się poprawnie przy zmianie okna; tekst testowy w obu językach | gotowe |
| M0-5 | Wersja builda: `version.json`, `define`, numer wersji na ekranie | 0,5 | `dist/version.json` zawiera wersję, skrót commita i datę | gotowe |
| M0-6 | Obsługa błędów ładowania: wspólna funkcja dla dynamicznych importów, bufor błędów w pamięci | 0,5 | Test: nieudany import pokazuje komunikat o nowej wersji | gotowe |
| M0-7 | CI (`ci.yml`): wszystkie kroki z [DEPLOY.md §5](DEPLOY.md), `scripts/check-size.ts`, test czystości `dist/` | 1 | CI zielone na PR; sztucznie zawyżony plik powoduje błąd `check:size` | w toku: wszystkie kroki przechodzą lokalnie, workflow czeka na pierwszy push |
| M0-8 | Deploy: weryfikacja limitów Render, `render.yaml`, `public/_headers`, `smoke.yml`, sprawdzenie nagłówków `curl -I`, uzupełnienie DEPLOY.md i ADR 0006 | 1 | Gra dostępna pod `onrender.com`; smoke check zielony; wszystkie pozycje **[do potwierdzenia]** w DEPLOY.md uzupełnione | w toku: konfiguracja i skrypty gotowe i sprawdzone lokalnie; zostają kroki z [DEPLOY.md §6](DEPLOY.md) wymagające konta Render |

## M1 – Symulacja headless (ok. 14 dni)

Cel: pełna logika walki w Node, z treścią testową, testami golden i raportem balansu. Bez grafiki.

| Id | Zadanie | Dni | Kryterium ukończenia | Status |
|---|---|---|---|---|
| M1-1 | Typy i stan sim: `UnitSpec`, `ArenaSpec`, `BattleSetup`, `BattleState`, `createBattle`, hash stanu | 1 | Jednostki stoją na slotach; hash stabilny między uruchomieniami | gotowe |
| M1-2 | Treść: schematy i kompilacja areny, typów ataków i jednostek; `pnpm validate-content`; jednostki testowe (swordsman, archer) | 1,5 | Walidator odrzuca błędne odwołanie i `attackInterval < swingTicks`; testy wzorów kompilacji | gotowe |
| M1-3 | Decyzje i ruch: wybór celu, blokada celu w zamachu, ruch niezależny od sojuszników | 1 | Testy: remis odległości, sojusznicy mijają się i nachodzą na siebie, brak mijania się wrogów | gotowe |
| M1-4 | Ataki melee i rozstrzygnięcie: zamach i odstęp, kolejka zmian, śmierci, koniec walki, limit czasu | 1,5 | Testy: jednoczesna śmierć, cel ginie w trakcie zamachu, limit czasu = przegrana | gotowe |
| M1-5 | Pociski fizyczne: wystrzał, test trafienia względnego, pierwszy na drodze, wygaśnięcie | 1,5 | Testy: cel ginie w locie, wróg idący naprzeciw nie przeskakuje pocisku, remis pozycji | gotowe |
| M1-6 | Odrzut: statystyka `knockback`, kolejka odrzutu, przesunięcie w rozstrzygnięciu, odrzut z pocisków | 1 | Testy: różnica statystyk i brak ruchu przy równych, suma kilku trafień w ticku, przycięcie do krawędzi pola, zamach odrzuconego trwa i trafia, wzajemne trafienie w tym samym ticku | gotowe |
| M1-7 | Zdarzenia i wynik: bufor zdarzeń, `drainEvents`, `BattleResult`, `runBattleToEnd` | 1 | Test: pełny log zdarzeń walki 1 na 1 zgodny z oczekiwanym | gotowe |
| M1-8 | Testy golden: `tests/golden/`, `pnpm test:golden`, opis procedury aktualizacji | 1 | Co najmniej 6 ustalonych walk; zmiana jednej statystyki zmienia hash | gotowe |
| M1-9 | Runner i pomiary: `scripts/run-battle.ts`, benchmark, próg pokrycia `sim` | 0,5 | > 2000 walk/s w Node, tick < 0,2 ms, pokrycie `sim` > 90% | gotowe: 2270–2380 walk/s, tick ok. 480 ns, 97% linii |
| M1-10 | Cechy pasywne, część 1: pola cech w `UnitSpec`, schemat `traits`, `periodicHeal` (self i team), zdarzenie `Healed` | 1,5 | Testy: leczenie ratuje przed śmiercią w tym samym ticku, przycięcie do `maxHp`, martwy nie jest leczony; nowe hashe golden opisane w commicie | gotowe |
| M1-11 | Cechy pasywne, część 2: `pierce` | 1 | Testy: każdy wróg trafiony najwyżej raz i każdy odrzucony; walidator odrzuca `pierce` u melee | gotowe |
| M1-12 | Progresja w danych: schematy linii, run, światów i poziomów; `resolveUnitSpec` (ranga, runy) | 1 | Testy skalowania i premii z run; walidator sprawdza komplet form i kosztów | gotowe |
| M1-13 | Skrypt balansu: `pnpm balance`, składy referencyjne, raport `reports/balance.md` | 1 | Raport dla poziomów testowych: wynik, czas, zapas HP, najniższa wygrywająca ranga | gotowe |

## M2 – Renderer i rig (ok. 12 dni)

Cel: walka widoczna na ekranie, port prototypu na docelową architekturę, piaskownica do testów.

| Id | Zadanie | Dni | Kryterium ukończenia | Status |
|---|---|---|---|---|
| M2-1 | Szkielet renderera: interfejs `Renderer`, integracja z pętlą, interpolacja, jednostki jako prostokąty | 1 | Walka z M1 odtwarza się płynnie przy x1/x2/x4 | gotowe |
| M2-2 | Generator części placeholder i ładowanie atlasu; warianty ciemny i biała sylwetka | 1,5 | Atlas ładowany przez import Vite; warianty generowane raz przy ładowaniu | gotowe |
| M2-3 | Rig: schemat, kompilacja kości, macierze w `Float32Array`, kolejność rysowania, odbicie dla przeciwnika, skórki | 1,5 | Postać w pozie spoczynkowej zgodna z prototypem; profiler nie pokazuje alokacji | gotowe; alokacje zmierzone w M2-10 |
| M2-4 | Klipy: schemat, kompilacja, próbkowanie smoothstep, znaczniki; port idle, walk, slash, shoot | 1,5 | Walidator sprawdza zgodność znacznika `hit` z `hitFraction` | gotowe |
| M2-5 | Sterowanie animacją ze stanu sim: mapowanie stanów, postęp ataku z sim, faza chodu z dystansu, blend pozy, śmierć | 1,5 | Trafienie w animacji wypada w ticku trafienia z sim przy każdej prędkości | gotowe |
| M2-6 | Pociski i elementy dynamiczne: pula sprite'ów pocisków, cięciwa łuku | 1 | Strzała widoczna od wystrzału do trafienia lub krawędzi pola | gotowe |
| M2-7 | Efekty: błysk trafienia, liczby obrażeń i leczenia z puli, płynne pokazanie odrzutu | 1 | Każde zdarzenie `Damaged`, `Healed` i `KnockedBack` ma efekt; brak alokacji | gotowe; alokacje zmierzone w M2-10 |
| M2-8 | Debug: pivoty i ramki, zasięgi i cele, overlay wydajności, krokowanie | 1 | Przełączane klawiszami w dev; brak w `dist/` | gotowe |
| M2-9 | Piaskownica walki: `tools.html`, dowolne składy, krokowanie, prędkość | 1,5 | Dowolna walka z testów golden daje się obejrzeć w piaskownicy | gotowe (`pnpm battle golden:<nazwa> --link`) |
| M2-10 | Pomiar wydajności i zapis wyników | 0,5 | Render klatki < 4 ms na desktopie przy 10 jednostkach; 0 alokacji w stanie ustalonym; liczby zapisane w ARCHITECTURE.md | czas klatki: gotowe (0,39 ms JS); alokacje: 285 B na klatkę zamiast 0, do decyzji w ADR 0013 |

## M3 – Edytor animacji i potok atlasów (ok. 7 dni)

| Id | Zadanie | Dni | Kryterium ukończenia | Status |
|---|---|---|---|---|
| M3-1 | `pnpm atlas`: pakowanie `assets/src/` do `src/assets/generated/` (WebP + JSON z pivotami), części w 2× | 1,5 | Atlas placeholderów przechodzi przez potok; `check:size` pilnuje budżetu atlasu | gotowe (bezstratny WebP, ADR 0014; limit 1 MB na atlas sprawdza też sam `pnpm atlas`) |
| M3-2 | Edytor: podgląd postaci, wybór rigu, skórki i klipu, suwaki kątów | 1,5 | Zmiana suwaka widoczna natychmiast na postaci | gotowe (`/tools.html?view=anim`) |
| M3-3 | Edytor: oś czasu, dodawanie i usuwanie klatek kluczowych, odtwarzanie | 2 | Klip walk z prototypu daje się odtworzyć od zera w edytorze | gotowe; test odtwarza każdy klip rigu od zera operacjami edytora |
| M3-4 | Edytor: znaczniki, eksport i import JSON klipu | 1 | Eksportowany klip przechodzi `validate-content` bez ręcznych poprawek | gotowe; panel pokazuje wynik walidacji treści na żywo |
| M3-5 | Druga skórka placeholder na tym samym rigu | 1 | Dwie formy jednej linii różnią się wyglądem, dzieląc klipy | gotowe; formy B mają inną sylwetkę (grzebień, pióro, broń), nie tylko kolory |

## M4 – Pętla gry (ok. 14 dni)

Cel: grywalna całość na treści testowej, od menu do nagrody, z zapisem.

| Id | Zadanie | Dni | Kryterium ukończenia | Status |
|---|---|---|---|---|
| M4-1 | Sceny i stan aplikacji w sygnałach | 1 | Przejście menu → mapa → skład → walka → wynik → mapa | gotowe |
| M4-2 | Zapis v1: schemat, wczytanie z walidacją, kopia zapasowa, szkielet migracji, eksport i import pliku | 1,5 | Testy: uszkodzony zapis nie wywraca gry; fixture v1 w `tests/fixtures/saves/` | gotowe |
| M4-3 | Menu główne i ustawienia: język, wersja, „Zgłoś problem” | 1 | Raport w schowku zawiera wersję, błędy i setup ostatniej walki | gotowe |
| M4-4 | Mapa poziomów: 5 światów po 6, odblokowywanie kolejno | 1,5 | Zablokowany poziom nie daje się uruchomić | gotowe (na razie jeden świat testowy w treści; mapa rysuje tyle światów, ile jest w danych) |
| M4-5 | Budowanie składu: wybór bohaterów, przeciąganie na sloty, podgląd statystyk efektywnych | 2 | Działa myszą i dotykiem; skład zapisuje się automatycznie | gotowe (mysz sprawdzona w przeglądarce; dotyk tym samym kodem Pointer Events, bez testu na urządzeniu) |
| M4-6 | Scena walki i HUD: pauza, prędkość, wyjście; leniwe ładowanie atlasu świata z obsługą błędu | 1,5 | Wyjście z walki zwalnia sim i renderer (brak wycieku w profilerze) | gotowe; sterta po 5/35/65 walkach: 9157/9261/9310 KB |
| M4-7 | Wynik i nagrody: złoto, runa, odblokowanie linii; 25% złota za powtórkę | 1 | Testy logiki nagród w `game` | gotowe |
| M4-8 | Ulepszenia i ewolucja | 1,5 | Testy: koszt, blokada bez złota, ewolucja dopiero po 4 ulepszeniach | gotowe |
| M4-9 | Runy: posiadane runy, 2 sloty, przekładanie | 1,5 | Statystyki w podglądzie zgodne z `resolveUnitSpec` | gotowe |
| M4-10 | Wykrywanie nowej wersji przy zmianie sceny; ochrona zapisu z nowszej wersji | 0,5 | Test: nowszy `saveVersion` nie jest nadpisywany | gotowe |
| M4-11 | Test Playwright na `vite preview` w CI | 1 | Gra startuje, walka dochodzi do końca, konsola bez błędów | gotowe lokalnie (3 testy przechodzą w kontenerze); krok dodany do `ci.yml`, na GitHubie jeszcze nie uruchomiony |

## M5 – Treść (zakres po decyzjach autora z 2026-10-02)

Cel: komplet mechanik grywalny na jednym świecie testowym. Autor gry zdecydował, że pozostałe cztery linie bohaterów i światy 2–5 uzupełni przy wykańczaniu gry; do tego czasu M5 obejmuje dwie linie testowe i świat „Las”. Zadania M5-3b i M5-5b czekają na jego dane.

| Id | Zadanie | Dni | Kryterium ukończenia | Status |
|---|---|---|---|---|
| M5-1 | Decyzje projektowe z autorem gry: roster, cechy, światy, runy | 1 | GAME_DESIGN.md §9 zapisuje, co ustalone, a co czeka | gotowe |
| M5-2a | Cecha `enrage`: schemat, symulacja, testy, golden | 1 | Jak M1-10 | gotowe |
| M5-2b | Cecha `lifesteal`: schemat, symulacja, testy, golden | 1 | Jak M1-10 | gotowe |
| M5-2c | Cecha `splash`: schemat, symulacja, testy, golden | 1,5 | Jak M1-10 | gotowe |
| M5-3 | Dwie linie testowe: forma B z innym typem ataku (nowe typy ataku, klipy, postawy) | 1,5 | Ewolucja zmienia animację, czas zamachu i zachowanie ataku; klipy przechodzą walidator | gotowe: Rycerz ma typ ataku `cleave`, Strzelec wyborowy `snipe` (nowe klipy i postawa `longbow`) |
| M5-3b | Pozostałe cztery linie bohaterów | — | Czeka na roster od autora gry | wstrzymane |
| M5-4 | Wrogowie: jednostki bohaterów jako przeciwnicy oraz jednostki specjalne ze skórkami placeholder | 1,5 | Poziom może wskazać dowolną jednostkę; specjalnych nie ma w liniach gracza | gotowe: Osiłek, Łupieżca, Szaman, Herszt |
| M5-5 | Świat testowy „Las”: 6 poziomów z bossem, każda cecha występuje co najmniej raz | 1 | Poziomy przechodzą walidację; skład referencyjny dla każdego | gotowe |
| M5-5b | Światy 2–5 | — | Czeka na motywy od autora gry | wstrzymane |
| M5-6 | Runy w trzech wielkościach, koszty i nagrody świata „Las” | 1 | Raport balansu: każdy poziom wygrywalny przy zakładanej randze, niewygrywalny wyraźnie poniżej | gotowe: raport balansu zgodny na wszystkich sześciu poziomach |
| M5-7 | Iteracje balansu z `pnpm balance` | 1 | Raport do zatwierdzenia przez autora gry | raport w `reports/balance.md` czeka na ocenę autora gry |
| M5-8 | Komplet tekstów PL i EN | 0,5 | Walidator: brak brakujących kluczy w obu językach | gotowe dla obecnej treści |

## M5b – Uwagi autora po pierwszym przejściu gry (2026-10-02)

| Id | Zadanie | Dni | Kryterium ukończenia | Status |
|---|---|---|---|---|
| M5b-1 | Płaska scena: bez perspektywy i ścieżek slotów, postacie na linii podłogi; sloty w jednym rzędzie | 0,5 | Wszystkie postacie stoją na jednej wysokości; sloty w UI w jednym rzędzie | gotowe |
| M5b-2 | Bohaterowie jako egzemplarze: zapis v2 z migracją z v1, reguły progresji po id bohatera | 1,5 | Fixture v1 migruje do v2; w składzie może stać kilku bohaterów tej samej linii | gotowe |
| M5b-3 | Sklep: zakup nowych linii i kolejnych egzemplarzy za złoto; dwie linie testowe do kupienia | 1 | Testy reguł zakupu; zakup widoczny w zapisie i składzie | gotowe |
| M5b-4 | Panel główny z wejściami Mapa, Skład, Sklep; mapa bez zmiany składu; skład z ulepszeniami, ewolucją i runami | 1,5 | Test end-to-end przechodzi cały przepływ na buildzie produkcyjnym | gotowe |

## M6 – Szlif (zakres do doprecyzowania po M5)

| Id | Zadanie | Dni | Kryterium ukończenia | Status |
|---|---|---|---|---|
| M6-1 | Docelowe grafiki bohaterów i wrogów (praca graficzna poza tym szacunkiem; tu tylko integracja) | 0,5 na zestaw | Zestaw przechodzi `pnpm atlas` i budżet rozmiaru | — |
| M6-2 | Tła światów, podział atlasów, leniwe ładowanie | 1,5 | Pierwsze uruchomienie < 2 MB, atlas świata < 1 MB | — |
| M6-3 | Dźwięk: efekty walki i UI, format zgodny z Safari | 1,5 | Dźwięki z puli, wyciszenie w ustawieniach | — |
| M6-4 | Onboarding pierwszej walki | 1 | Nowy gracz przechodzi poziom 1 bez instrukcji z zewnątrz | — |
| M6-5 | Testy w przeglądarkach desktopowych i na telefonie | 1 | Lista znalezionych problemów zamknięta lub świadomie odłożona | — |
| M6-6 | Optymalizacja ładowania; ponowna decyzja o PWA | 1 | Pierwsze uruchomienie < 3 s na łączu 4G | — |
| M6-7 | Decyzja o hostingu publicznym i ewentualne przeniesienie | 0,5 | Nowy ADR; DEPLOY.md zaktualizowany | — |
