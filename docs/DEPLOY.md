# Deploy – Five Fangs

Stan na 2026-10-04: CI na GitHubie przeszło na `main` (commit „version 0.01”); pierwsza próba utworzenia usługi na Render nie powiodła się, bo powstała usługa typu Docker zamiast strony statycznej (sekcja 6). Pozycje oznaczone **[do potwierdzenia]** wymagają dostępu do konta Render i uzupełnia się je przy pierwszym deployu (sekcja 6). Uzasadnienie decyzji: [ADR 0006](adr/0006-hosting-render-budzet-transferu.md).

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
| Build | `corepack pnpm install --frozen-lockfile && corepack pnpm build` | Bez testów; te działają w GitHub Actions. pnpm przez `corepack pnpm`, bo `corepack enable` na Render kończy się błędem EROFS (katalog Node tylko do odczytu) |
| Katalog publikacji | `./dist` | |
| `buildFilter.ignoredPaths` | `docs/**`, `reports/**`, `tests/**`, `**/*.md`, `**/*.test.ts` | Takie zmiany nie zużywają minut buildu |
| Wersja Node | plik `.node-version` | **[do potwierdzenia]** w logu pierwszego buildu |
| pnpm | pole `packageManager` w `package.json`, przez Corepack | |
| `SKIP_INSTALL_DEPS` | `true` | Render nie instaluje zależności sam przed `buildCommand` (swoją wersją pnpm); robi to `buildCommand`, tak jak CI |
| `COREPACK_ENABLE_DOWNLOAD_PROMPT` | `0` | Corepack pobiera pnpm bez pytania (build nie ma terminala) |

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

Gra jest **stroną statyczną** (Render: *Static Site*). Nie jest usługą *Web Service* i nie używa Dockera: `Dockerfile.dev` w repozytorium służy tylko do pracy lokalnej (ADR 0011). Jeśli Render pyta o **Dockerfile Path**, to znaczy, że tworzona usługa ma typ *Web Service* z runtime Docker. To zły typ: taką usługę trzeba usunąć i utworzyć stronę statyczną jednym ze sposobów poniżej.

### 6.1 Przed utworzeniem usługi

1. Na `main` musi być aktualny `render.yaml` (z `envVars`: `SKIP_INSTALL_DEPS` i `COREPACK_ENABLE_DOWNLOAD_PROMPT`). CI na GitHubie (zakładka **Actions**, workflow **CI**) musi być zielone dla ostatniego commita `main`.
2. Jeśli istnieje błędnie utworzona usługa (typ *Web Service*, pole *Dockerfile Path*): w panelu Render otwórz ją, **Settings**, na dole **Delete Web Service**. Nazwa `five-fangs` zwolni się dla właściwej usługi.

### 6.2 Sposób zalecany: Blueprint (wszystko z `render.yaml`)

1. Panel Render: **New → Blueprint**.
2. Połącz konto GitHub (jeśli nie jest połączone) i wybierz repozytorium **HappyEXS/Five-Fangs**. Jeśli go nie ma na liście: **Configure account** i nadaj aplikacji Render dostęp do tego repozytorium.
3. **Blueprint Name**: dowolna, np. `five-fangs`. **Branch**: `main`. **Blueprint Path**: zostaw domyślne `render.yaml`.
4. Render pokaże listę zasobów do utworzenia: jedna usługa **five-fangs** typu *Static Site*. Nie powinien pytać o Dockerfile, region ani plan instancji. Jeśli pyta o Dockerfile, czyta inny plik albo inną gałąź: sprawdź punkt 3.
5. **Deploy Blueprint** (albo **Apply**). Render utworzy usługę i zacznie pierwszy build.

Blueprint ustawia od razu wszystko: komendę buildu, katalog `dist`, zmienne, nagłówki, `buildFilter` i `autoDeployTrigger: checksPass`. Kolejne zmiany konfiguracji wprowadza się w `render.yaml` na `main`; Render zastosuje je przy następnej synchronizacji Blueprintu.

### 6.3 Sposób ręczny: New → Static Site

Tylko gdy Blueprint nie wchodzi w grę. Nagłówki i filtry trzeba wtedy przepisać ręcznie i pilnować ich zgodności z `render.yaml`.

