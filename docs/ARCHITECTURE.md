# Architektura – Five Fangs

Opisuje, jak zbudowany jest kod. Zasady gry są w [GAME_DESIGN.md](GAME_DESIGN.md), decyzje i ich uzasadnienia w [adr/](adr/), twarde reguły pracy w [CLAUDE.md](../CLAUDE.md). Interfejsy poniżej to projekt wyjściowy; doprecyzowują się w milestone'ach, a zmiany trafiają z powrotem do tego pliku.

## 1. Warstwy

```
src/
  core/      czyste narzędzia: matematyka całkowita, hash, pętla stałego kroku, pule, RNG (tylko kosmetyka), i18n
  sim/       symulacja walki; działa w Node bez DOM
  content/   dane JSON, schematy Zod, kompilacja do struktur runtime, słowniki i18n
  render/    Canvas 2D: rig, klipy, atlas, efekty, debug
  game/      sceny, progresja, zapis, wykrywanie wersji
  ui/        Preact: menu, mapa, skład, HUD, wynik
  tools/     narzędzia dev: piaskownica walki, edytor animacji
  main.ts    wejście gry (index.html)
  tools.ts   wejście narzędzi (tools.html, tylko serwer dev)
scripts/     Node: balans, walidacja treści, atlas, rozmiar builda, wersja
assets/src/  źródłowe grafiki części; nie trafiają do builda
src/assets/generated/  atlasy z `pnpm atlas`, importowane przez Vite
public/      tylko pliki o stałych nazwach: favicon, _headers, robots.txt
tests/       golden, fixtures zapisów, testy wielomodułowe
```

| Moduł | Może importować |
|---|---|
| `core` | nic |
| `sim` | `core` |
| `content` | `core`, typy z `sim` |
| `render` | `core`, `sim` (odczyt stanu i zdarzeń), `content` |
| `game` | wszystko poza `ui` i `tools` |
| `ui` | `game`, `core`, `content` |
| `tools` | wszystko |

Granice wymusza własny skrypt `scripts/check-deps.ts` (`pnpm deps:check`) w CI. Sprawdza też dozwolone pakiety zewnętrzne per warstwa i zakazane API w `sim` (ADR 0012).

## 2. Przepływ danych

```
JSON (sekundy, jednostki świata, stringowe id)
   │  schematy Zod + walidacja odwołań
   ▼
content: kompilacja ──► UnitSpec, ArenaSpec, klipy i rigi w tablicach typowanych
   │
   │  game: skład gracza + poziom + ulepszenia + runy ──► BattleSetup
   ▼
sim: createBattle(setup) ──► step() ──► BattleState (odczyt) + bufor zdarzeń
                                            │                    │
                                            ▼                    ▼
                                   render: draw(state, alpha)   render/ui: efekty, HUD
```

Symulacja nie zna treści gry, ulepszeń ani run. Dostaje gotowe, całkowitoliczbowe specyfikacje jednostek.

## 3. Symulacja (`src/sim`)

### 3.1 Jednostki miary

| Wielkość | Reprezentacja |
|---|---|
| Czas | całkowite ticki, 30 na sekundę |
| Pozycja, zasięg, krok ruchu | podjednostki: 1 jednostka świata = 256 |
| HP, obrażenia, leczenie | liczby całkowite |

Cały stan mieści się w tablicach całkowitoliczbowych. Sim nie używa liczb zmiennoprzecinkowych, losowości ani zegara (ADR 0002).

### 3.2 Wejście

