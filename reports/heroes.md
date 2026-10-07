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
| Reaper | Beasts | 10 | 0 | 1 | 0 |
| Cardinal | Immortals | 9 | 0 | 2 | +12 |
| Guardian of hell | Immortals | 8 | 1 | 2 | 0 |
| Egzo-bot | Robots | 8 | 0 | 3 | -1 |
| Ivy | Plants | 7 | 0 | 4 | +22 |
| Holo-bot | Robots | 6 | 1 | 4 | +11 |
| Trunk | Plants | 6 | 0 | 5 | +10 |
| Batfang | Beasts | 5 | 0 | 6 | +15 |
| Zbrojny | Miecznicy | 3 | 0 | 8 | 0 |
| Tarczownik | Miecznicy | 2 | 0 | 9 | -7 |
| Strzelec | Łucznicy | 1 | 0 | 10 | +19 |
| Akolita | Łucznicy | 0 | 0 | 11 | -12 |

Średni bilans (wygrane minus przegrane): Beasts 4.0, Immortals 6.5, Robots 3.5, Plants 2.0, Miecznicy -6.0, Łucznicy -10.0.

### Druga ewolucja

| Forma | Szczep | Wygrane | Remisy | Przegrane | W drużynie |
|---|---|---|---|---|---|
| Ignitix | Beasts | 21 | 0 | 2 | +65 |
| Mother-tree | Plants | 19 | 4 | 0 | +35 |
| Ultimus | Immortals | 21 | 0 | 2 | +34 |
| Enigmatix | Immortals | 21 | 0 | 2 | +19 |
| Thermobot | Robots | 18 | 1 | 4 | +26 |
| Oak warrior | Plants | 18 | 0 | 5 | +33 |
| Whirl-bot | Robots | 18 | 0 | 5 | +12 |
| Xartix | Immortals | 16 | 0 | 7 | +20 |
| Titan-bot | Robots | 15 | 0 | 8 | -1 |
| Ironbeak | Beasts | 14 | 0 | 9 | +22 |
| Polaris | Immortals | 12 | 1 | 10 | +18 |
| Ax-bot | Robots | 12 | 0 | 11 | -10 |
| Tuskovator | Beasts | 11 | 0 | 12 | +18 |
| Berserker | Miecznicy | 10 | 0 | 13 | -15 |
| Spiker | Beasts | 9 | 1 | 13 | +12 |
| Rycerz | Miecznicy | 8 | 0 | 15 | 0 |
| Strażnik | Miecznicy | 6 | 1 | 16 | -27 |
| Ice Ivy | Plants | 4 | 3 | 16 | +43 |
| Pawężnik | Miecznicy | 5 | 1 | 17 | +12 |
| Inkwizytor | Łucznicy | 4 | 1 | 18 | -19 |
| Strzelec wyborowy | Łucznicy | 3 | 1 | 19 | +22 |
| Łowca | Łucznicy | 2 | 0 | 21 | +2 |
| Toxic Ivy | Plants | 0 | 2 | 21 | +16 |
| Kapłan | Łucznicy | 1 | 0 | 22 | -19 |

Średni bilans (wygrane minus przegrane): Beasts 4.8, Plants -0.3, Immortals 12.3, Robots 8.8, Miecznicy -8.0, Łucznicy -17.5.

## Drużyny szczepów 5 na 5, ulepszenia: 0

Wiersz gra po stronie gracza; „limit” to koniec czasu, czyli przegrana gracza.

| Gracz \ Przeciwnik | Miecznicy | Łucznicy | Ludzie (mieszana) | Beasts | Immortals | Plants | Robots |
|---|---|---|---|---|---|---|---|
| Miecznicy | · | wygrana 13 s | przegrana 28 s | przegrana 18 s | przegrana 16 s | przegrana 43 s | przegrana 20 s |
| Łucznicy | przegrana 13 s | · | przegrana 9 s | przegrana 13 s | przegrana 13 s | przegrana 44 s | przegrana 11 s |
| Ludzie (mieszana) | wygrana 28 s | wygrana 9 s | · | przegrana 19 s | przegrana 15 s | przegrana 47 s | przegrana 17 s |
| Beasts | wygrana 18 s | wygrana 13 s | wygrana 19 s | · | przegrana 24 s | przegrana 54 s | wygrana 30 s |
| Immortals | wygrana 16 s | wygrana 13 s | wygrana 15 s | wygrana 24 s | · | limit 90 s | przegrana 30 s |
| Plants | wygrana 43 s | wygrana 44 s | wygrana 47 s | wygrana 54 s | limit 90 s | · | przegrana 74 s |
| Robots | wygrana 20 s | wygrana 11 s | wygrana 17 s | przegrana 30 s | wygrana 30 s | wygrana 74 s | · |

## Drużyny szczepów 5 na 5, ulepszenia: 4

Wiersz gra po stronie gracza; „limit” to koniec czasu, czyli przegrana gracza.

| Gracz \ Przeciwnik | Miecznicy | Łucznicy | Ludzie (mieszana) | Beasts | Immortals | Plants | Robots |
|---|---|---|---|---|---|---|---|
| Miecznicy | · | wygrana 13 s | przegrana 25 s | przegrana 18 s | przegrana 16 s | przegrana 41 s | przegrana 20 s |
| Łucznicy | przegrana 13 s | · | przegrana 9 s | przegrana 13 s | przegrana 13 s | przegrana 42 s | przegrana 11 s |
| Ludzie (mieszana) | wygrana 25 s | wygrana 9 s | · | przegrana 19 s | przegrana 15 s | przegrana 41 s | przegrana 17 s |
| Beasts | wygrana 18 s | wygrana 13 s | wygrana 19 s | · | przegrana 24 s | przegrana 54 s | wygrana 30 s |
| Immortals | wygrana 16 s | wygrana 13 s | wygrana 15 s | wygrana 24 s | · | limit 90 s | przegrana 30 s |
| Plants | wygrana 41 s | wygrana 42 s | wygrana 41 s | wygrana 54 s | limit 90 s | · | przegrana 67 s |
| Robots | wygrana 20 s | wygrana 11 s | wygrana 17 s | przegrana 30 s | wygrana 30 s | wygrana 67 s | · |

## Drużyny pokazowe

- Miecznicy: Strażnik, Pawężnik, Rycerz, Berserker, Zbrojny
- Łucznicy: Inkwizytor, Strzelec wyborowy, Strzelec, Łowca, Kapłan
- Ludzie (mieszana): Strażnik, Rycerz, Berserker, Strzelec wyborowy, Kapłan
- Beasts: Tuskovator, Ironbeak, Reaper, Spiker, Ignitix
- Immortals: Enigmatix, Xartix, Guardian of hell, Ultimus, Polaris
- Plants: Oak warrior, Trunk, Toxic Ivy, Ice Ivy, Mother-tree
- Robots: Titan-bot, Ax-bot, Whirl-bot, Thermobot, Egzo-bot
