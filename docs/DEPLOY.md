# Deploy – Five Fangs

Stan na 2026-10-02: plan, przed pierwszym deployem. Wartości oznaczone **[M0]** zostaną zweryfikowane i uzupełnione w zadaniu M0-8 z [ROADMAP.md](ROADMAP.md). Uzasadnienie decyzji: [ADR 0006](adr/0006-hosting-render-budzet-transferu.md).

## 1. Założenia

- Gra jest w całości statyczna: `dist/` po `pnpm build` to komplet. Brak serwera, funkcji, bazy i sekretów. Wszystko w paczce jest publiczne, także zmienne `VITE_*`.
- **Render (Static Site, plan darmowy, bez karty, subdomena `onrender.com`) jest środowiskiem testowym** dla kilku osób. Hosting publiczny zostanie wybrany przed premierą.
- Kod gry nie zależy od Render. Nagłówki są utrzymywane równolegle w `render.yaml` i `public/_headers`.
- Gra nie wykonuje zapytań do zewnętrznych domen.

## 2. Limity darmowego planu

| Zasób | Wartość | Źródło |
|---|---|---|
| Transfer wychodzący | ok. 5 GB / mies. **[M0]** | źródła nieoficjalne, 2026 |
| Minuty buildu | ok. 500 / mies. **[M0]** | źródła nieoficjalne, 2026 |
| Po wyczerpaniu transferu, bez karty | wstrzymanie wszystkich darmowych usług do końca miesiąca | [dokumentacja Render](https://render.com/docs/free) |
| Po wyczerpaniu minut buildu, bez karty | nowe buildy wyłączone do końca miesiąca | [dokumentacja Render](https://render.com/docs/free) |

Dokładne liczby odczytać w panelu Render (Billing) i wpisać tutaj oraz do ADR 0006.

Szacunek przy 5 GB i budżecie pierwszego uruchomienia 2 MB: ok. 2500 pierwszych wizyt miesięcznie. Powtórna wizyta bez nowej wersji to poniżej 20 KB. Po deployu gracz pobiera tylko zmienione pliki. Build poniżej 2 minut daje ponad 250 deployów miesięcznie. Dla kilku testerów zapas jest bardzo duży.

## 3. `render.yaml`

Szkic; składnię pól `headers` i sposób przypięcia wersji Node potwierdzić z aktualną dokumentacją Blueprint **[M0]**.

```yaml
services:
  - type: web
    runtime: static
    name: five-fangs
    branch: main
    autoDeployTrigger: checksPass
    buildCommand: corepack enable && pnpm install --frozen-lockfile && pnpm build
    staticPublishPath: ./dist
    buildFilter:
      ignoredPaths:
        - docs/**
        - reports/**
        - tests/**
        - "**/*.md"
        - "**/*.test.ts"
    headers:
      - path: /assets/*
        name: Cache-Control
        value: public, max-age=31536000, immutable
      - path: /index.html
        name: Cache-Control
        value: no-cache
      - path: /
        name: Cache-Control
        value: no-cache
      - path: /version.json
        name: Cache-Control
        value: no-cache
      - path: /*
        name: Content-Security-Policy
        value: "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
      - path: /*
        name: X-Content-Type-Options
        value: nosniff
      - path: /*
        name: Referrer-Policy
        value: strict-origin-when-cross-origin
      - path: /*
        name: Permissions-Policy
        value: camera=(), microphone=(), geolocation=(), payment=(), usb=()
```

- Wersja Node: plik `.node-version` (aktualny LTS) i pole `engines` w `package.json`; pnpm przez Corepack i pole `packageManager`.
- Brak reguł `routes`: gra nie ma routingu po ścieżkach, więc brakujący plik ma zwracać 404, a nie `index.html`.
- `frame-ancestors 'none'` to wartość domyślna do czasu decyzji o osadzaniu gry na innych stronach.

`public/_headers` zawiera te same reguły w formacie Cloudflare Pages / Netlify. Zmiana w jednym pliku wymaga zmiany w drugim.

## 4. Wymagania wobec builda

- `base: './'` w `vite.config.ts`.
- Wszystkie zmieniające się pliki (JS, CSS, atlasy, fonty, dźwięki) przechodzą przez Vite i mają hash w nazwie.
- `dist/version.json`: wersja z `package.json`, skrót commita, data buildu. Ta sama wersja wpiekana w paczkę przez `define`.
- Source mapy generowane; `check:size` nie wlicza plików `.map` do budżetów.
- Budżety (`pnpm check:size`, liczone po kompresji): JS gzip < 150 KB, pierwsze uruchomienie < 2 MB, atlas świata < 1 MB.
- W `dist/` nie ma śladu `src/tools` ani kodu debug (test w CI).

## 5. Pipeline

1. **Push / PR → GitHub Actions (`ci.yml`)**: `typecheck`, `lint`, `test`, `test:golden`, `validate-content`, `deps:check`, `build`, `check:size`, `check:dist`.
2. **Deploy**: Render buduje `main` dopiero po zielonych checkach (`autoDeployTrigger: checksPass`). Build na Render to tylko instalacja i `vite build`.
3. **Smoke check (`smoke.yml`)**: po udanym CI na `main` pobiera `https://<domena>/version.json` z ponawianiem (do ok. 10 minut) i porównuje skrót commita; sprawdza `Cache-Control` jednego pliku z `/assets/` oraz `index.html`. Pomijany, gdy zmiana dotyczyła tylko ścieżek z `buildFilter.ignoredPaths`.

**Ryzyko do sprawdzenia [M0]:** jeśli Render uzna smoke check za jeden z checków, na które czeka, powstanie zakleszczenie (deploy czeka na smoke, smoke czeka na deploy). Wtedy plan zapasowy: `autoDeployTrigger: off`, a ostatni krok `ci.yml` na `main` wywołuje Deploy Hook (URL jako sekret GitHub) i wykonuje smoke check w tym samym workflow.

## 6. Weryfikacja po pierwszym deployu

```bash
curl -sI https://<domena>/                       # Cache-Control: no-cache, komplet nagłówków bezpieczeństwa
curl -sI https://<domena>/version.json           # Cache-Control: no-cache
curl -sI https://<domena>/assets/<plik-z-hashem> # public, max-age=31536000, immutable
curl -sI -H 'Accept-Encoding: br, gzip' https://<domena>/assets/<plik.js>  # Content-Encoding obecne
curl -sI https://<domena>/nie-ma-takiego-pliku   # 404, nie 200 z HTML
```

Sprawdzić, że reguła `/*` nie nadpisała `Cache-Control` dla `/assets/*`.

## 7. Aktualizacje w trakcie gry

Render serwuje tylko najnowszy build, więc gracz ze starą wersją może dostać 404 na leniwie ładowany plik. Zachowanie gry opisuje [ARCHITECTURE.md §6.3](ARCHITECTURE.md): obsługa błędu ładowania, sprawdzanie `version.json` przy zmianie sceny, ochrona zapisu nowszej wersji.

## 8. Rollback

1. Szybko: w panelu Render, w historii deployów usługi, ponowić deploy poprzedniego commita.
2. Trwale: `git revert` wadliwego commita na `main`; po zielonym CI Render wdroży poprawkę.

Zapis gry jest zgodny w przód (migracje), ale nie wstecz: po rollbacku gracze z zapisem z nowszej wersji zobaczą prośbę o odświeżenie zamiast utraty danych. Rollback wersji, która podniosła `saveVersion`, wymaga więc szybkiej poprawki w przód.

## 9. Monitorowanie limitów

- Raz w tygodniu w trakcie testów: zużycie transferu i minut buildu w panelu Render.
- Przy 70% któregokolwiek limitu w miesiącu: wstrzymać zbędne deploye i rozważyć przeniesienie.
- Minuty buildu oszczędza `buildFilter` oraz łączenie zmian w mniej pushy na `main`.

## 10. Przeniesienie na inny hosting

Cel domyślny: Cloudflare Pages (transfer statyczny bez limitu, natywny `_headers`).

1. Utworzyć projekt Pages z repozytorium: komenda `pnpm build`, katalog `dist`, wersja Node z `.node-version`.
2. `public/_headers` działa bez zmian; sprawdzić nagłówki poleceniami z sekcji 6.
3. Przestawić adres w `smoke.yml`.
4. Wyłączyć usługę na Render i usunąć `render.yaml` albo zostawić ją jako środowisko testowe.

Kod gry nie wymaga zmian: `base: './'`, brak routingu po ścieżkach, brak zależności od hosta.
