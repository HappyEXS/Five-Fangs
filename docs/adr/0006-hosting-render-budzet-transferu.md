# ADR 0006: Render jako hosting testowy, budżet transferu, deploy po zielonym CI

- Status: zaakceptowany; wartości limitów do potwierdzenia przy pierwszym deployu
- Data: 2026-10-02

## Kontekst

Gra jest w całości statyczna. Na etapie rozwoju potrzebne jest miejsce, w którym kilka osób może testować aktualny build. Autor gry wybrał darmowy plan Render (Static Site), bez podpiętej karty.

Stan wiedzy z 2026-10-02:

- Źródła nieoficjalne podają ok. 5 GB transferu wychodzącego i ok. 500 minut buildu miesięcznie. Oficjalna dokumentacja potwierdza istnienie obu limitów i skutki ich przekroczenia, ale liczb nie udało się w niej odczytać.
- Bez karty po wyczerpaniu transferu Render wstrzymuje wszystkie darmowe usługi do końca miesiąca; po wyczerpaniu minut buildu wyłącza nowe buildy.
- Blueprint (`render.yaml`) obsługuje `autoDeployTrigger: checksPass` oraz `buildFilter`.

## Decyzja

1. Render (plan darmowy, subdomena `onrender.com`) jest **środowiskiem testowym**, nie docelowym hostingiem publicznym. Hosting publiczny wybierzemy przed premierą w osobnym ADR; kandydatem domyślnym jest Cloudflare Pages.
2. Nie podpinamy karty i nie przechodzimy na plan płatny.
3. Deploy z `main` przez `autoDeployTrigger: checksPass`. Nie używamy Deploy Hooka ani osobnego workflow deployu, chyba że pierwszy deploy wykaże zakleszczenie ze smoke checkiem ([DEPLOY.md §5](../DEPLOY.md)).
4. Build na Render to wyłącznie instalacja zależności i `vite build`. Testy i walidacje działają w GitHub Actions. `buildFilter` pomija zmiany w dokumentacji, raportach i testach.
5. Budżety transferu obowiązują niezależnie od hosta i są sprawdzane w CI: pierwsze uruchomienie < 2 MB, atlas świata < 1 MB, JS gzip < 150 KB, powtórna wizyta < 20 KB.
6. Przenośność: `base: './'`, brak routingu po ścieżkach, nagłówki równolegle w `render.yaml` i `public/_headers`, zero zapytań do zewnętrznych domen.
7. Bez drugiego środowiska, bez własnej domeny, bez PWA i bez telemetrii na tym etapie.

## Konsekwencje

- Przy 5 GB i 2 MB na pierwsze uruchomienie mieści się ok. 2500 pierwszych wizyt miesięcznie, a przy buildzie poniżej 2 minut ponad 250 deployów. Dla kilku testerów to duży zapas.
- Ten sam limit byłby za mały dla publicznej premiery, stąd punkt 1.
- Dwie konfiguracje nagłówków trzeba utrzymywać w zgodzie; pilnuje tego test `scripts/lib/render-config.test.ts`.
- Rollback i monitorowanie limitów opisuje [DEPLOY.md](../DEPLOY.md).

## Stan weryfikacji (2026-10-02)

Potwierdzone:

- Składnia reguł nagłówków w Blueprint (`path`, `name`, `value`) na podstawie dokumentacji nagłówków Render.
- Build produkcyjny działa pod polityką CSP z `render.yaml` (sprawdzone lokalnie na `vite preview` z tymi samymi nagłówkami).
- Skrypt smoke check wykonuje pełną ścieżkę na lokalnym podglądzie: rozpoznaje commit, nagłówki bezpieczeństwa, kompresję i status 404. Zgłasza tam jedną, oczekiwaną różnicę: podgląd Vite nie ustawia `Cache-Control: immutable` dla `/assets/*`, bo tę regułę stosuje dopiero hosting.

Do uzupełnienia przy pierwszym deployu ([DEPLOY.md §6](../DEPLOY.md)):

- Rzeczywiste limity transferu i minut buildu z panelu Render.
- Wersja Node faktycznie użyta przez build na Render.
- Wynik sprawdzenia, czy `checksPass` współpracuje ze smoke checkiem.