```ts
interface UnitSpec {
  maxHp: number;
  attack: number;
  moveStep: number;        // podjednostki / tick
  range: number;           // podjednostki
  knockback: number;       // podjednostki; siła odrzutu i opór zarazem
  attackInterval: number;  // ticki między początkami ataków
  swingTicks: number;      // długość zamachu
  hitTick: number;         // 1..swingTicks-1, tick trafienia lub wystrzału
  projectileStep: number;  // podjednostki / tick; 0 = melee
  pierce: boolean;
  healAmount: number;      // 0 = brak cechy
  healInterval: number;    // ticki
  healTeam: boolean;       // false = tylko siebie
}

interface ArenaSpec {
  width: number;                // podjednostki
  playerSlots: readonly number[];   // pozycje startowe, indeks = slot
  enemySlots: readonly number[];
  timeLimitTicks: number;
}

interface BattleSetup {
  arena: ArenaSpec;
  player: readonly (UnitSpec | null)[];  // 5 slotów
  enemy: readonly (UnitSpec | null)[];
}
```

Nowa cecha pasywna dodaje pola do `UnitSpec` (ADR 0009).

`createBattle` sprawdza niezmienniki setupu (`validateSetup`) i rzuca błąd, gdy są złamane: wartości całkowite, zależności pól ataku, sloty gracza na lewo od slotów przeciwnika, największy `moveStep` nie większy niż najmniejszy `range`, pula pocisków wystarczająca dla składu.

### 3.3 Stan

`unitId` jest stałe: slot gracza `s` → `s`, slot przeciwnika `s` → `5 + s`. Pusty slot ma stan `Empty`. Definicja: `src/sim/state.ts`. Wszystkie tablice to `Int32Array`; jeden typ tablic daje jednolity, szybki dostęp i prosty hash.

| Grupa | Pola | Uwagi |
|---|---|---|
| Walka | `tick`, `outcome`, `reason` | `tick` to liczba wykonanych ticków |
| Jednostki (10) | `status`, `x`, `prevX`, `hp`, `target`, `swingTick`, `sinceAttack`, `traitTimer` | `status`: Empty, Idle, Moving, Attacking, Dead; `target` i `swingTick` mają -1 dla „brak” |
| Pociski (pula 64) | `projCount`, `nextProjId`, `projId`, `projX`, `projPrevX`, `projStep`, `projOwner`, `projDamage`, `projKnockback`, `projPierce`, `projHitMask` | Aktywne zajmują indeksy `0..projCount-1` w kolejności wystrzelenia; `projId` rośnie przez całą walkę |
| Statystyki | `damageDealt`, `damageTaken`, `healingDone` | Per `unitId` |

Specyfikacje jednostek są rozłożone na takie same tablice (`UnitSpecs`) i nie zmieniają się w trakcie walki.

`prevX` służy dwóm celom: testowi trafienia pocisku i interpolacji w rendererze.

Konwencja odczytu w `sim`: `tablica[i] ?? 0`. Przy `noUncheckedIndexedAccess` każdy odczyt ma typ `number | undefined`; `?? 0` odpowiada temu, co tablica typowana i tak zapisałaby dla `undefined`. Pola czytamy do zmiennych lokalnych, liczymy i zapisujemy z powrotem.

### 3.4 Tick

Fazy w stałej kolejności; każda iteruje po `unitId` rosnąco, chyba że zaznaczono inaczej. Reguły gry dla każdej fazy: [GAME_DESIGN.md §4](GAME_DESIGN.md).

| # | Faza | Uwagi implementacyjne |
|---|---|---|
| 0 | Początek | `prevX ← x`, `projPrevX ← projX`, wyczyszczenie kolejki zmian |
| 1 | Decyzje | Tylko jednostki poza zamachem. Odczyt stanu z początku ticka. |
| 2 | Ruch | Każda jednostka niezależnie; sojusznicy się nie blokują. |
| 3 | Ataki | W `hitTick`: melee dopisuje obrażenia i odrzut do kolejki, ranged tworzy pocisk. |
| 4 | Pociski | Trafienie = wróg był przed pociskiem na początku ticka i nie jest przed nim po ruchu obu. Dopisuje obrażenia i odrzut do kolejki. |
| 5 | Cechy okresowe | Leczenie dopisywane do kolejki. |
| 6 | Rozstrzygnięcie | Dla wszystkich naraz: `hp = min(maxHp, hp − obrażenia + leczenie)`, potem przesunięcie o zsumowany odrzut w stronę własnej krawędzi, z przycięciem do pola. |
| 7 | Śmierci i koniec | Zdarzenia `Died`, warunek końca, limit czasu. |

