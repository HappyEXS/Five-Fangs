# Deploy – Five Fangs

Stan na 2026-10-02: konfiguracja gotowa w repozytorium, pierwszy deploy jeszcze nie wykonany. Pozycje oznaczone **[do potwierdzenia]** wymagają dostępu do konta Render i uzupełnia się je przy pierwszym deployu (sekcja 6). Uzasadnienie decyzji: [ADR 0006](adr/0006-hosting-render-budzet-transferu.md).

## 1. Założenia

- Gra jest w całości statyczna: `dist/` po `pnpm build` to komplet. Brak serwera, funkcji, bazy i sekretów. Wszystko w paczce jest publiczne, także zmienne `VITE_*`.
- **Render (Static Site, plan darmowy, bez karty, subdomena `onrender.com`) jest środowiskiem testowym** dla kilku osób. Hosting publiczny zostanie wybrany przed premierą.
- Kod gry nie zależy od Render. Nagłówki są utrzymywane równolegle w `render.yaml` i `public/_headers`.
- Gra nie wykonuje zapytań do zewnętrznych domen.
- `public/robots.txt` zabrania indeksowania, bo to środowisko testowe. Zmienić przed publiczną premierą.

## 2. Limity darmowego planu

| Zasób | Wartość | Źródło |
|---|---|---|
| Transfer wychodzący | ok. 5 GB / mies. **[do potwierdzenia]** | źródła nieoficjalne, 2026 |
| Minuty buildu | ok. 500 / mies. **[do potwierdzenia]** | źródła nieoficjalne, 2026 |
| Po wyczerpaniu transferu, bez karty | wstrzymanie wszystkich darmowych usług do końca miesiąca | [dokumentacja Render](https://render.com/docs/free) |
| Po wyczerpaniu minut buildu, bez karty | nowe buildy wyłączone do końca miesiąca | [dokumentacja Render](https://render.com/docs/free) |

Dokładne liczby odczytać w panelu Render (Billing) i wpisać tutaj oraz do ADR 0006.

Szacunek przy 5 GB i budżecie pierwszego uruchomienia 2 MB: ok. 2500 pierwszych wizyt miesięcznie. Obecny build to ok. 12 KB transferu przy pierwszym uruchomieniu. Powtórna wizyta bez nowej wersji to poniżej 20 KB. Po deployu gracz pobiera tylko zmienione pliki. Build poniżej 2 minut daje ponad 250 deployów miesięcznie. Dla kilku testerów zapas jest bardzo duży.

## 3. Konfiguracja hostingu

Źródłem prawdy jest [render.yaml](../render.yaml) w katalogu głównym; `public/_headers` zawiera te same reguły w formacie Cloudflare Pages / Netlify. Test `scripts/lib/render-config.test.ts` nie przejdzie, jeśli pliki się rozjadą.

| Ustawienie | Wartość | Uwagi |
|---|---|---|
| Typ usługi | `type: web`, `runtime: static` | |
| Gałąź | `main` | |
| Deploy | `autoDeployTrigger: checksPass` | Dopiero po zielonych checkach CI na commicie |
| Build | `corepack enable && pnpm install --frozen-lockfile && pnpm build` | Bez testów; te działają w GitHub Actions |
| Katalog publikacji | `./dist` | |
| `buildFilter.ignoredPaths` | `docs/**`, `reports/**`, `tests/**`, `**/*.md`, `**/*.test.ts` | Takie zmiany nie zużywają minut buildu |
| Wersja Node | plik `.node-version` | **[do potwierdzenia]** w logu pierwszego buildu |
| pnpm | pole `packageManager` w `package.json`, przez Corepack | |

Nagłówki:

| Ścieżka | Nagłówek | Wartość |
|---|---|---|
| `/assets/*` | `Cache-Control` | `public, max-age=31536000, immutable` |
| `/`, `/index.html`, `/version.json` | `Cache-Control` | `no-cache` |
| `/*` | `Content-Security-Policy` | tylko `'self'`; bez `unsafe-inline`, `unsafe-eval` i obcych domen |
| `/*` | `X-Content-Type-Options` | `nosniff` |
| `/*` | `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `/*` | `Permissions-Policy` | wyłączone: kamera, mikrofon, geolokalizacja, płatności, USB |

- Składnia reguł (`path`, `name`, `value`) jest zgodna z dokumentacją nagłówków Render. W regułach nagłówków `/*` obejmuje wszystkie ścieżki.
- Żadna reguła nie ustawia `Cache-Control` dla `/*`, więc nie ma konfliktu z regułą dla `/assets/*`. Domyślny `Cache-Control` Render dla pozostałych plików (`favicon.svg`, `robots.txt`) **[do potwierdzenia]**.
- Brak reguł `routes`: gra nie ma routingu po ścieżkach, więc brakujący plik ma zwracać 404, a nie `index.html`. Lokalnie to samo zachowanie daje `appType: 'mpa'` w `vite.config.ts`.
- `frame-ancestors 'none'` to wartość domyślna do czasu decyzji o osadzaniu gry na innych stronach.
- `vite preview` wysyła te same nagłówki bezpieczeństwa (czyta `public/_headers`), więc naruszenie CSP widać lokalnie. Sprawdzone: build produkcyjny renderuje się pod tą polityką bez naruszeń.

## 4. Wymagania wobec builda

- `base: './'` w `vite.config.ts`.
- Wszystkie zmieniające się pliki (JS, CSS, atlasy, fonty, dźwięki) przechodzą przez Vite i mają hash w nazwie. W `public/` są tylko pliki o stałych nazwach: `_headers`, `favicon.svg`, `robots.txt`.
- `dist/version.json`: wersja z `package.json`, pełny skrót commita, data buildu. Te same dane są wpiekane w paczkę przez `define`. Commit pochodzi ze zmiennej `RENDER_GIT_COMMIT`, `GITHUB_SHA` albo `CF_PAGES_COMMIT_SHA`, a lokalnie z gita.
- Source mapy są generowane; `check:size` nie wlicza plików `.map` do budżetów.
- Budżety (`pnpm check:size`, tekst liczony po gzip, KB i MB po 1024): JS < 150 KB, pierwsze uruchomienie < 2 MB, pojedynczy plik świata < 1 MB. Pliki światów rozpoznawane są po nazwie `world_<numer>...`; świat 1 wlicza się do pierwszego uruchomienia.
- `pnpm check:dist`: w `dist/` nie ma plików narzędzi dev ani znaczników kodu deweloperskiego, adresy w HTML są względne, `version.json` jest kompletny.

## 5. Pipeline

1. **Push do `main` / PR → GitHub Actions (`ci.yml`)**: `typecheck`, `lint`, `test`, `test:golden`, `validate-content`, `deps:check`, `build`, `check:size`, `check:dist`, `test:e2e` (Playwright na `vite preview`).
2. **Deploy**: Render buduje `main` dopiero po zielonych checkach (`autoDeployTrigger: checksPass`).
3. **Smoke check (`smoke.yml`, skrypt `scripts/smoke-check.ts`)**: po udanym CI na `main` czeka do 10 minut, aż `version.json` na stronie poda skrót wdrażanego commita. Potem sprawdza, że `/`, `/version.json` i pierwszy skrypt z `/assets/` mają dokładnie nagłówki z `render.yaml`, że skrypt jest skompresowany i że brakujący plik zwraca 404.
   - Adres strony: zmienna repozytorium `SITE_URL`. Bez niej workflow kończy się od razu bez błędu.
   - Jeśli ostatni commit zmienia tylko ścieżki z `buildFilter.ignoredPaths`, smoke check kończy się od razu, bo Render nie wykona deployu.

Skrypt da się uruchomić ręcznie:

```bash
docker compose exec -e SITE_URL=https://<domena> -e EXPECTED_COMMIT=$(git rev-parse HEAD) dev pnpm smoke
```

**Ryzyko [do potwierdzenia]:** jeśli Render uzna smoke check za jeden z checków, na które czeka, powstanie zakleszczenie (deploy czeka na smoke, smoke czeka na deploy). Objaw: Render nie zaczyna buildu, a smoke check kończy się po 10 minutach błędem. Plan zapasowy: `autoDeployTrigger: off`, a ostatni krok `ci.yml` na `main` wywołuje Deploy Hook (URL jako sekret GitHub) i uruchamia smoke check w tym samym workflow.

## 6. Pierwszy deploy

Kroki wymagające konta Render i uprawnień do repozytorium na GitHubie:

1. Scalić gałąź z fundamentami do `main` i wypchnąć. CI na GitHubie powinno przejść.
2. W Render: **New → Blueprint**, wskazać repozytorium `HappyEXS/Five-Fangs`. Render odczyta `render.yaml` i utworzy usługę `five-fangs`.
3. W logu pierwszego buildu sprawdzić wersję Node i pnpm oraz czas buildu.
4. W GitHubie: **Settings → Secrets and variables → Actions → Variables**, dodać `SITE_URL` z adresem strony (np. `https://five-fangs.onrender.com`).
5. Ponowić workflow „Smoke check” albo wypchnąć kolejny commit i sprawdzić, czy przechodzi oraz czy nie ma zakleszczenia z sekcji 5.
6. W panelu Render (Billing) odczytać limity transferu i minut buildu.
7. Uzupełnić pozycje **[do potwierdzenia]** w tym pliku i w ADR 0006.

Ręczna weryfikacja nagłówków (to samo robi smoke check):

```bash
curl -sI https://<domena>/                       # Cache-Control: no-cache, komplet nagłówków bezpieczeństwa
curl -sI https://<domena>/version.json           # Cache-Control: no-cache
curl -sI https://<domena>/assets/<plik-z-hashem> # public, max-age=31536000, immutable
curl -sI -H 'Accept-Encoding: br, gzip' https://<domena>/assets/<plik.js>  # Content-Encoding obecne
curl -sI https://<domena>/nie-ma-takiego-pliku   # 404, nie 200 z HTML
```

## 7. Aktualizacje w trakcie gry

Render serwuje tylko najnowszy build, więc gracz ze starą wersją może dostać 404 na leniwie ładowany plik. Każde leniwe ładowanie przechodzi przez `guardedLoad` (`src/game/update.ts`): przy błędzie gra pobiera `version.json` i pokazuje komunikat o nowej wersji albo o problemie z połączeniem, z przyciskiem przeładowania. Sprawdzanie `version.json` przy zmianie sceny i ochrona zapisu nowszej wersji powstaną w M4 ([ARCHITECTURE.md §6.3](ARCHITECTURE.md)).

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
3. Zmienić wartość zmiennej `SITE_URL` w GitHubie.
4. Wyłączyć usługę na Render i usunąć `render.yaml` albo zostawić ją jako środowisko testowe.

Kod gry nie wymaga zmian: `base: './'`, brak routingu po ścieżkach, brak zależności od hosta.
