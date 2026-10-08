# ADR 0015: szata graficzna interfejsu – wycinanka, mapa jako ekran główny, czcionki w paczce

- Status: zaakceptowany (kierunek i układ zlecił autor gry 2026-10-02; szczegóły wizualne do jego oceny)
- Data: 2026-10-02

## Kontekst

Interfejs z M4–M5b był roboczy: ciemne półprzezroczyste panele, czcionka systemowa, panel główny z trzema dużymi kaflami, mapa jako siatka równych prostokątów, ekran wyniku z sześcioma przyciskami. Autor gry po przejściu całości zlecił przebudowę:

- na ekranie głównym od razu mapa, nazwa gry tylko w rogu, małe przyciski składu i sklepu z boku,
- mapa z kafli w nieregularnym układzie, nie z dużych kwadratów obok siebie,
- po walce informacja o nagrodach i jeden przycisk OK wracający na ekran główny,
- nowa szata graficzna całego interfejsu, dopasowana do tego typu gry.

Ograniczenia z CLAUDE.md: zero zapytań do zewnętrznych domen (czcionki lokalnie), CSP `style-src 'self'` i `font-src 'self'`, budżet transferu, brak logiki gry w `ui`, bez nowych zależności runtime.

## Decyzja

**Motyw: teatrzyk z wycinanek.** Postacie są animowane techniką cutout, więc interfejs udaje papierowe rekwizyty na tej samej scenie.

1. **Jedna scena, stała linia podłogi.** Każdy ekran pokazuje tę samą scenę z linią podłogi na 560 jednostkach logicznych. Zmieniają się aktorzy: na mapie skład gracza naprzeciw przeciwników wybranego poziomu, na ekranie składu sam skład, w sklepie bohaterowie na sprzedaż (`game/stage-stands.ts`), po walce pole zakończonej walki pod arkuszem wyniku.
2. **Papier, nie szkło.** Płaskie wypełnienia, gruby atramentowy kontur, twardy cień bez rozmycia. Bez gradientów i półprzezroczystych paneli; jedynym wyjątkiem jest zasłona za oknem ustawień, która odcina mapę od kliknięć.
3. **Kieł jest jedynym znakiem rozpoznawczym.** Pięć kłów wisi pod linią podłogi pod pięcioma slotami składu (pełny kieł = zajęty slot; na ekranie składu kły są przyciskami slotów). Ten sam kształt jest w znaku gry, w oznaczeniu ukończonego poziomu i w liczniku ulepszeń. Innych ozdobników nie dodajemy.
4. **Paleta** (zmienne w `ui/styles/base.css`, kolory sceny powtórzone w `render/background.ts`):

   | Nazwa | Kolor | Rola |
   |---|---|---|
   | Atrament | `#241f3d` | kontury, tekst na papierze, linia podłogi, margines wokół sceny |
   | Zmierzch | `#3f4c80` | niebo |
   | Bór | `#2c5446` | ziemia |
   | Brzoza | `#efe6cf` | papier, tekst na scenie |
   | Nagietek | `#f0b429` | złoto, główna akcja, wybrany element |
   | Marzanna | `#c9463d` | przeciwnicy, porażka, akcja nieodwracalna |

   Odcienie pochodne: mech `#8db35a` (ukończone, pasek życia gracza), przygaszony papier `#d9cdae` (zablokowane, nieaktywne).
5. **Czcionki w paczce.** Protest Strike (nagłówki, numery kafli, wynik walki) i Sofia Sans Condensed (cała reszta, cyfry tabelaryczne), obie na licencji SIL OFL 1.1. Pliki WOFF2 z podzbiorami `latin` i `latin-ext` leżą w `src/assets/fonts/` i przechodzą przez Vite (hash w nazwie, cache `immutable`). Teksty licencji są publikowane w `dist/licenses/`.
6. **Mapa jest ekranem głównym.** Scena `hub` znika; `Scene` zaczyna od `{ name: 'map', selected }`, a `openMap()` bez argumentu wybiera pierwszy nieprzeszły poziom. Kafle poziomów to nieregularne wielokąty SVG na krętym szlaku; położenie i obrót kafla wynikają z numeru poziomu i świata, więc mapa zawsze wygląda tak samo. Ustawienia otwierają się jako okno nad mapą.
7. **Wynik walki ma jeden przycisk.** OK wraca na mapę: po pierwszym przejściu poziomu z wybranym następnym, po porażce i powtórce z tym samym.
8. **Jeden moment ruchu:** arkusz wyniku opada na scenę. Kafle mapy reagują na wskaźnik krótkim uniesieniem. Oba efekty wyłącza `prefers-reduced-motion`.

## Konsekwencje