1. Panel Render: **New → Static Site**, repozytorium **HappyEXS/Five-Fangs**.
2. Pola formularza:

   | Pole | Wartość |
   |---|---|
   | Name | `five-fangs` |
   | Branch | `main` |
   | Root Directory | puste |
   | Build Command | `corepack pnpm install --frozen-lockfile && corepack pnpm build` |
   | Publish Directory | `dist` |

3. **Advanced → Add Environment Variable**: `SKIP_INSTALL_DEPS` = `true` oraz `COREPACK_ENABLE_DOWNLOAD_PROMPT` = `0`. Nie dodawaj `NODE_ENV=production`: build potrzebuje zależności deweloperskich (Vite).
4. **Create Static Site**.
5. Po utworzeniu, w **Settings**:
   - **Build & Deploy → Auto-Deploy**: deploy po przejściu checków CI (*After CI Checks Pass*).
   - **Build Filters → Ignored Paths**: ścieżki z tabeli w sekcji 3.
   - **Headers**: każda reguła z tabeli nagłówków w sekcji 3 (ścieżka, nazwa, wartość).
   - **Redirects/Rewrites**: nic nie dodawaj (gra nie ma routingu po ścieżkach).

### 6.4 Po pierwszym buildzie

1. W logu buildu (**Events / Logs** usługi) powinny być kolejno: wersja Node 24.x (z `.node-version`), pobranie pnpm 12.8.1 przez Corepack, `pnpm install`, `vite build` i na końcu informacja, że strona działa. Zapisz w sekcji 3 wersję Node i czas buildu.
2. Otwórz adres strony z panelu (np. `https://five-fangs.onrender.com`): gra powinna wystartować ekranem startowym.
3. W GitHubie: **Settings → Secrets and variables → Actions**, zakładka **Variables**, **New repository variable**: `SITE_URL` = adres strony z panelu Render, bez ukośnika na końcu.
4. Smoke check rusza sam po każdym zielonym CI na `main`. Żeby sprawdzić go od razu: **Actions → Smoke check**, ostatnie uruchomienie, **Re-run all jobs**. Musi przejść; zwróć uwagę na zakleszczenie opisane w sekcji 5.
5. W panelu Render (**Billing**) odczytaj limity transferu i minut buildu.
6. Uzupełnij pozycje **[do potwierdzenia]** w tym pliku i w ADR 0006.

### 6.5 Gdy build albo deploy się nie udaje

| Objaw | Przyczyna i co zrobić |
|---|---|
| Formularz wymaga **Dockerfile Path**; build kończy się błędem o brakującym `Dockerfile` | Usługa ma typ *Web Service* (Docker). Usuń ją i utwórz *Static Site* (6.2 albo 6.3) |
| Błąd przy instalacji zależności przed naszą komendą, inna wersja pnpm niż 12.8.1, błąd lockfile'a | Brak `SKIP_INSTALL_DEPS=true` (Render instaluje zależności sam, swoją wersją pnpm). Dodaj zmienną albo zsynchronizuj Blueprint |
| `EROFS: read-only file system, unlink '/usr/bin/pnpm'` przy `corepack enable` | Na Render Node i jego skróty leżą w `/usr`, który jest tylko do odczytu. Komenda buildu nie może zawierać `corepack enable`; używa `corepack pnpm …` (jak w `render.yaml`). Sprawdzone lokalnie w kontenerze z systemem plików tylko do odczytu |
| `corepack: command not found` albo inna wersja Node niż 24 | Render nie odczytał `.node-version`: ustaw zmienną `NODE_VERSION` = `24` w **Environment** usługi |
| `vite: not found` | Zainstalowały się tylko zależności produkcyjne: usuń `NODE_ENV=production` ze zmiennych usługi |
| Build się udał, ale strona zwraca 404 | **Publish Directory** różne od `dist` |
| Po pushu na `main` deploy nie startuje | `autoDeployTrigger: checksPass` czeka na zielone CI: sprawdź zakładkę **Actions**; zmiany tylko w `docs/`, `reports/`, `tests/` i plikach `.md` celowo nie budują strony (`buildFilter`) |
| Strona działa, ale konsola przeglądarki pokazuje naruszenia CSP | Nagłówki w panelu różnią się od `render.yaml` (przy usłudze ręcznej): porównaj z tabelą w sekcji 3 |

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
