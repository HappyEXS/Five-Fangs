# ADR 0021: obrażenia w czasie (krwawienie, trucizna) i szarża

- Status: zaakceptowany (mechaniki wybrał autor gry 2026-10-07; szczegóły wykonania do jego oceny)
- Data: 2026-10-07

## Kontekst

Szkic szczepu Akronix (wrogowie, których gracz nie zdobywa) ma przy postaci Axin 2 ramkę „+30”. Autor gry wyjaśnił: to **krwawienie** – „po zaatakowaniu kogoś przez następne 10 sekund przeciwnik ma efekt krwawienia, co sekundę traci 30 hp”, a „podobna mechanika ma być u Poisonixa z trucizną”. Z zaproponowanych zdolności autor wybrał też **szarżę Hornixa**: pierwszy cios w walce zadaje potrójne obrażenia.

Dotąd każda zmiana HP pochodziła z ciosu, pocisku albo leczenia okresowego samej jednostki. Efekt, który jednostka nakłada na przeciwnika i który trwa po trafieniu, to nowy rodzaj stanu w symulacji. Budżet „ponad 2000 walk na sekundę” jest na styk, więc walka bez tych cech nie może za nie płacić.

## Decyzja

### Obrażenia w czasie

Jedna mechanika, dwa rodzaje efektu: krwawienie (`bleed`) i trucizna (`poison`). W treści to dwie cechy o tych samych parametrach (`damage`, `interval` w sekundach, domyślnie 1, `duration` w sekundach); w `UnitSpec` pola `dotDamage`, `dotInterval`, `dotTicks`, `dotKind`.

- **Nałożenie.** Każde trafienie jednostki z tą cechą, które doszło celu (cios, pocisk, także przebijający i cios obszarowy), nakłada efekt na trafionego. Unik znosi trafienie razem z efektem. Cios o zerowych obrażeniach też nakłada efekt.
- **Rytm.** Pierwsze tyknięcie przychodzi pełny odstęp po trafieniu, kolejne co odstęp; efekt tyka `duration / interval` razy (10 s co 1 s to dziesięć tyknięć po 30, razem 300).
- **Kolejne trafienie nie sumuje efektu.** Odnawia liczbę tyknięć, a rytm biegnie dalej bez zmian. Dzięki temu częste trafienia ani nie przyspieszają obrażeń, ani ich nie wstrzymują (gdyby trafienie zerowało odliczanie do tyknięcia, jednostka bijąca częściej niż raz na sekundę nigdy nie zadałaby obrażeń z efektu). Po ostatnim trafieniu efekt tyka jeszcze pełną liczbę razy, pierwszy raz najpóźniej po jednym odstępie; tyknięcie wypadające w ticku trafienia zużywa jedno z odnowionych.
- **Jeden efekt każdego rodzaju na jednostkę.** Krwawienie i trucizna działają obok siebie i sumują obrażenia. W obrębie rodzaju: słabsze trafienie niczego nie zmienia, równe albo silniejsze przejmuje efekt (obrażenia, odstęp, źródło). Trafienia jednego ticka przychodzą w stałej kolejności (jednostki po `unitId`, potem pociski), więc przy równej sile efekt należy do ostatniego z nich.
- **Tarcza zmniejsza efekt** o swój procent, tak jak obrażenia ciosu; liczone raz, przy nałożeniu. Uzasadnienie: opis tarczy dla gracza brzmi „otrzymuje o N% mniej obrażeń”, bez wyjątków.
- **Tyknięcie to nie trafienie:** bez odrzutu, uniku i kradzieży życia. Obrażenia trafiają do tej samej kolejki co ciosy, więc HP zmienia się dalej tylko w rozstrzygnięciu ticka, a leczenie z tego samego ticka może uratować.
- **Źródło.** Obrażenia tyknięć liczą się w wyniku walki jednostce, która nałożyła efekt (dla przyzwanego: jego przyzywaczowi), także po jej śmierci. Efekt trwa po śmierci źródła.
- **Koniec.** Śmierć jednostki zdejmuje z niej efekty; nowa jednostka w miejscu przyzwanych nie dziedziczy efektów poprzednika.
- Obrażenia efektu nie rosną z ulepszeniami ani z poziomem wroga, tak jak pozostałe wartości cech.

