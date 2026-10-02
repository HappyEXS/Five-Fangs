# CLAUDE.md

Przeglądarkowy auto-battler 2D (widok z boku), single player, bez backendu. Gracz układa skład do 5 bohaterów (melee/ranged), walki toczą się automatycznie i bez losowości, 30 poziomów w 5 światach. Postacie animowane techniką cutout (części ciała obracane w stawach według klatek kluczowych).

Projekt rozwijany przez wiele miesięcy. Priorytety: **determinizm i poprawność symulacji → wydajność → czytelna architektura → tempo dostarczania**.

Szczegóły: `docs/GAME_DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DEPLOY.md`, decyzje w `docs/adr/`.

## Komendy

```bash
pnpm dev               # serwer deweloperski (narzędzia dev pod /tools.html)
pnpm build             # build produkcyjny
pnpm preview           # podgląd builda
pnpm typecheck         # tsc --noEmit
pnpm lint              # biome check
pnpm format            # biome format --write
pnpm test              # vitest run
pnpm test:watch        # vitest
pnpm test:golden       # testy deterministyczne walk (hash stanu); -u aktualizuje migawki
pnpm test:e2e          # Playwright na buildzie z vite preview – po build; przeglądarkę pobiera raz pnpm e2e:install
pnpm test:coverage     # testy z pomiarem pokrycia; próg > 90% linii dla src/sim
pnpm bench             # walki/s, czas ticka i alokacje symulacji; --check kończy błędem poniżej budżetu
pnpm battle a,b vs c   # walka w konsoli z logiem zdarzeń (jednostki z treści albo golden:<nazwa>)
pnpm validate-content  # walidacja wszystkich JSON-ów treści
pnpm balance           # walki headless wszystkich poziomów, raport do reports/balance.md
pnpm atlas             # pakowanie atlasów z assets/src do src/assets/generated (--check: tylko sprawdza aktualność)
pnpm atlas:placeholder # grafiki placeholder jako źródła atlasu w assets/src/units
pnpm deps:check        # granice modułów, dozwolone pakiety, zakazane API w sim (ADR 0012)
pnpm check:size        # budżety rozmiaru dist/ (gzip) – uruchamiać po build
pnpm check:dist        # czystość dist/: brak narzędzi dev i kodu debug, adresy względne – po build
pnpm check             # typecheck + lint + test + validate-content + deps:check
```

Lokalnie wszystkie komendy działają w kontenerze Docker (ADR 0011); zależności nie instalujemy na hoście:

```bash
docker compose up -d dev                 # serwer deweloperski na http://localhost:5173
docker compose exec dev pnpm <komenda>   # dowolna komenda z listy powyżej
docker compose run --rm dev pnpm <komenda>   # to samo, gdy kontener nie działa
```

Git działa na hoście. CI i build na Render nie używają Dockera.

Przed uznaniem zadania za skończone: `pnpm check`.
Jeśli zadanie dotyka assetów, zależności lub konfiguracji builda: dodatkowo `pnpm build && pnpm check:size && pnpm check:dist`.

## Struktura i granice modułów

```
src/core     narzędzia czyste: matematyka całkowita, hash, pętla stałego kroku, pule, i18n, RNG (tylko efekty w render)
src/sim      symulacja walki – czysta logika
src/content  dane JSON + schematy Zod + kompilacja do struktur runtime
src/render   Canvas 2D, rig, animacje, atlas, efekty, debug overlay
src/game     sceny, progresja, zapis
src/ui       Preact (menu, mapa, skład, HUD)
src/tools    narzędzia dev (edytor animacji, piaskownica walki) – osobne wejście tools.html, nie trafiają do builda prod
scripts/     skrypty Node (balans, walidacja, atlas)
```

Dozwolone importy: `core` → nic · `sim` → core · `content` → core, typy sim · `render` → core, sim (odczyt), content · `game` → wszystko poza ui/tools · `ui` → game, core, content · `tools` → wszystko.
Granice są sprawdzane w CI (`pnpm deps:check`). Nie omijaj ich; jeśli są niewygodne, zaproponuj zmianę.

## Zasady symulacji (`src/sim`) – NIENARUSZALNE