Test trafienia pocisku porównuje położenie względne przed i po ticku, a nie przedział przebyty przez sam pocisk. Dzięki temu wróg idący naprzeciw nie może „przeskoczyć” pocisku w fazie ruchu.

Kolejka zmian to trzy tablice indeksowane `unitId`: `pendingDamage`, `pendingHeal`, `pendingKnockback`. Wszystkie źródła piszą do niej, a HP zmienia tylko faza 6. Każde trafienie dopisuje do `pendingKnockback` wartość `max(0, knockback źródła − knockback trafionego)`.

Pozycję zmieniają dwie fazy: ruch (2) i odrzut (6). Odrzut przesuwa jednostkę od przeciwnika, więc nie narusza gwarancji, że wrogie jednostki się nie mijają.

Oś czasu ataku rozpoczętego w ticku `T` (ADR 0008): w `T` decyzja i `swingTick = 0`; w `T + hitTick` trafienie albo wystrzał; w `T + swingTicks` faza decyzji zwalnia jednostkę; w `T + attackInterval` może zacząć się następny atak. Trafienie musi wypaść przed końcem zamachu, stąd `hitTick ≤ swingTicks − 1`.

### 3.5 Zdarzenia

Bufor o stałej pojemności (1024, co mieści najgorszy możliwy tick) w układzie struktury tablic: `type`, `a`, `b`, `c` jako `Int32Array`. Czyszczony na początku każdego ticka. Bez alokacji; przepełnienie rzuca błąd.

| Zdarzenie | `a` | `b` | `c` |
|---|---|---|---|
| `AttackStarted` | jednostka | cel | |
| `AttackHit` | jednostka | cel | |
| `ProjectileSpawned` | id pocisku | właściciel | pozycja |
| `ProjectileHit` | id pocisku | trafiony | pozycja trafionego |
| `ProjectileExpired` | id pocisku | | pozycja |
| `Damaged` | jednostka | wartość | źródło |
| `Healed` | jednostka | faktycznie przywrócone HP | |
| `KnockedBack` | jednostka | faktyczne przesunięcie | |
| `Died` | jednostka | | |
| `BattleEnded` | wynik | powód | |

`Healed` powstaje w rozstrzygnięciu, po przycięciu do `maxHp`, więc zgłasza sumę leczenia jednostki w ticku, bez źródła. Przy prędkości x4 w jednej klatce wykonuje się kilka ticków, więc konsument wywołuje `drainEvents(battle, out)` po każdym `stepBattle` i sam zbiera zdarzenia do swojej klatki.

### 3.6 API

Dane i czyste funkcje, bez klas. Publiczne API eksportuje `src/sim/index.ts`.

```ts
function createBattle(setup: BattleSetup): Battle;
function stepBattle(battle: Battle): void;                    // jeden tick; nic nie robi po zakończeniu walki
function drainEvents(battle: Battle, out: EventBuffer): void; // dopisuje zdarzenia ostatniego ticka
function battleResult(battle: Battle): BattleResult;          // rzuca błąd, gdy walka trwa
function runBattleToEnd(battle: Battle): BattleResult;

interface Battle {
  readonly width: number;
  readonly timeLimitTicks: number;
  readonly specs: UnitSpecs;
  readonly state: BattleState;    // tylko do odczytu dla renderera i UI
  readonly events: EventBuffer;   // zdarzenia ostatniego ticka
  eventHash: number;
}

interface BattleResult {
  outcome: 'win' | 'loss';
  reason: 'eliminated' | 'mutual' | 'timeout';
  ticks: number;
  damageDealt: readonly number[];   // per unitId
  damageTaken: readonly number[];
  healingDone: readonly number[];
  finalHp: readonly number[];
  stateHash: number;
  eventHash: number;
}
```