Stan: po jednym wpisie na jednostkę i rodzaj (`dotLeft` liczba pozostałych tyknięć, `dotNext` numer ticka następnego tyknięcia, `dotDamage`, `dotInterval`, `dotSource`), pod indeksem `rodzaj * unitSpan + unitId`. Zapis numeru ticka zamiast licznika odliczanego co tick sprawia, że faza cech tylko porównuje dwie liczby na wpis. Nowe zdarzenie `EVENT_AFFLICTED` (jednostka, rodzaj, źródło) zgłasza nowy efekt; tyknięcie to zwykłe `EVENT_DAMAGED` ze źródłem.

### Szarża

Cecha `charge` z parametrem `bonus` (procent): pierwszy atak jednostki w walce zadaje o tyle więcej (200 to cios potrójny). Atak to cios wręcz, który doszedł celu, albo wystrzał. Zamach, którego cel zginął wcześniej, nie zużywa szarży; unik trafionego ją zużywa. Premia liczy się po premii szału, a przed podwojeniem z rytmu. Każda przyzwana jednostka z tą cechą szarżuje osobno.

Stan: `chargeBonus` na jednostkę, zerowane po pierwszym ataku.

### Walka bez tych cech nie płaci

Flagi `hasDot` i `hasCharge` walki liczone raz, przy tworzeniu (także z cech jednostek przyzywanych). Bez nich tablice stanu i specyfikacji tych cech to jedna wspólna pusta tablica, hash stanu ich nie obejmuje, a tick wykonuje po jednym sprawdzeniu flagi w trzech miejscach. Pola rzadkich cech walidator sprawdza tylko u jednostki, która cechę ma.

## Konsekwencje

- 16 dotychczasowych walk golden zachowuje hashe; doszła walka `afflictions`.
- Pomiar A/B w jednym procesie: sam czas ticków bez zmian (0,99–1,01), tworzenie walki dłuższe o ok. 0,4 µs (ok. 0,1% walki 5 na 5). Pomiar kontrolny tej samej wersji po obu stronach daje taki sam rozrzut (do 1–3%), więc różnicy w pełnych walkach nie da się odróżnić od szumu.
- Efekty mają tylko żywe jednostki, więc renderer może rysować znaczniki wprost ze stanu, bez śledzenia zdarzeń.
- Pocisk nie niesie parametrów efektu: w chwili trafienia czyta je ze specyfikacji strzelca, tak jak kradzież życia. Dla jednostek składów to bez znaczenia (specyfikacja jest stała); pocisk przyzwanego, w którego miejscu stanął już inny przyzwany o innej cesze, nałożyłby efekt następcy. Dziś wszyscy przyzwani jednej strony pochodzą z tej samej treści, więc nie rozbudowujemy puli pocisków.
- Otwarte dla autora: efekt nie rośnie z poziomem wroga; trucizna i krwawienie się sumują; tarcza zmniejsza efekt; dwa krwawienia tej samej siły się nie sumują.

## Odrzucone warianty

- **Jeden efekt na jednostkę, silniejszy wygrywa.** Prostszy stan, ale trucizna Poisonixa przepadałaby obok krwawienia Axina 2.
- **Sumowanie efektów z każdego trafienia.** Szybko bijąca jednostka nakładałaby nieograniczone obrażenia; wymaga listy efektów na jednostkę.
- **Odliczanie do tyknięcia od każdego trafienia.** Opisane wyżej: częste trafienia wstrzymywałyby obrażenia.
- **Rozkaz generała** (premia do obrażeń drużyny, dopóki Kaisarix żyje): zaproponowany, autor go nie wybrał.
