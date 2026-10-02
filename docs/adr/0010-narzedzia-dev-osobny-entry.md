# ADR 0010: Narzędzia deweloperskie jako osobne wejście HTML

- Status: zaakceptowany (odstępstwo od briefu startowego, §14.3)
- Data: 2026-10-02

## Kontekst

Piaskownica walki i edytor animacji nie mogą trafić do builda produkcyjnego: zwiększają transfer i odsłaniają narzędzia graczom. Brief proponował wycinanie ich przez `import.meta.env.DEV` i dynamiczny import oraz dostęp przez routing hash (`#/tools`), a `CLAUDE.md` mówił o ścieżce `/tools`. Wycinanie warunkowe działa, ale opiera się na tym, że nikt nie zaimportuje modułu narzędzi statycznie z kodu gry.

## Decyzja

Narzędzia mają własne wejście: `tools.html` w katalogu głównym i `src/tools.ts`. Serwer deweloperski Vite serwuje je pod `/tools.html`. Build produkcyjny ma jedno wejście, `index.html`, więc graf modułów gry nie zawiera `src/tools` i nie ma czego wycinać.

Dodatkowe zabezpieczenia:

- dependency-cruiser zabrania importu `tools` z każdego innego modułu;
- test w CI sprawdza, że w `dist/` nie ma `tools.html` ani charakterystycznych identyfikatorów narzędzi.

Kod debug wewnątrz `render` (pivoty, zasięgi, overlay wydajności) pozostaje za `import.meta.env.DEV`, bo żyje w tym samym module co renderer.

## Konsekwencje

- Gra nie potrzebuje żadnego routingu, także hash.
- Narzędzia mogą swobodnie używać cięższych zależności deweloperskich bez wpływu na budżet paczki.
- Narzędzi nie da się uruchomić na wdrożonej wersji; zgłoszoną walkę odtwarza się lokalnie w piaskownicy na podstawie skopiowanego `BattleSetup`.
- `CLAUDE.md` zmienia opis `pnpm dev` z `/tools` na `/tools.html`.