`createBattle` nie przyjmuje ziarna, bo sim nie losuje.

### 3.7 Hash

FNV-1a 32-bit (`Math.imul`) po wszystkich tablicach stanu i liczniku ticków. `eventHash` narasta w każdym ticku, w którym zaszły zdarzenia: obejmuje numer ticka i zawartość bufora, więc te same zdarzenia w innym momencie dają inny hash. Testy golden w `tests/golden/` przechowują parę hashy dla każdego ustalonego `BattleSetup`.

### 3.8 Wydajność

Pomiar `pnpm bench` z 2026-10-02 (Node 24, kontener deweloperski, walka golden `full-5v5`, średnio 888 ticków):

| Miara | Wynik | Budżet |
|---|---|---|
| Pełne walki na sekundę | 2270–2380 | > 2000 |
| Czas ticka | ok. 480 ns | < 0,2 ms |
| Przyrost sterty na 500 000 ticków | 8,5 KB (szum pomiaru) | 0 alokacji na tick |

Zapas wobec budżetu walk na sekundę to ok. 15%, więc każda nowa faza ticka wymaga ponownego pomiaru. Co dało wynik:

- Decyzja, ruch i postęp ataku jednostki wykonują się w jednej pętli, a rozstrzygnięcie i śmierć w drugiej (`step.ts`). Wszystkie czytają tylko pozycje z początku ticka i własną kolejkę, więc wynik jest taki sam jak przy osobnych przejściach.
- Najbliższy wróg jest wyznaczany raz na tick dla całej drużyny: wrogie jednostki się nie mijają, więc jest nim zawsze najbardziej wysunięta jednostka przeciwnika.
- Kolejka zmian jest zerowana przy odczycie, bez osobnych `fill()`.

Dalsze przyspieszenie wymagałoby jednej wspólnej tablicy na wszystkie pola jednostek kosztem czytelności. Przy zerowej losowości skrypt balansu rozgrywa setki, a nie setki tysięcy walk, więc na razie nie jest to potrzebne.

## 4. Treść (`src/content`)

### 4.1 Pliki

```
src/content/data/
  arena.json            szerokość pola, sloty, limit czasu
  attacks.json          typy ataków
  units/heroes.json     formy bohaterów (12)
  units/enemies.json    wrogowie i bossowie
  progression.json      stałe progresji: liczba ulepszeń, procent na ulepszenie, sloty run, złoto za powtórkę
  lines.json            linie bohaterów: formy, koszty, warunek odblokowania
  runes.json
  worlds.json
  levels/world_N.json   poziomy świata w kolejności odblokowywania
  rigs/*.json           (od M2)
  clips/*.json          (od M2)
  balance/reference-squads.json   składy referencyjne dla skryptu balansu
src/content/i18n/pl.json, en.json
```

Nazwy jednostek, światów i poziomów nie leżą w danych, tylko w słownikach pod kluczami `unit.<id>.name`, `world.<id>.name`, `level.<id>.name`; walidator sprawdza ich komplet.

Kod wczytujący: `schema.ts` i `schema-progression.ts` (schematy), `compile.ts` (jednostki i arena), `load.ts` i `load-progression.ts` (walidacja odwołań i złożenie `GameContent`), `resolve-spec.ts` (statystyki efektywne i setup poziomu), `validate.ts` (walidacja całości).

### 4.2 Formaty surowe

