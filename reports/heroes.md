# Balans bohaterów

Wygenerowany przez `pnpm balance:heroes` (ADR 0024). Walki bez ulepszeń i run, każda para z obu stron pola.

## Pojedynki form tego samego stopnia

„W drużynie” to różnica pozostałego życia, gdy forma staje w trójce ludzi swojego stopnia przeciw takiej samej trójce (0 = forma ludzi z tej trójki).

### Formy bazowe

| Forma | Szczep | Wygrane | Remisy | Przegrane | W drużynie |
|---|---|---|---|---|---|
| Orb | Immortals | 5 | 0 | 0 | +60 |
| Bush | Plants | 3 | 0 | 2 | +38 |
| Monstrosity | Beasts | 3 | 0 | 2 | +31 |
| Bot | Robots | 3 | 0 | 2 | +27 |
| Miecznik | Miecznicy | 1 | 0 | 4 | 0 |
| Łucznik | Łucznicy | 0 | 0 | 5 | -18 |

Średni bilans (wygrane minus przegrane): Immortals 5.0, Plants 1.0, Beasts 1.0, Robots 1.0, Miecznicy -3.0, Łucznicy -5.0.

### Pierwsza ewolucja

| Forma | Szczep | Wygrane | Remisy | Przegrane | W drużynie |
|---|---|---|---|---|---|
| Cardinal | Immortals | 11 | 0 | 0 | +22 |
| Reaper | Beasts | 10 | 0 | 1 | 0 |
| Guardian of hell | Immortals | 8 | 1 | 2 | 0 |
| Egzo-bot | Robots | 8 | 0 | 3 | -1 |
| Ivy | Plants | 7 | 0 | 4 | +22 |
| Holo-bot | Robots | 5 | 1 | 5 | +11 |
| Batfang | Beasts | 5 | 0 | 6 | +15 |
| Trunk | Plants | 5 | 0 | 6 | +10 |
| Zbrojny | Miecznicy | 3 | 0 | 8 | 0 |
| Tarczownik | Miecznicy | 2 | 0 | 9 | -7 |
| Strzelec | Łucznicy | 1 | 0 | 10 | +19 |
| Akolita | Łucznicy | 0 | 0 | 11 | -12 |

Średni bilans (wygrane minus przegrane): Immortals 8.5, Beasts 4.0, Robots 2.5, Plants 1.0, Miecznicy -6.0, Łucznicy -10.0.

### Druga ewolucja

| Forma | Szczep | Wygrane | Remisy | Przegrane | W drużynie |
|---|---|---|---|---|---|
| Ultimus | Immortals | 22 | 0 | 1 | +36 |
| Thermobot | Robots | 22 | 0 | 1 | +32 |
| Enigmatix | Immortals | 20 | 0 | 3 | +19 |
| Mother-tree | Plants | 18 | 4 | 1 | -4 |
| Ignitix | Beasts | 18 | 0 | 5 | +57 |
| Oak warrior | Plants | 18 | 0 | 5 | +33 |
| Xartix | Immortals | 18 | 0 | 5 | +20 |
| Titan-bot | Robots | 16 | 0 | 7 | -1 |
| Ironbeak | Beasts | 15 | 0 | 8 | +22 |
| Tuskovator | Beasts | 13 | 0 | 10 | +18 |
| Whirl-bot | Robots | 13 | 0 | 10 | -5 |
| Ax-bot | Robots | 12 | 0 | 11 | -10 |
| Spiker | Beasts | 10 | 2 | 11 | +55 |
| Berserker | Miecznicy | 11 | 0 | 12 | -15 |
| Rycerz | Miecznicy | 9 | 0 | 14 | 0 |
| Strażnik | Miecznicy | 7 | 1 | 15 | -27 |
| Pawężnik | Miecznicy | 6 | 1 | 16 | +12 |
| Polaris | Immortals | 5 | 2 | 16 | +43 |
| Ice Ivy | Plants | 4 | 4 | 15 | +35 |
| Inkwizytor | Łucznicy | 4 | 1 | 18 | -19 |
| Toxic Ivy | Plants | 3 | 2 | 18 | +22 |
| Strzelec wyborowy | Łucznicy | 2 | 1 | 20 | +22 |
| Łowca | Łucznicy | 1 | 0 | 22 | +2 |
| Kapłan | Łucznicy | 0 | 0 | 23 | -19 |

