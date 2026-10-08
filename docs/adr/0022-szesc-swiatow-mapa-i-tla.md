# ADR 0022: sześć światów – mapa z przełączaniem i tła rysowane kodem

- Status: zaakceptowany (zakres i motyw od autora gry 2026-10-07; nazwy, wygląd i szczegóły zachowania mapy do jego oceny)
- Data: 2026-10-07

## Kontekst

Dotąd gra miała jeden świat testowy („Las”) z sześcioma poziomami i jedno tło sceny. Autor gry ustalił docelowy kształt: **sześć map po sześć etapów**, pochodzących od szczepów bohaterów. Pierwsza to zamek Mieczników i Łuczników, potem po jednej dla każdego szczepu, na końcu siedziba Akronixów jako najtrudniejszy, końcowy etap. Motyw przewodni: Akronix zaatakowali wszystkie światy, a gracz odbija je po kolei, aż zdobędzie ich siedzibę. Na mapie mają być duże strzałki z lewej i prawej strony przełączające mapę; ze światem zmienia się tło i nazwy poziomów. Na razie potrzebne są widoki map i nazwy poziomów; każdy poziom ma dostać po 2–3 przeciwników ze swojego szczepu, a balans przyjdzie później.

## Decyzja

### Światy

Kolejność według numerów ze szkiców szczepów (Robots 2, Plants 3, Beasts 4, Immortals 5) i ich nazw światów:

| # | Świat | Przeciwnicy | Tło |
|---|---|---|---|
| 1 | Zamek | Miecznicy i Łucznicy | `castle` |
| 2 | Mechanus town | Robots | `mechanus` |
| 3 | Living swamps | Plants | `swamps` |
| 4 | Jungle of doom | Beasts | `jungle` |
| 5 | Tower of time | Immortals | `tower` |
| 6 | Cytadela Akronix | Akronix | `citadel` |

Świat testowy „Las” znika; jego poziomy `w1_l1`–`w1_l6` zachowują id (zapisy testerów zostają ważne), ale mają nowe nazwy i przeciwników. Jednostki specjalne Lasu (Osiłek, Łupieżca, Szaman, Herszt) zostają w treści, ale nie stoją już na żadnym poziomie.

Poziomy odblokowują się jak dotąd, kolejno przez całą grę: boss świata odblokowuje pierwszy poziom następnego. Świat jest **odbity**, gdy wszystkie jego poziomy są przeszłe.

### Mapa

- Mapa pokazuje **świat wybranego poziomu**: jego szlak, nazwy i tło. Scena mapy się nie zmieniła (`{ name: 'map', selected }`); osobnego pola „świat” nie ma, więc przeciwnicy na scenie, tabliczka i tło zawsze należą do tego samego świata.
- **Duże strzałki** przy lewej i prawej krawędzi sceny wybierają poziom w sąsiednim świecie (`openWorld`): pierwszy nieprzeszły, a w świecie odbitym bossa. Na pierwszym i ostatnim świecie strzałka zostaje na miejscu, przygaszona.
- Pod nazwą świata stoi **rząd sześciu kłów**, po jednym na świat: jasny papier to świat odbity, nagietek świat w toku, przygaszony papier świat zablokowany; pokazywany jest większy. Kieł jest też skrótem do swojego świata.
- **Zablokowany poziom da się wybrać i obejrzeć** (przeciwnicy na scenie, nagroda na tabliczce), ale „Walcz” jest nieaktywne, a pod nim stoi, który poziom trzeba przejść najpierw. Bez tego świat, do którego gracz nie doszedł, nie miałby czego pokazać; reguła gry zostaje ta sama: `startBattle` odmawia zablokowanemu poziomowi.
- Każdy świat ma **własny kształt szlaku** (`ui/trail-layout.ts`): zygzak zamku, dwa poziomy taśmy fabryki, meander bagien, stok wulkanu, schody wieży, zejście do cytadeli z tronem na górze.
- Po wygranej z bossem mapa sama otwiera następny świat, bo wybiera pierwszy nieprzeszły poziom gry.

### Tła