```jsonc
// attacks.json
{ "id": "slash", "swingDuration": 0.4, "hitFraction": 0.5, "clip": "slash" }
{ "id": "shoot", "swingDuration": 0.6, "hitFraction": 0.5, "clip": "shoot",
  "projectile": { "speed": 400, "sprite": "arrow" } }

// units/heroes.json
{ "id": "archer_a", "kind": "ranged", "maxHp": 350, "attack": 30, "moveSpeed": 50,
  "attackSpeed": 0.8, "range": 220, "knockback": 0, "attackType": "shoot",
  "traits": [{ "type": "pierce" }] }
// pola "rig" i "skin" dojdą razem z rendererem w M2

// cecha okresowa
{ "type": "periodicHeal", "target": "team", "amount": 20, "interval": 2.0 }

// lines.json
{ "id": "archer", "forms": ["archer_a", "archer_b"],
  "upgradeCosts": [[50, 80, 120, 180], [300, 400, 550, 750]], "evolveCost": 250,
  "unlock": { "type": "start" } }

// runes.json
{ "id": "rune_attack_25", "stat": "attack", "value": 25 }
```

Format poziomu: [GAME_DESIGN.md §7](GAME_DESIGN.md).

### 4.3 Kompilacja

Jedyne miejsce konwersji jednostek czytelnych dla człowieka na runtime:

| Pole runtime | Wzór |
|---|---|
| `moveStep` | `round(moveSpeed × 256 / 30)` |
| `range` | `range × 256` |
| `knockback` | `knockback × 256` |
| `attackInterval` | `round(30 / attackSpeed)` |
| `swingTicks` | `max(2, round(swingDuration × 30))` |
| `hitTick` | `clamp(round(hitFraction × swingTicks), 1, swingTicks − 1)` |
| `projectileStep` | `round(projectile.speed × 256 / 30)` |
| `healInterval` | `round(interval × 30)` |

Statystyki efektywne liczy czysta funkcja w `content`, używana przez `game`, UI (podgląd) i skrypt balansu:

```ts
function resolveUnitSpec(
  unit: CompiledUnit, rank: number, runes: readonly Rune[], progression: Progression,
): UnitSpec;
// maxHp i attack: floor(base × (100 + rank × upgradePercent) / 100), potem płaskie premie z run

function levelSetup(
  content: GameContent, level: CompiledLevel, squad: readonly (SquadMember | null)[],
): BattleSetup;
```

`rank` to liczba ulepszeń formy (0–4) dla bohatera albo `level` dla wroga. `levelSetup` składa skład gracza i wrogów poziomu w wejście symulacji.

### 4.4 Walidator (`pnpm validate-content`)

- zgodność każdego pliku ze schematem, unikalność id, istnienie wszystkich odwołań (jednostki, ataki, klipy, rigi, skórki, runy, poziomy, klucze i18n w obu językach);
- znacznik `hit` w klipie równy `hitFraction` typu ataku;
- `attackInterval ≥ swingTicks` dla każdej jednostki;
- największy `moveStep` ≤ najmniejszy `range` (gwarancja, że wrogie jednostki się nie miną);
- `pierce` tylko przy ataku z pociskiem;
- górne ograniczenie liczby żywych pocisków mieści się w puli;
- każda linia ma dokładnie 2 formy i komplet kosztów, forma należy do jednej linii, a każdy bohater do jakiejś linii;
- każdy świat ma plik poziomów z wymaganą liczbą poziomów (`levelsPerWorld`); w poziomie sloty wrogów się nie powtarzają;
- najwyżej jedna cecha danego typu na jednostkę.

Reguły zależne od kodu symulacji (niezmienniki `UnitSpec`, mijanie się, pula pocisków) sprawdza `scripts/lib/content-sim-checks.ts`, bo `content` może importować z `sim` tylko typy.

## 5. Renderer (`src/render`)

### 5.1 Interfejs

```ts
interface Renderer {
  resize(cssWidth: number, cssHeight: number, dpr: number): void;
  beginBattle(setup: BattleSetup, view: BattleView): void;  // skórki jednostek, tło
  consume(events: EventBuffer): void;                        // po każdym ticku
  draw(state: BattleState, alpha: number, frameMs: number): void;
  endBattle(): void;
  dispose(): void;
}
```