- **Transfer.** Czcionki dodają 93 KB do pierwszego uruchomienia (218 KB łącznie według `check:size`, który liczy też pliki licencji, wobec budżetu 2 MB). Przeglądarka pobiera podzbiór `latin-ext` tylko wtedy, gdy na ekranie są znaki spoza `latin`; polski interfejs potrzebuje obu, angielski zwykle jednego.
- **Do czasu wczytania czcionek** tekst rysuje się czcionką zastępczą (`font-display: swap`), więc przy pierwszej wizycie napisy mogą na chwilę zmienić krój.
- **Położenie w procentach sceny, rozmiary w `em`.** Elementy stojące na scenie (kły, metki, podpisy przeciwników) są pozycjonowane procentem szerokości sceny wyliczonym z pozycji slotu w treści gry. Zmiana `GROUND_Y` wymaga zmiany `--floor` w `ui/styles/base.css`.
- **Style w wierszu** ustawia tylko Preact przez CSSOM (`element.style`), co CSP `style-src 'self'` dopuszcza; atrybutów `style` w HTML nie ma.
- **Tło sceny** dostało sylwetkę linii drzew: jedna ścieżka `Path2D` budowana raz, wypełniana co klatkę. Pomiar narzędziem `/tools.html?view=perf` przed i po nie pokazał różnicy (mediana klatki 0,30 ms, alokacje 279 wobec 280 B na klatkę).
- **Sklep** mieści na scenie do dziesięciu linii bohaterów (pięć po każdej stronie). Przy docelowym rosterze sześciu linii to wystarcza; większy sklep wymagałby przewijania albo stron.
- Tła światów z M6 zastąpią płaskie niebo i linię drzew; paleta interfejsu ma wtedy pozostać czytelna na każdym tle albo dostać warianty per świat.
- Ocena „czy to się podoba” należy do autora gry. Paleta i czcionki są w jednym miejscu (`ui/styles/base.css`), więc ich zmiana nie dotyka komponentów.

## Uzupełnienie z 2026-10-03

Autor gry przyjął kierunek („o wiele lepiej”) i zlecił poprawki ergonomii. Zmieniają one punkty 3 i 6 decyzji:

- **Ekran startowy.** Gra otwiera się nazwą gry nad sceną i jednym przyciskiem „Graj”, który stoi w tym samym miejscu co „Walcz” na mapie. Mapa pozostaje ekranem głównym, na który gra wraca.
- **Skład: bohatera łapie się za postać.** Kły slotów nie są już przyciskami. Uchwytem jest cała kolumna slotu: postać na scenie, kieł i podpis. Przeciągana postać jedzie po linii podłogi za wskaźnikiem i jest rysowana na wierzchu, slot pod nią się podświetla, a upuszczenie zamienia bohaterów miejscami. Kliknięcie wybiera bohatera; wybrany ma nagietkowy kieł i podpis. Poprzednia wersja kazała celować w mały podpis pod kłem, co autor uznał za nieintuicyjne.
- **Tylko „Wróć”.** Skład, bohaterowie i sklep nie mają przejść między sobą; każdy wraca na mapę przyciskiem „Wróć”.
- **Zakładka „Bohaterowie”.** Informacje o liniach (obie formy, statystyki, cechy, droga ulepszeń i ewolucji z kosztami) mają własny ekran. Sklep zostaje tylko do kupowania i nie pokazuje już karty ze statystykami.
- **Liczba życia nad paskiem.** Renderer rysuje bieżące życie cyframi z atlasu w kolorach palety (papier z atramentowym konturem).

### Pole bohatera w składzie (2026-10-03)

Autor gry chciał, żeby wszystkie działania na bohaterze były w jego polu na scenie, nie w osobnym panelu.

- Każdy bohater składu ma pole: u góry nazwa i gniazda run, pod kłem slotu pasek ulepszeń i przycisk „Kup” z kosztem następnego ulepszenia, a po komplecie ulepszeń formy bazowej „Ewolucja” z jej kosztem. Pasek formy po ewolucji ma inny kolor, bo ulepszenia liczą się od nowa.
- Runy to okrągłe żetony: zielony dla życia, czerwony dla ataku, z napisem, ile dodają. Ten sam kolor mają etykiety run na tabliczce poziomu i w wyniku walki. Kliknięcie gniazda otwiera okienko z paletą wolnych run.
- Żeby pola się zmieściły, ekran składu rozstawia bohaterów szerzej niż walka (15% szerokości sceny między slotami zamiast 6%). Kolejność slotów zostaje: front po prawej. To jedyny ekran, na którym postacie nie stoją w miejscach z walki.
- Karta z prawej zostaje, ale tylko do czytania: statystyki z podglądem następnego zakupu. Bohater spoza składu nie ma pola; ulepsza się go po postawieniu w składzie.
- Pola istnieją tylko na ekranie składu. Mapa i walka pokazują samą postać z paskiem życia.

