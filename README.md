# Five Fangs

Przeglądarkowy auto-battler 2D z widokiem z boku, dla jednego gracza, bez backendu. Gracz układa skład do pięciu bohaterów, rozwija ich i wyposaża w runy; walki toczą się same i bez losowości, więc ten sam skład na tym samym poziomie zawsze daje ten sam wynik. Gra ma 36 poziomów w 6 światach.

Technicznie: TypeScript, Vite, Preact i Canvas 2D; symulacja walki działa także w Node, bez przeglądarki.

## Uruchomienie

Wszystko działa w kontenerze Docker, zależności nie instaluje się na komputerze:

```bash
docker compose up -d dev                # gra na http://localhost:5173
docker compose exec dev pnpm <komenda>  # dowolna komenda z package.json
```

Narzędzia deweloperskie (edytor animacji, piaskownica walki) są pod `/tools.html`.

## Przed commitem

```bash
docker compose exec dev pnpm format   # układ plików według Biome
docker compose exec dev pnpm check    # typy, lint, testy, walidacja treści, granice modułów
```

`pnpm format` jest potrzebny zawsze po ręcznej edycji plików, także JSON-ów z danymi gry. Edytor potrafi zapisać plik w innym układzie niż Biome, a wtedy lint w CI odrzuca commit, choć treść jest poprawna.

Przed wypchnięciem zmian, które mają trafić na `main`, warto uruchomić też resztę kroków CI:

```bash
docker compose exec dev pnpm test:coverage
docker compose exec dev pnpm build
docker compose exec dev pnpm check:size
docker compose exec dev pnpm check:dist
docker compose exec dev pnpm test:e2e
```

## Zmiana balansu

Liczby bohaterów, run i poziomów leżą w `src/content/data/`. Po ich zmianie:

```bash
docker compose exec dev pnpm balance:heroes   # raport reports/heroes.md
docker compose exec dev pnpm balance          # raport reports/balance.md
```

Poziomy są wystrojone pod konkretne liczby bohaterów i run, więc po zmianie tych liczb część testów reguł przestaje przechodzić, dopóki poziomy nie zostaną dostrojone.

## Dokumentacja

- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md): zasady gry, bohaterowie, poziomy
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): moduły, symulacja, renderer, zapis gry
- [docs/ROADMAP.md](docs/ROADMAP.md): zadania i ich stan
- [docs/DEPLOY.md](docs/DEPLOY.md): CI i wdrożenie
- [docs/adr/](docs/adr/): decyzje architektoniczne i projektowe
- [CLAUDE.md](CLAUDE.md): zasady pracy nad kodem i pełna lista komend