Reszta gry zna tylko ten interfejs; implementacja to Canvas 2D (ADR 0001).

### 5.2 Pętla

`requestAnimationFrame` z akumulatorem stałego kroku z `core`: mnożnik prędkości 1/2/4, limit skoku czasu 0,25 s, pauza przy ukrytej karcie. Po każdym `step()` zdarzenia trafiają do renderera i HUD-u. Rysowanie co klatkę z `alpha = akumulator / krok`; pozycja jednostki to interpolacja między `prevX` a `x`.

Renderer może używać `Math.sin/cos` i floatów. Zakaz dotyczy tylko `sim`.

### 5.3 Rig i klipy

- **Część**: prostokąt w atlasie, rozmiar, pivot. **Kość**: rodzic, punkt zaczepienia, część lub slot, kolejność rysowania, flaga „tylna”.
- **Skórka** (`skin`) przypisuje części do kości. Formy bohaterów dzielą rig i klipy, a różnią się skórką. Głowa i broń są slotami.
- Kolejność obliczeń kości jest niezależna od kolejności rysowania.
- Klipy kompilowane przy ładowaniu do `Float32Array`: kanały kątów per kość oraz `bob` i `dx` korzenia; interpolacja smoothstep; znaczniki (`hit`).
- Macierze: jedna `Float32Array`, 6 wartości na kość na jednostkę, liczone ręcznie, `ctx.setTransform`.
- Elementy dynamiczne (cięciwa) rysowane wektorowo między punktami kości.

Dane referencyjne rigu i klipów z prototypu: załącznik A briefu startowego; trafiają do `rigs/humanoid.json` i `clips/*.json` w M2.

### 5.4 Sterowanie animacją

| Stan w sim | Klip | Faza |
|---|---|---|
| `Idle` | idle (pętla) | czas renderera |
| `Moving` | walk (pętla) | przebyty dystans / długość kroku |
| `Attacking` | klip typu ataku | `(swingTick + alpha) / swingTicks` z sim |
| `Dead` | obrót wokół stóp + zanikanie | czas od zdarzenia `Died` |

Zmiana klipu przechodzi przez wykładniczy blend pozy (szybszy dla ataku). Błysk trafienia to biała sylwetka części przez krótki czas po `Damaged`.

### 5.5 Atlasy

- Części rysowane w 2× rozdzielczości logicznej (1280×720), wygładzanie włączone, format WebP.
- `pnpm atlas` pakuje `assets/src/` do `src/assets/generated/` (obraz + JSON z prostokątami i pivotami). Vite nadaje nazwom hash treści.
- Podział: atlas bohaterów, atlas wrogów i tło per świat (ładowane leniwie przy wejściu do świata).
- Warianty części (ciemny dla tylnych kończyn, biała sylwetka) generowane raz przy ładowaniu na offscreen canvas. Bez `ctx.filter`.

### 5.6 Wydajność

Zero alokacji w `step()` i `draw()` w stanie ustalonym. Pule: pociski, liczby obrażeń (prerenderowane cyfry z atlasu), cząsteczki, zdarzenia. DPR ograniczony do 2, letterbox. Kod debug (pivoty, zasięgi, overlay wydajności, krokowanie) tylko pod `import.meta.env.DEV`.

## 6. Gra (`src/game`)

### 6.1 Sceny

Stan aplikacji w sygnałach Preact. Scena to wartość sygnału, nie ścieżka URL:

```
menu → mapa → skład → walka → wynik → mapa
```

Scena walki tworzy `Battle` i `Renderer`, a przy wyjściu zwalnia oba. Przy przejściach między scenami (nie w walce) gra sprawdza `version.json`.

### 6.2 Zapis

Jeden obiekt w `localStorage`, dostęp wyłącznie przez moduł zapisu:

