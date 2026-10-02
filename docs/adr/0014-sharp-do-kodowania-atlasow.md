# ADR 0014: sharp jako zależność deweloperska potoku atlasów

- Status: zaakceptowany (nowa zależność deweloperska; do wiadomości autora)
- Data: 2026-10-02

## Kontekst

Plan zakłada atlasy w formacie WebP, importowane przez Vite. Potok `pnpm atlas` musi więc dekodować źródłowe PNG od grafika (dowolne warianty formatu) i kodować WebP. Do M2 atlas placeholderów był zapisywany własnym koderem PNG bez zależności.

Możliwości:

1. Zostać przy PNG z własnego kodera i dopisać własny dekoder.
2. Napisać własny koder WebP.
3. Użyć sharp (libvips) jako zależności deweloperskiej.

Wariant 1 łamie ustalenie o WebP: przy docelowych gładkich grafikach PNG jest wyraźnie większy, a budżet atlasu świata to 1 MB. Już atlas placeholderów ma 21 KB jako bezstratny WebP wobec 30 KB jako PNG. Wariant 2 to tygodnie pracy nad kodem, który nie jest grą.

## Decyzja

`sharp` w `devDependencies`, używany wyłącznie w `scripts/lib/image-codec.ts` (dekodowanie źródeł, kodowanie atlasu).

- Wygenerowane atlasy leżą w repozytorium (`src/assets/generated/`). Build produkcyjny ich nie odtwarza i nie uruchamia sharp.
- Kod trafiający do paczki nie importuje sharp: `pnpm deps:check` ma listę pakietów dozwolonych w każdej warstwie i sharp nie ma na żadnej. Wyjątkiem są narzędzia dev (`src/tools`), które mogą importować wszystko, ale nie trafiają do `dist/`.
- Aktualność atlasów sprawdza test porównujący zdekodowane piksele, nie bajty pliku, bo te mogą się różnić między wersjami kodera.

## Konsekwencje

- `pnpm install` pobiera gotową bibliotekę libvips dla platformy (ok. 8 MB). Dotyczy to też instalacji na Render i w CI, choć build jej nie używa. Jeśli czas instalacji na Render stanie się problemem, sharp można przenieść do `optionalDependencies` i instalować tam z `--no-optional`.
- Biblioteka jest binarna. Działa w kontenerze deweloperskim (Debian) i w GitHub Actions (Ubuntu); na innej platformie pnpm dobierze inny pakiet binarny.
- Własny koder PNG zostaje: generator placeholderów zapisuje nim pliki źródłowe, a jego wynik jest deterministyczny co do bajta.
- Atlas stratny (`"lossless": false` w manifeście) nie jest sprawdzany piksel po pikselu; test porównuje wtedy tylko metadane i wymiary.