- Musi działać w Node bez DOM. Zero importów z `render`, `ui`, `game`.
- Stały krok 30 Hz. Czas wyłącznie w **całkowitych tickach**. Konwersja „na sekundę” → „na tick” tylko w kompilacji treści.
- **Sim nie używa losowości** (ADR 0002). Zakaz: `Math.random`, `Date.now`, `performance.now`. RNG z `core` służy tylko efektom kosmetycznym w `render`.
- Stan wyłącznie w liczbach całkowitych w tablicach typowanych: pozycje i zasięgi w podjednostkach (1 jednostka świata = 256), HP i obrażenia jako inty.
- Zakaz funkcji przestępnych (`Math.sin/cos/tan/exp/log/pow`, `**` z niecałkowitym wykładnikiem). Dozwolone: `+ - * /` z jawnym zaokrągleniem, `abs`, `min`, `max`, `floor`, `ceil`, `round`, `trunc`, `Math.imul`.
- Iteracja w stałej kolejności (po `unitId`). Remisy rozstrzygane jawnie (niższe id).
- Fazy ticka: decyzje → ruch → ataki → pociski → cechy okresowe → **jednoczesne** nałożenie obrażeń, leczenia i odrzutu → śmierci.
- Cechy pasywne to zamknięty zestaw (ADR 0009): nowa cecha = wariant schematu + pola `UnitSpec` + kod w sim + testy.
- Symulacja nie wywołuje renderera. Komunikuje się przez bufor zdarzeń.
- Symulacja jest źródłem prawdy o czasie ataku. Animacja podąża za postępem ataku z sim.
- Każda zmiana zachowania sim zmieniająca hashe golden wymaga świadomej aktualizacji (`pnpm test:golden -u`) i wpisu w opisie commita.

## Zasady renderowania (`src/render`)

- **Zero alokacji w gorącej pętli** (step + render). Żadnych `new`, literałów obiektów/tablic, domknięć, `map/filter`, spread, `DOMMatrix`, template stringów co klatkę. Używaj pul i prealokowanych `Float32Array`.
- Macierze kości: 6 floatów na kość w jednej tablicy, liczone ręcznie, `ctx.setTransform(a,b,c,d,e,f)`.
- `drawImage` tylko przez `blit` (`render/scene.ts`) i tylko z argumentami całkowitymi: pivot i skala sprite'a wchodzą w transformację. Ułamkowe argumenty `drawImage` alokują w V8 (ARCHITECTURE.md §5.7).
- Rysowanie tylko z atlasu. Warianty części (zwykły, ciemny tył, biała sylwetka trafienia) generowane przy ładowaniu. Nie używaj `ctx.filter`.
- Interpolacja pozycji między tickami (`alpha`). Faza chodu z przebytego dystansu.
- DPR ograniczony do 2. Stała rozdzielczość logiczna, skalowanie z letterboxem.
- Kod debug (pivoty, zasięgi, overlay perf) za flagą `import.meta.env.DEV`, usuwany z builda prod.

## Treść (`src/content`)

- Każdy plik JSON ma schemat Zod. Nowy typ danych = nowy schemat + walidacja w `validate-content`.
- Dane surowe są czytelne dla człowieka (sekundy, stopnie, stringowe id). Kompilacja zamienia je na struktury runtime (ticki, indeksy, tablice typowane).
- Walidator sprawdza spójność odwołań, unikalność id i zgodność znacznika `hit` w klipie animacji z `hitFraction` ataku.
- Balans zmieniaj w danych, nie w kodzie. Po zmianie balansu uruchom `pnpm balance` i porównaj raport.

## Zapis gry

- Jeden obiekt z `saveVersion`, walidowany Zod przy wczytaniu.
- Zmiana kształtu zapisu = podniesienie wersji + migracja `vN → vN+1` + test migracji z zapisanego przykładowego pliku w `tests/fixtures/saves/`.
- Nigdy nie usuwaj starych migracji. Uszkodzony zapis → kopia zapasowa, gra nie może się wywrócić.

## Styl kodu

- TypeScript `strict` + `noUncheckedIndexedAccess`. Bez `any`; `unknown` + zawężanie. Bez `!` (non-null assertion) poza uzasadnionymi przypadkami z komentarzem.
- Preferuj dane + czyste funkcje nad klasami z dziedziczeniem. Kompozycja zamiast hierarchii.
- Nazwy w kodzie po angielsku. Komentarze i dokumentacja mogą być po polsku. Teksty widoczne dla gracza tylko przez moduł i18n.
- Pliki < ~300 linii; jeśli rosną, dziel według odpowiedzialności.
- Komentarze wyjaśniają „dlaczego”, nie „co”. Każde odstępstwo od zasad wydajności lub determinizmu wymaga komentarza.
- Bez nowych zależności runtime bez uzgodnienia i ADR.

## Testy