```ts
interface SaveV1 {
  saveVersion: 1;
  gameVersion: string;
  gold: number;
  lines: Record<string, {             // tylko odblokowane linie
    form: 0 | 1;
    upgrades: number;                 // 0..4 w bieżącej formie
    runes: [string | null, string | null];
  }>;
  runes: string[];                    // id posiadanych run (także włożonych)
  levels: Record<string, { cleared: boolean; bestTicks: number | null }>;
  squad: (string | null)[];           // id linii per slot, długość 5
  settings: { lang: 'pl' | 'en'; battleSpeed: 1 | 2 | 4 };
}
```

- Wczytanie: parsowanie → łańcuch migracji `vN → vN+1` → walidacja Zod. Błąd na dowolnym etapie: uszkodzony zapis trafia pod klucz kopii zapasowej, gra startuje z nowym zapisem i informuje gracza.
- Zapis nowszy niż obsługiwany przez grę nie jest nadpisywany; gra prosi o odświeżenie.
- Autozapis po każdej walce i każdej zmianie składu, ulepszeniu, ewolucji lub przełożeniu runy. Eksport i import do pliku.
- Każda zmiana kształtu: nowa wersja, migracja, fixture w `tests/fixtures/saves/`.

### 6.3 Aktualizacje i błędy

- Każdy dynamiczny import i ładowanie atlasu przechodzi przez wspólną funkcję, która przy błędzie zapisuje stan i pokazuje komunikat o nowej wersji z przeładowaniem.
- Globalne `error` i `unhandledrejection` trafiają do bufora w pamięci. „Zgłoś problem” kopiuje raport: wersja gry, przeglądarka, ostatnie błędy, `BattleSetup` ostatniej walki. Walka jest deterministyczna, więc sam setup wystarcza do odtworzenia jej w piaskownicy.

## 7. UI (`src/ui`)

Preact jako nakładka DOM nad canvasem. W walce tylko HUD (pauza, prędkość, wyjście), aktualizowany przy zdarzeniach, nie co klatkę. Przeciąganie w ekranie składu na Pointer Events (mysz i dotyk tym samym kodem). Wszystkie teksty przez `t(key)` z `core`, słowniki w `content/i18n`.

## 8. Narzędzia (`src/tools`, `scripts/`)

- `tools.html` + `src/tools.ts`: osobne wejście, serwowane tylko przez `pnpm dev`. Build produkcyjny ma jedno wejście (`index.html`), więc kod narzędzi nie trafia do `dist/`; CI dodatkowo sprawdza brak jego śladów (ADR 0010).
- Piaskownica walki: dowolne składy, krokowanie, prędkość, overlay debug.
- Edytor animacji: suwaki stawów, oś czasu, eksport klipu do JSON.
- `scripts/balance.ts`: dla każdego poziomu jedna walka na każdą rangę składu referencyjnego; raport w `reports/balance.md` (wynik, czas, zapas HP, najniższa wygrywająca ranga).
- `scripts/validate-content.ts`, `scripts/atlas.ts`, `scripts/check-size.ts`, `scripts/write-version.ts`.

## 9. Testy

| Rodzaj | Gdzie | Co sprawdza |
|---|---|---|
| Jednostkowe | obok kodu, `*.test.ts` | Każdy system sim z przypadkami brzegowymi; kompilacja treści; migracje zapisu |
| Golden | `tests/golden/` | Hash stanu i zdarzeń dla ustalonych `BattleSetup` |
| Treść | `pnpm validate-content` | Sekcja 4.4 |
| Granice | `pnpm deps:check` | Sekcja 1 |
| Build | `pnpm check:size`, test czystości `dist/` | Budżety rozmiaru, brak narzędzi dev |
| End-to-end | Playwright na `vite preview` (od M4) | Gra startuje, walka dochodzi do końca, konsola bez błędów |
