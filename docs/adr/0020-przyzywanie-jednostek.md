# ADR 0020: przyzywanie jednostek – osobne miejsca poza składem

- Status: zaakceptowany (wybór autora gry z 2026-10-05; szczegóły wykonania do jego oceny)
- Data: 2026-10-06

## Kontekst

Szkic szczepu Plants zawiera Mother-tree: 10 000 życia, atak 0, „Type (Atk) – summoning”, „Abilities: Summons Bushes ver. 2” (życie 100, atak 20, szybkość 30, odrzut 0), „Atk: 2,0”. Dotąd walka miała dokładnie dziesięć jednostek: pięć slotów gracza i pięć przeciwnika, a `unitId` było numerem slotu. Na tym opierały się stan symulacji, renderer, HUD i wynik walki.

Autorowi przedstawiono trzy sposoby: krzaki zajmują wolne sloty składu (bez zmian w symulacji, ale Mother-tree w pełnym składzie nie przyzywa nikogo), krzaki na osobnych miejscach ponad skład, albo odłożenie Mother-tree. Autor wybrał **osobne miejsca, do pięciu krzaków naraz**.

## Decyzja

**Miejsca.** Każda strona dostaje pięć miejsc na przyzwanych, wspólnych dla wszystkich jej przyzywaczy. Jednostki składów zachowują `unitId` 0–4 (gracz) i 5–9 (przeciwnik); przyzwani gracza zajmują 10–14, przeciwnika 15–19. Układ nieciągły wybrano po to, by nic, co zna dziś `unitId`, nie musiało się zmienić: zdarzenia, logi i hashe walk bez przyzywaczy są bit w bit takie same jak przedtem (17 walk golden bez zmiany migawek).

**Walka bez przyzywaczy nie płaci za przyzywanie.** Tablice stanu mają długość `unitSpan`: 10 w zwykłej walce, 20 w walce z przyzywaczem. Pętle po wszystkich jednostkach idą do `unitSpan`, a hash obejmuje tyle samo pozycji.

**Przyzywacz** to jednostka, której `UnitSpec.summon` niesie specyfikację przyzywanej jednostki. Nie atakuje: jej „atak” ma zwykły rytm (odstęp, zamach, tick trafienia), ale w ticku trafienia zamiast ciosu albo pocisku dopisuje do kolejki zmian prośbę o jednostkę.

- Zamach zaczyna się tylko wtedy, gdy strona ma wolne miejsce. Odstęp między atakami biegnie dalej, więc gdy przyzwany zginie, następny pojawia się po samym zamachu.
- Jednostka staje na polu w **rozstrzygnięciu ticka**, po śmierciach, w pozycji przyzywacza. Nie działa w ticku, w którym się pojawiła; decyzje i ruch zaczyna od następnego. Tak samo jak cios, przyzwanie dochodzi do skutku także wtedy, gdy przyzywacz ginie w tym samym ticku.
- Miejsca są rozdawane w kolejce okrężnej (`summonCursor` strony), przyzywacze w jednym ticku po `unitId`. Miejsce jest wolne, gdy nikt w nim nie stał albo jego jednostka nie żyje. Gdy wolnego nie ma (zajął je inny przyzywacz tej strony), przyzwanie przepada.
- Przyzwana jednostka sama nie może przyzywać; poza tym jest zwykłą jednostką: może strzelać, leczyć i mieć cechy.

**Przyzwani są pełnoprawnymi jednostkami swojej strony.** Wróg celuje w najbliższego, także przyzwanego; pociski, cios obszarowy, leczenie drużyny, cel „ostatni w szyku” i odrzut obejmują ich tak samo jak skład. Strona przegrywa, gdy nie żyje nikt z niej, czyli także żaden przyzwany.

**Ponowne użycie miejsca.** Nowa jednostka nie dziedziczy niczego po poprzedniku: `placeUnit` zeruje stan miejsca, a `forgetPrevious` usuwa odwołania do niego (cel trwającego zamachu, cel pocisku wycelowanego, bit w masce pocisku przebijającego). Zamach wymierzony w poprzednika chybia, jak przy każdej śmierci celu.

**Wynik walki.** Obrażenia zadane przez przyzwanych liczą się przyzywaczowi (`summonedBy`), bo to jego gracz wystawił do walki, a miejsce przyzwanych zajmują po kolei różne jednostki. Obrażenia otrzymane zostają przy miejscu.

**Treść.** Jednostki przyzywane leżą w `units/summons.json`: nie są bohaterami (nie da się ich kupić) ani wrogami poziomów. Przyzywacz ma `kind: "summoner"` i pole `summon` z id takiej jednostki; jego `attackSpeed` to przyzwania na sekundę. Przyzwany rośnie z ulepszeniami przyzywacza tak jak on sam (10% życia i ataku na ulepszenie); runy przyzywacza go nie dotyczą.

**Renderer i interfejs.** Renderer przygotowuje wygląd przyzywanego przy `beginBattle` (wiersz wzorca na każdą jednostkę składu) i przepisuje go do miejsca przy zdarzeniu `Summoned`; animator zeruje wtedy stan miejsca. Przyzwani są rysowani na wierzchu składów, mają krótszy pasek życia i nie mają liczby nad nim, bo chodzą gromadą. HUD pokazuje tylko twarze składów.

## Konsekwencje

- **Symulacja ma drugi zakres jednostek** i każda pętla po drużynie musi o nim pamiętać. Dwie funkcje wołane w każdym ticku (`frontUnit`, ruch pocisków) mają dla niego osobny kod, wołany tylko w walce z przyzywaczami; wspólna pętla po obu zakresach spowalniała zwykłe walki o 4–6% (pomiary w ARCHITECTURE.md §3.8). To świadome powtórzenie kilku linii dla wydajności.
- **Walka z przyzywaczami jest ok. dwa razy droższa** (ok. 1,1 µs na tick wobec 0,55 µs): więcej jednostek i częstsze zdarzenia. Budżet ticka (0,2 ms) ma zapas dwóch rzędów wielkości.
- **Budżet „ponad 2000 walk na sekundę” jest na styk.** Przyzywanie dodało do zwykłej walki ok. 1,5% czasu ticka. Żeby nie zjadło resztki zapasu, tworzenie walki wycina teraz duże tablice typowane z jednego bufora (`core/int-arrays.ts`), co skróciło `createBattle` z 28 do 13,5 µs i z nawiązką pokryło tę stratę. Następna zmiana symulacji musi zacząć od pomiaru.
- **Limit pocisków** liczy najgorszy przypadek: pięciu przyzwanych strzelców na stronę ponad skład. Przyzywany o powolnych pociskach i szybkim strzelaniu może nie przejść walidacji.
- **Tablice 20-elementowe wychodzą poza stertę V8** (ponad 64 bajty), więc w walce z przyzywaczami wszystkie tablice jednostek dzielą jeden bufor. Kod symulacji tego nie widzi: dalej dostaje `Int32Array`.
- **Limit pięciu przyzwanych na stronę jest wspólny**: dwie Mother-tree w składzie nie dają dziesięciu krzaków, tylko szybciej uzupełniają te same pięć miejsc.
- **Przyzwani nie mają twarzy w HUD-zie ani liczby życia**; jeśli autor zechce je widzieć, to zmiana w rendererze i `battle-faces.ts`, bez dotykania symulacji.
- Wejście symulacji w raportach „Zgłoś problem” niesie zagnieżdżoną specyfikację przyzywanego; piaskownica wczytuje także raporty starszych wersji gry, bez tego pola.