- Testy jednostkowe obok kodu: `foo.ts` → `foo.test.ts`.
- `sim`: każdy system ma testy, w tym przypadki brzegowe (jednoczesna śmierć, cel ginie w trakcie lotu pocisku, remis odległości, odrzut na krawędź pola i kilka odrzutów w jednym ticku).
- Testy golden w `tests/golden/`: ustalone składy → hash stanu końcowego i logu zdarzeń.
- Nowa mechanika = najpierw test w sim, potem render.
- Pokrycie `sim` > 90%.

## Budżety wydajności

60 FPS na telefonie średniej klasy · render klatki < 4 ms (desktop) / < 8 ms (telefon) · tick sim < 0,2 ms · > 2000 walk headless/s w Node · JS gzip < 150 KB · 0 alokacji w gorącej pętli.
Desktop jest platformą główną; budżety dla telefonu to cele pomiarowe, które nie blokują milestone'ów.
Przy zmianach w `render` lub `sim` sprawdź overlay wydajności w piaskownicy walki. Jeśli zmiana może wpłynąć na budżet, zmierz przed i po: symulację przez `pnpm bench`, renderer przez `/tools.html?view=perf` (metoda i ostatnie wyniki w ARCHITECTURE.md §3.8 i §5.7; interpretacja budżetu alokacji renderera w ADR 0013, proponowanym).

Transfer: pierwsze uruchomienie < 2 MB łącznie · atlas świata < 1 MB · powtórna wizyta bez nowej wersji < 20 KB. CI odrzuca build przekraczający budżety.

## Deploy (Render Static Site, plan darmowy) – szczegóły w `docs/DEPLOY.md`

- Render jest środowiskiem testowym dla kilku osób (ADR 0006); hosting publiczny do decyzji przed premierą.
- Build jest w 100% statyczny (`dist/`). Brak serwera i sekretów; wszystko w paczce jest publiczne, także zmienne `VITE_*`.
- Kod gry nie może zależeć od Render. Nagłówki utrzymuj równolegle w `render.yaml` i `public/_headers`; zmiana w jednym = zmiana w drugim.
- `base: './'`. Brak routingu po ścieżkach URL; sceny są stanem aplikacji. Nie dodawaj reguły rewrite „wszystko → index.html”.
- Zmieniające się assety tylko przez Vite (hash w nazwie, cache `immutable`). Do `public/` trafiają wyłącznie pliki o stałych nazwach.
- Zero zapytań do zewnętrznych domen (fonty i biblioteki lokalnie, bez CDN, bez trackerów). CSP bez `unsafe-inline` dla skryptów.
- Transfer i minuty buildu na darmowym planie są ograniczone: każdy nowy asset lub zależność to koszt. Grafiki optymalizuj przed dodaniem; ładuj atlasy światów leniwie.
- Build na Render = tylko instalacja + `vite build`. Testy i walidacje działają w GitHub Actions. Deploy wyłącznie z `main` po zielonym CI (`autoDeployTrigger: checksPass`).
- Każdy dynamiczny import i ładowanie assetów obsługuje błąd (po deployu stare chunki znikają) komunikatem o nowej wersji i przeładowaniem po zapisie stanu.
- `version.json` i wersja w paczce generowane przy buildzie; zapis gry przechowuje `gameVersion` i `saveVersion`.
- Narzędzia dev i debug nie mogą trafić do `dist/` (sprawdzane w CI przez `check:dist`). Wejście narzędzi i moduły debug odwołują się do znaczników z `src/core/dev-markers.ts`, po których skrypt je wykrywa.

## Sposób pracy

- Większe zadania: najpierw plan (pliki, interfejsy, ryzyka), akceptacja, dopiero potem kod.
- Małe, spójne kroki; każdy kończy się przechodzącymi testami i działającym buildem.
- Commity w stylu Conventional Commits (`feat(sim): ...`, `fix(render): ...`, `perf: ...`, `content: ...`).
- Decyzja architektoniczna lub odstępstwo od tego pliku → nowy ADR w `docs/adr/` (kontekst, decyzja, konsekwencje).
- Po ukończeniu zadania z `docs/ROADMAP.md` zaktualizuj jego status. Jeśli zmieniła się architektura, zaktualizuj `docs/ARCHITECTURE.md` i ten plik.
- Gdy wymaganie jest niejasne, zapytaj zamiast zgadywać, zwłaszcza w kwestiach game designu.

## Czego nie robić

- Nie wprowadzaj logiki gry do `render` ani `ui`.
- Nie dodawaj silnika gry (Phaser, Pixi) ani frameworka state management bez ADR.
- Nie używaj `localStorage`/`sessionStorage` poza modułem zapisu.
- Nie poprawiaj hashy golden „żeby testy przeszły” bez zrozumienia przyczyny zmiany.
- Nie wyłączaj reguł lintera ani testów, aby zakończyć zadanie.