Średni bilans (wygrane minus przegrane): Immortals 10.0, Robots 8.5, Plants 1.0, Beasts 5.5, Miecznicy -6.0, Łucznicy -19.0.

## Drużyny szczepów 5 na 5, ulepszenia: 0

Wiersz gra po stronie gracza; „limit” to koniec czasu, czyli przegrana gracza.

| Gracz \ Przeciwnik | Miecznicy | Łucznicy | Ludzie (mieszana) | Beasts | Immortals | Plants | Robots |
|---|---|---|---|---|---|---|---|
| Miecznicy | · | wygrana 13 s | przegrana 28 s | przegrana 17 s | przegrana 12 s | przegrana 22 s | przegrana 20 s |
| Łucznicy | przegrana 13 s | · | przegrana 9 s | przegrana 21 s | przegrana 8 s | przegrana 16 s | przegrana 11 s |
| Ludzie (mieszana) | wygrana 28 s | wygrana 9 s | · | przegrana 18 s | przegrana 12 s | przegrana 19 s | przegrana 15 s |
| Beasts | wygrana 17 s | wygrana 21 s | wygrana 18 s | · | przegrana 19 s | przegrana 46 s | wygrana 18 s |
| Immortals | wygrana 12 s | wygrana 8 s | wygrana 12 s | wygrana 19 s | · | przegrana 90 s | wygrana 19 s |
| Plants | wygrana 22 s | wygrana 16 s | wygrana 19 s | wygrana 46 s | wygrana 90 s | · | przegrana 63 s |
| Robots | wygrana 20 s | wygrana 11 s | wygrana 15 s | przegrana 18 s | przegrana 19 s | wygrana 63 s | · |

## Drużyny szczepów 5 na 5, ulepszenia: 4

Wiersz gra po stronie gracza; „limit” to koniec czasu, czyli przegrana gracza.

| Gracz \ Przeciwnik | Miecznicy | Łucznicy | Ludzie (mieszana) | Beasts | Immortals | Plants | Robots |
|---|---|---|---|---|---|---|---|
| Miecznicy | · | wygrana 13 s | przegrana 25 s | przegrana 17 s | przegrana 12 s | przegrana 23 s | przegrana 20 s |
| Łucznicy | przegrana 13 s | · | przegrana 9 s | przegrana 20 s | przegrana 8 s | przegrana 17 s | przegrana 11 s |
| Ludzie (mieszana) | wygrana 25 s | wygrana 9 s | · | przegrana 18 s | przegrana 12 s | przegrana 21 s | przegrana 14 s |
| Beasts | wygrana 17 s | wygrana 20 s | wygrana 18 s | · | przegrana 18 s | przegrana 48 s | wygrana 18 s |
| Immortals | wygrana 12 s | wygrana 8 s | wygrana 12 s | wygrana 18 s | · | limit 90 s | wygrana 19 s |
| Plants | wygrana 23 s | wygrana 17 s | wygrana 21 s | wygrana 48 s | limit 90 s | · | przegrana 58 s |
| Robots | wygrana 20 s | wygrana 11 s | wygrana 14 s | przegrana 18 s | przegrana 19 s | wygrana 58 s | · |

## Drużyny pokazowe

- Miecznicy: Strażnik, Pawężnik, Rycerz, Berserker, Zbrojny
- Łucznicy: Inkwizytor, Strzelec wyborowy, Strzelec, Łowca, Kapłan
- Ludzie (mieszana): Strażnik, Rycerz, Berserker, Strzelec wyborowy, Kapłan
- Beasts: Tuskovator, Ironbeak, Reaper, Spiker, Ignitix
- Immortals: Enigmatix, Xartix, Guardian of hell, Ultimus, Polaris
- Plants: Oak warrior, Trunk, Toxic Ivy, Ice Ivy, Mother-tree
- Robots: Titan-bot, Ax-bot, Whirl-bot, Thermobot, Egzo-bot
