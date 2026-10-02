# ADR 0011: Lokalne środowisko deweloperskie w kontenerze Docker

- Status: zaakceptowany
- Data: 2026-10-02

## Kontekst

Autor gry chce uruchamiać grę lokalnie w środowisku odizolowanym od systemu, bez instalowania zależności projektu na hoście (Windows). Na maszynie są Node i Docker Desktop; pnpm nie jest zainstalowany.

## Decyzja

Wszystkie komendy projektu uruchamiamy lokalnie w kontenerze zdefiniowanym przez `Dockerfile.dev` i `compose.yaml`:

```bash
docker compose up -d dev                       # serwer deweloperski: http://localhost:5173
docker compose exec dev pnpm test              # dowolna komenda z package.json
docker compose run --rm dev pnpm test          # to samo, gdy kontener nie działa
docker compose --profile preview up preview    # podgląd builda: http://localhost:4173
```

- Kod jest montowany z hosta do `/app`. `node_modules` żyje w wolumenie Dockera (binaria linuksowe, szybki dysk); pnpm trzyma tam także swój magazyn pakietów.
- Wersję Node wyznacza obraz bazowy zgodny z `.node-version`, wersję pnpm pole `packageManager` (Corepack).
- Vite i Vitest obserwują pliki przez odpytywanie (`FF_WATCH_POLLING=1`), bo zdarzenia systemu plików nie przechodzą z Windows do kontenera.
- Git działa na hoście. W kontenerze jest tylko po to, by build mógł odczytać skrót commita.

Docker dotyczy wyłącznie pracy lokalnej. CI w GitHub Actions i build na Render używają zwykłego Node i pnpm, więc projekt nie może wymagać Dockera do zbudowania.

## Konsekwencje

- Na hoście nie ma zainstalowanych zależności. Katalog `node_modules` w projekcie jest pusty, więc edytor na hoście nie widzi typów ani binarki Biome. Pełne podpowiedzi daje podłączenie VS Code do działającego kontenera (rozszerzenie Dev Containers, „Attach to Running Container”).
- HMR i tryb watch testów reagują z opóźnieniem rzędu ułamka sekundy z powodu odpytywania.
- Wyniki pomiarów wydajności symulacji z kontenera są zbliżone do natywnych; wydajność renderowania mierzymy w przeglądarce na hoście, nie w kontenerze.
- Końce linii w repozytorium to zawsze LF (`.gitattributes`), bo formatowanie i testy działają pod Linuksem.
- Dodanie zależności: `docker compose exec dev pnpm add ...`; `package.json` i `pnpm-lock.yaml` zmieniają się na hoście przez montowanie.
- Obraz zawiera biblioteki systemowe przeglądarki dla testów end-to-end (`playwright install-deps chromium`, od M4-11). Sama przeglądarka leży w wolumenie `node_modules` i pobiera się raz przez `pnpm e2e:install`. Wersja Playwright w `Dockerfile.dev` musi być zgodna z `package.json`; pilnuje tego test `scripts/lib/tooling.test.ts`. Po zmianie wersji: `docker compose build dev`.