- Tło to zamknięty zestaw id w treści (`BACKDROP_IDS`), a jego rysunek to **kod**: warstwy płaskich sylwetek w jednostkach logicznych sceny (`render/backdrops/`), w stylu wycinanki z ADR 0015. Bez plików graficznych: nie rośnie transfer ani atlas, a typ pilnuje, że każde id ma rysunek.
- Geometria jest czysta (wielokąty jako listy liczb), więc da się ją testować bez canvasu. `background.ts` buduje z niej po jednej ścieżce `Path2D` na warstwę przy pierwszej klatce z danym tłem; w pętli klatek są tylko wypełniane, bez alokacji.
- **Tło idzie za światem sceny** (`game/scene-world.ts`): mapa pokazuje świat wybranego poziomu, walka i wynik świat swojego poziomu, ekran startowy świat, do którego gracz doszedł. Skład, sklep i bohaterowie nie mają własnego świata i zostają na tle ekranu, z którego gracz przyszedł.
- Reguły czytelności, sprawdzane testem: napisy interfejsu leżące wprost na tle (kolor kości) mają kontrast co najmniej 4,5:1 z niebem i ziemią każdego świata, a warstwy o dużej powierzchni trzymają się blisko koloru nieba, żeby postacie i kafle mapy były od nich wyraźniejsze. Jasne mogą być tylko drobne akcenty (okna, świetliki, iskry).

### Wstępna treść poziomów

Każdy poziom ma 2–3 przeciwników ze szczepu swojego świata, od form bazowych na pierwszych poziomach do końcowych u bossa. Nazwy poziomów prowadzą od granicy świata do jego serca.

- **Świat 1 jest dostrojony** do składu startowego tak jak dawny Las: te same rangi oczekiwane (A0, A1, A3, B0, B2, B4) i te same nagrody, więc nowa gra jest do przejścia, a raport balansu dla tego świata pozostaje zgodny.
- **Światy 2–6 mają liczby ze wzoru**, bez balansu: poziom siły wroga to numer świata − 1 plus połowa numeru etapu (w dół); złoto rośnie z etapem i światem, boss daje mniej złota i runę. Rangi w `reference-squads.json` to dla nich pomiar stanu, nie cel.

## Konsekwencje

- Zapis się nie zmienia: postęp jest zapisany per id poziomu, a wybrany świat to stan sceny.
- Przeciwnikami w światach szczepów są formy tych szczepów, choć motyw mówi o najeźdźcach Akronix. To wybór autora na dziś („po 2–3 przeciwników z danej klasy bohaterów”); otwarte, czy na poziomach bossów ma stanąć dowódca Akronixów.
- Pierwsze poziomy światów 2–4 są dziś łatwiejsze niż boss Zamku, bo formy bazowe szczepów są słabe, a dziewięciu poziomów skład startowy nie wygrywa na żadnej randze. Do balansu.
- Mapa pokazuje przyszłe światy i ich przeciwników. Jeśli autor woli niespodziankę, wystarczy ukryć nazwy i postacie zablokowanych poziomów; strzałki mogą zostać.
- Rysowanie teł kosztuje rasteryzację: czas JS klatki i alokacje się nie zmieniły (0,64–0,73 ms, 298–300 B na każdym z sześciu teł), a w pomiarze bez czekania na ekran średnia klatka rośnie od 1,6 ms przy zamku do 2,2–2,3 ms przy bagnach i dżungli; zgubionych klatek nie ma (pomiar w ARCHITECTURE.md §5.7). Gdyby telefon nie nadążał, tło można raz narysować do osobnego canvasu i kopiować jednym `drawImage`.
- Wrogowie wszystkich światów są dziś w jednym atlasie. Leniwe ładowanie atlasu per świat (CLAUDE.md) zostaje na M6; tła nie mają plików, więc nie mają czego ładować.
- Narzędzia dev (piaskownica, pomiar) przyjmują `backdrop=<id>` w adresie.

## Odrzucone warianty

- **Osobne pole „pokazywany świat” w scenie mapy**, niezależne od wybranego poziomu: przeciwnicy z jednego świata stali by na tle innego.
- **Strzałki nieaktywne dla zablokowanych światów**: autor chce obejrzeć wszystkie mapy, a gracz widzi, ile gry przed nim.
- **Tła jako pliki graficzne**: sześć obrazów 1280×720 to kilkaset kilobajtów transferu i osobny potok; płaskie sylwetki z kodu pasują do stylu i nic nie ważą.