### Brama i stary papier (2026-10-03)

Autor gry poprosił o typową animację gry: mechaniczną metalową bramę zamykaną z lewej i z prawej po ekranie startowym, przed walką i po niej, oraz o teksturę jasnobrązowego starego papieru zamiast wszechobecnej bieli okien. To zmienia punkt 2 decyzji (płaskie wypełnienia bez gradientów) dla okien i dodaje drugi, obok arkusza wyniku, moment ruchu.

- **Brama to szczęki.** Dwa żelazne skrzydła (płyty z deskami, pasy z nitami) mają na wewnętrznych krawędziach kły z kości słoniowej, które po zamknięciu się zazębiają: lewe jaśniejsze, prawe ciemniejsze. To znak gry w dużej skali, nie dodatkowa ozdoba.
- **Ruch mechaniczny:** skrzydła przyspieszają do uderzenia, scena drga, rygle z prawego skrzydła wsuwają się przez szczelinę. Przy otwieraniu najpierw odskakują rygle, potem skrzydła rozjeżdżają się z szarpnięciem. Przejście trwa ok. 1,3 s. Przy ustawieniu „ograniczony ruch” brama tylko pojawia się i znika (zmiana przezroczystości, bez przesuwania i drgań).
- **Kiedy:** „Graj” na ekranie startowym, „Walcz” na mapie, „Wyjdź” z walki, koniec walki i „OK” po wyniku. Walka stoi, dopóki brama nie jest w pełni otwarta. Po walce brama zamyka się na polu bitwy, a arkusz wyniku wisi na zamkniętej bramie; „OK” otwiera ją na mapie. Inne przejścia (skład, sklep, bohaterowie) bramy nie używają.
- **Papier:** okna, przyciski, kafle mapy i metki mają kolor starego papieru (#d9c29b) z ziarnem, krótkimi włóknami i plamami, a okna dodatkowo przypalone brzegi. Tekstura to szum SVG w adresie `data:` (`ui/paper.ts`), bez pliku graficznego i bez zapytań; kafle mapy używają jej przez wzór SVG. Kły i napisy na scenie zostają w kolorze kości słoniowej. Drobny tekst dostał ciemniejszy brąz i ciemniejszą marzannę, żeby kontrast na brązowym papierze nie spadł.

### Miniaturki postaci (2026-10-05)

Autor gry poprosił o miniaturkę („obrazek profilowy”) każdej postaci: dla bohaterów poza składem, w zakładce „Bohaterowie” i dla żywych postaci w walce. Skąd się biorą, opisuje ADR 0017; tu jest ich wygląd.

- **Okienko na scenę.** Miniaturka to kwadrat z atramentowym konturem i twardym cieniem, jak przyciski, wypełniony kolorem nieba (zmierzch). To tło, na którym postacie są rysowane w walce, więc każda jest na nim czytelna, a paleta nie dostaje nowego koloru. W okienku stoi popiersie postaci patrzącej w prawo.
- **Poza składem** bohater to miniaturka z nazwą formy pod spodem i zieloną plakietką „+N” ulepszeń na rogu (ta sama co pod bohaterem na mapie). Wybrany ma nagietkową obwódkę i nagietkowe tło nazwy. Łapie się go jak postać na scenie; przy wskaźniku jedzie wtedy jego miniaturka. Podpowiedź przeniosła się obok tytułu arkusza, żeby rząd miniaturek mieścił się bez przewijania; arkusze, które się przewijają, mają wąski atramentowy suwak.
- **Bohaterowie:** każda forma w drzewie ewolucji ma miniaturkę przed nazwą, a karta wybranej formy większą obok nazwy.
- **Walka:** w dolnych rogach, pod linią podłogi, stoją miniaturki żywych postaci: gracza w lewym rogu, przeciwnika w prawym, w tej kolejności, w jakiej postacie stają na scenie (fronty do środka). Przeciwnik patrzy w lewo, jak na scenie. Strony odróżnia miejsce i kierunek patrzenia, bez dodatkowego koloru.
- **Trzeci moment ruchu:** miniaturka poległego przewraca się do tyłu i znika, a rząd zsuwa się do rogu (ok. 0,5 s). Przy ustawieniu „ograniczony ruch” znika od razu.
- Miniaturki nie pokazują życia: paski i liczby życia są nad postaciami.
- **Poprawki z 2026-10-05:** miniaturka jest też przy każdej drodze w okienku wyboru ewolucji i na karcie wybranego bohatera w składzie. Pasek „Poza składem” ma zawsze wysokość jednego rzędu miniaturek: pusty pokazuje przerywany zarys miejsca, a gdy bohaterów jest więcej, niż mieści rząd, przewija się w bok. Autor zgłosił, że arkusz rozciągał się po włożeniu pierwszego bohatera.

### Podpowiedzi pod przyciskiem „i” (2026-10-06)

Autor gry uznał, że na ekranach jest za dużo wyjaśnień, których gracz sam się domyśli, i poprosił o okrągły przycisk „i” z okienkiem w ich miejscu.

- **Zasada:** na scenie zostaje to, co jest stanem gry albo wymaga działania (ceny, liczby, ostrzeżenie o pustym składzie, komunikat pustego miejsca). Zasady ekranu i objaśnienia oznaczeń idą do okienka. Nowy tekst objaśniający dodajemy do okienka, nie na scenę.
- **Przycisk** to papierowy krążek z atramentowym konturem, twardym cieniem i literą „i” (znak SVG, nie tekst); otwarty jest nagietkowy, jak każdy wciśnięty przycisk.
- **Gdzie stoi:** zasady całego ekranu przy jego tytule (Skład, Bohaterowie, Sklep), objaśnienie karty w jej prawym górnym rogu. Jedno stałe miejsce na ekran jest łatwiejsze do zapamiętania niż przycisk w miejscu każdego dawnego tekstu; dlatego podpowiedź składu nie została w arkuszu „Poza składem”. Przycisk pojawia się tylko tam, gdzie jest co wyjaśnić (karta bez strzałek go nie ma).
- **Okienko** to mały arkusz papieru pod przyciskiem, po akapicie na zasadę, bez tytułu i bez przycisku zamknięcia. Nie jest modalne: zamyka je ten sam przycisk, Escape albo kliknięcie gdziekolwiek, a kliknięty przy okazji element działa normalnie. Nie wychodzi poza scenę, jak pozostałe okienka.
- **Co znikło ze sceny:** podpowiedź przeciągania w arkuszu „Poza składem”, objaśnienia strzałek na kartach, akapit zasad i wiersz „W sklepie / Masz” pod sceną w Bohaterach, zdanie pod nagłówkiem Sklepu. Cena szczepu jest teraz na karcie formy bazowej, w tym samym wierszu, w którym pozostałe formy mają koszt ewolucji; liczbę posiadanych pokazuje sklep.

### Drzewko run w sklepie (2026-10-07)

Autor gry poprosił o drzewko run w sklepie (ADR 0026). Rozszerza to punkt o polu bohatera:

- **Runy mają cztery kolory**, po jednym na kierunek drzewka: zielony życie, czerwony atak, ciemnopomarańczowy odrzut, błękitny szybkość. Błękit (`--gale`) i ciemny pomarańcz (`--rust`) to jedyne nowe kolory palety. Odrzut był najpierw granatowy; autor poprosił o ciemny pomarańcz, żeby runa wyraźniej odróżniała się od pozostałych (2026-10-08).
- **Żeton run** to jasny sześciokątny kamień z wyrytym znakiem drzewka (`RuneMark`). Stoi wszędzie tam, gdzie mowa o żetonach: w korzeniu drzewka i na przycisku „Weź” przy liczbie, tak jak moneta przy kwocie, a na tabliczce poziomu, w wyniku walki i na plakietce zakładki sklepu jako znak nagrody.
- **Drzewko jest małe:** ok. jednej trzeciej szerokości sceny i nieco ponad ćwierć jej wysokości. Pierwsza wersja zajmowała prawie połowę szerokości i dwie piąte wysokości, a autor uznał ją za przytłaczającą (2026-10-08): sklep to przede wszystkim scena z bohaterami.
- **Drzewko** jest arkuszem starego papieru u góry sklepu, nad bohaterami na sprzedaż. Leży na boku: z lewej zapas żetonów, z niego pień, z pnia cztery kierunki. Nazwa kierunku ma kolor jego run, więc widać, co wzmacniają runy jeszcze zamknięte. Runy rosną z każdym krokiem kierunku: dalsza jest mocniejsza i większa.
- **Stan runy widać bez tekstu:** posiadana to żeton w kolorze z twardym cieniem, taki sam jak w gnieździe bohatera; następna do wzięcia ma nagietkową obwódkę; pozostałe są bezbarwnymi wycinankami z przerywanym konturem. Odcinek gałęzi przed runą jest pełny, gdy gracz ją ma, i przerywany, gdy nie.
- **Wzięcie runy wymaga potwierdzenia** w okienku pod nią, bo wyboru nie da się cofnąć. To jedyne miejsce w sklepie z dwoma kliknięciami; zakup bohatera zostaje jednym.
- Sklep zostaje jednym ekranem do wydawania tego, co gracz zdobył: złota na bohaterów i żetonów na runy. Zasady drzewka mają własny przycisk „i” przy jego tytule.
