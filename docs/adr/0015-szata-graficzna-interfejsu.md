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

1. **Jedna scena, stała linia podłogi.** Każdy ekran pokazuje tę samą scenę z linią podłogi na 560 jednostkach logicznych. Zmieniają się aktorzy: na mapie skład gracza naprzeciw przeciwników wybranego poziomu, na ekranie składu sam skład, w sklepie bohaterowie na sprzedaż (`game/shop-stage.ts`), po walce pole zakończonej walki pod arkuszem wyniku.
2. **Papier, nie szkło.** Płaskie wypełnienia, gruby atramentowy kontur, twardy cień bez rozmycia. Bez gradientów i półprzezroczystych paneli; jedynym wyjątkiem jest zasłona za oknem ustawień, która odcina mapę od kliknięć.
3. **Kieł jest jedynym znakiem rozpoznawczym.** Pięć kłów wisi pod linią podłogi pod pięcioma slotami składu (pełny kieł = zajęty slot; na ekranie składu kły są przyciskami slotów). Ten sam kształt jest w znaku gry, w oznaczeniu ukończonego poziomu i w liczniku ulepszeń. Innych ozdobników nie dodajemy.
4. **Paleta** (zmienne w `ui/styles.css`, kolory sceny powtórzone w `render/background.ts`):

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
- **Położenie w procentach sceny, rozmiary w `em`.** Elementy stojące na scenie (kły, metki, podpisy przeciwników) są pozycjonowane procentem szerokości sceny wyliczonym z pozycji slotu w treści gry. Zmiana `GROUND_Y` wymaga zmiany `--floor` w `ui/styles.css`.
- **Style w wierszu** ustawia tylko Preact przez CSSOM (`element.style`), co CSP `style-src 'self'` dopuszcza; atrybutów `style` w HTML nie ma.
- **Tło sceny** dostało sylwetkę linii drzew: jedna ścieżka `Path2D` budowana raz, wypełniana co klatkę. Pomiar narzędziem `/tools.html?view=perf` przed i po nie pokazał różnicy (mediana klatki 0,30 ms, alokacje 279 wobec 280 B na klatkę).
- **Sklep** mieści na scenie do dziesięciu linii bohaterów (pięć po każdej stronie). Przy docelowym rosterze sześciu linii to wystarcza; większy sklep wymagałby przewijania albo stron.
- Tła światów z M6 zastąpią płaskie niebo i linię drzew; paleta interfejsu ma wtedy pozostać czytelna na każdym tle albo dostać warianty per świat.
- Ocena „czy to się podoba” należy do autora gry. Paleta i czcionki są w jednym miejscu (`ui/styles.css`), więc ich zmiana nie dotyka komponentów.
