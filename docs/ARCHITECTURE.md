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

Nowa cecha pasywna dodaje pola do `UnitSpec` (ADR 0009). Poza polami z listingu specyfikacja ma: `enrageHpPercent` i `enrageAttackPercent` (szał), `lifestealPercent` (kradzież życia) oraz `splashRadius` w podjednostkach (cios obszarowy); zero oznacza brak cechy. Próg HP i obrażenia w szale symulacja liczy raz, przy tworzeniu walki, więc w tickach zostaje jedno porównanie. Wejście symulacji zapisane przez starszą wersję gry (bez tych pól) piaskownica wczytuje z wartościami zerowymi.

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
| Alokacje na stercie, mediana z 41 serii po 2000 ticków | 0,07 B na tick (szum pomiaru) | 0 alokacji na tick |

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
  lines.json            linie bohaterów: drzewo form, koszty ulepszeń i ewolucji, cena, linia startowa
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

// cechy: okresowa, szał, kradzież życia, cios obszarowy
{ "type": "periodicHeal", "target": "team", "amount": 20, "interval": 2.0 }
{ "type": "enrage", "hpBelow": 50, "attackBonus": 60 }   // procenty
{ "type": "lifesteal", "percent": 35 }
{ "type": "splash", "radius": 45 }                        // jednostki świata

// lines.json: drzewo form (ADR 0016); forma bez "from" jest bazowa
{ "id": "archer", "price": 200, "starter": true, "forms": [
  { "unit": "archer_a", "upgradeCosts": [50, 80, 120, 180] },
  { "unit": "archer_b", "from": "archer_a", "evolveCost": 250, "upgradeCosts": [300, 400, 550, 750] },
  { "unit": "archer_c", "from": "archer_a", "evolveCost": 250, "upgradeCosts": [300, 400, 550, 750] } ] }

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
- `pierce` tylko przy ataku z pociskiem, `splash` tylko przy ataku wręcz;
- wróg na poziomie to dowolna jednostka: forma bohatera albo jednostka specjalna z `units/enemies.json`;
- górne ograniczenie liczby żywych pocisków mieści się w puli;
- każda linia ma dokładnie 2 formy i komplet kosztów, forma należy do jednej linii, a każdy bohater do jakiejś linii;
- każdy świat ma plik poziomów z wymaganą liczbą poziomów (`levelsPerWorld`); w poziomie sloty wrogów się nie powtarzają;
- najwyżej jedna cecha danego typu na jednostkę.

Reguły zależne od kodu symulacji (niezmienniki `UnitSpec`, mijanie się, pula pocisków) sprawdza `scripts/lib/content-sim-checks.ts`, bo `content` może importować z `sim` tylko typy.

## 5. Renderer (`src/render`)

### 5.1 Interfejs

```ts
interface Renderer {
  beginBattle(battle: Battle, visuals: readonly (UnitVisual | null)[]): void;  // wygląd per unitId
  consume(events: EventBuffer): void;                                           // po każdym ticku
  draw(viewport: Viewport, alpha: number, frameMs: number): void;
  setTopUnit(unit: number): void;                                               // -1: zwykła kolejność
  endBattle(): void;
}

function createCanvasRenderer(ctx: CanvasRenderingContext2D, assets: RenderAssets): Renderer;
```

Reszta gry zna tylko ten interfejs; implementacja to Canvas 2D (ADR 0001). Jednostki rysowane są od najdalszego slotu do najbliższego; `setTopUnit` pozwala narysować jedną na wierzchu (ekran składu: bohater, którego gracz właśnie przeciąga). Symulacja nie wie nic o wyglądzie: `UnitVisual` (rig, skórka, skala, klip ataku, postawa, sprite pocisku) pochodzi z treści i trafia do renderera obok walki (`levelVisuals`).

### 5.2 Pętla

`requestAnimationFrame` (`game/frame-loop.ts`) z akumulatorem stałego kroku z `core`: mnożnik prędkości 1/2/4, limit skoku czasu 0,25 s, zerowanie czasu po powrocie do ukrytej karty. `BattleRunner` (`game/battle-runner.ts`) wykonuje należne ticki, po każdym przekazuje zdarzenia rendererowi i rysuje klatkę z `alpha = akumulator / krok`; pozycja jednostki to interpolacja między `prevX` a `x`. Po zakończeniu walki i w pauzie rysowany jest stan dokładnie z ostatniego ticka.

Renderer może używać `Math.sin/cos` i floatów. Zakaz dotyczy tylko `sim`.

### 5.3 Rig i klipy

Rig z klipami leży w jednym pliku treści (`rigs/humanoid.json`: dane z załącznika A briefu) i jest kompilowany przez renderer przy starcie (`render/rig.ts`, `render/clips.ts`).

- **Kość**: rodzic (albo `root`), punkt zaczepienia względem pivota rodzica, nazwa części, flaga `back`. Kości są zapisane w kolejności obliczeń (rodzic przed dzieckiem); kolejność rysowania to osobna lista `drawOrder`.
- **Skórka** (`skin` jednostki) wyznacza sprite'y: `<skórka>/<część>` w atlasie. Formy bohaterów dzielą rig i klipy, a różnią się skórką.
- **Poza** to `channelCount` liczb: kąt każdej kości w radianach, potem `bob` i `dx` korzenia w jednostkach rigu.
- **Klip**: klatki kluczowe `[czas 0..1, wartość]` per kanał, w `Float32Array`; interpolacja smoothstep; znaczniki (`hit`). Kanały, których klip nie animuje, biorą wartość z **postawy** typu ataku (np. kąt chwytu miecza albo łuku w idle i chodzie).
- **Macierze**: 6 wartości na kość, liczone ręcznie (`computeBoneMatrices`). `blit` składa macierz kości z przesunięciem o pivot sprite'a i przekazuje wynik do `ctx.setTransform` (powód w §5.7). Dodatni kąt to obrót zgodny z ruchem wskazówek zegara. Macierz korzenia zawiera pozycję stóp, skalę (ujemna w osi X odbija przeciwnika) i obrót całej postaci przy śmierci.
- Elementy dynamiczne (cięciwa) rysowane wektorowo między punktami kości.

Skala postaci na scenie to `scale` rigu (wyjściowo 1,4 jednostki logicznej na jednostkę rigu) razy `scale` jednostki z treści.

### 5.4 Sterowanie animacją

`render/animation.ts`, stan per jednostka w tablicach typowanych.

| Stan w sim | Klip | Faza |
|---|---|---|
| `Idle` | idle (pętla) | czas renderera; każda jednostka startuje w innej fazie |
| `Moving` | walk (pętla) | przebyty dystans / (długość kroku × skala) |
| `Attacking` | klip typu ataku | `(swingTick − 2 + alpha) / swingTicks` z sim, przycięte do 0..1 |
| `Dead` | poza zastyga; postać pada do tyłu wokół stóp i zanika | czas od zdarzenia `Died` (700 ms) |

Wzór fazy ataku wynika z osi czasu zamachu: stan po ticku trafienia ma `swingTick = hitTick + 1`, więc przy `alpha = 1` faza równa się `hitFraction` i animacja pokazuje trafienie dokładnie wtedy, gdy symulacja je rozstrzyga, przy każdej prędkości gry.

Wyświetlana poza dąży wykładniczo do pozy z klipu (szybciej dla ataku), co wygładza zmiany klipów. Błysk trafienia to biała sylwetka części przez 110 ms po `Damaged`.

### 5.5 Płaska scena

Scena nie ma perspektywy (decyzja autora gry z 2026-10-02). Symulacja jest jednowymiarowa i renderer pokazuje ją wprost: wszystkie postacie stoją stopami dokładnie na linii podłogi (`FEET_Y = GROUND_Y`), a ich pozycja X to pozycja z symulacji. Sojusznicy stojący w tym samym punkcie nakładają się na siebie; kolejność rysowania (od slotu 4 do 0) decyduje, kto jest na wierzchu. Wcześniejsze „ścieżki slotów”, które rozsuwały postacie w pionie, zostały usunięte.

**Krawędzie sceny.** Pole walki jest rysowane z marginesem `ARENA_MARGIN` (48 jednostek) po obu stronach (`render/camera.ts`), więc krawędź pola nie pokrywa się z krawędzią ekranu. Większe postacie sięgają jednak dalej: miecz w zamachu do ok. 100 jednostek za plecy, a postać padająca po śmierci obraca się do tyłu na swoją wysokość. Dlatego renderer przy `beginBattle` mierzy zasięg każdej postaci z prawdziwej geometrii rigu i atlasu we wszystkich klatkach klipów (`render/reach.ts`, `measureReach`) i co klatkę przesuwa ją tak, by mieściła się na scenie (`keepOnStage`). Przesunięcie dotyczy tylko rysowania i tylko przy samej krawędzi; symulacja o nim nie wie. Test w `render/reach.test.ts` sprawdza każdą postać z treści na obu krawędziach, w obu kierunkach i w każdej fazie padania. UI i stanowiska poza walką przeliczają pozycje tą samą drogą (`game/stage-geometry.ts`: `stageFraction`, `arenaXAt`), więc podpisy dalej trafiają pod postacie.

Nad głową każdej żywej postaci jest pasek życia, a nad nim bieżące życie jako liczba (`render/draw-units.ts`): pasek pokazuje ułamek, liczba skalę. Cyfry pochodzą z atlasu (zestaw `fx/hp_0..9`) i są wyliczane dzieleniem całkowitym, bez tworzenia napisów. Liczby obrażeń i leczenia startują nad liczbą życia.

Tło (`render/background.ts`) to płaskie kolory palety interfejsu (ADR 0015): niebo, sylwetka linii drzew, ziemia i atramentowa linia podłogi. Linia drzew to jedna ścieżka `Path2D` zbudowana przy pierwszej klatce i potem tylko wypełniana. Tła poszczególnych światów dojdą w M6.

### 5.6 Atlasy

- Części rysowane w ponad 2× rozdzielczości logicznej (3 piksele atlasu na jednostkę rigu przy skali postaci 1,4), wygładzanie włączone.
- **Źródła** leżą w `assets/src/<atlas>/`: pliki PNG (nazwa sprite'a to ścieżka względem katalogu atlasu, np. `swordsman_a/torso`) i manifest `atlas.json` z gęstością `pixelsPerUnit`, ustawieniami kodowania (`lossless`, `quality`) i pivotami w jednostkach rigu. Klucz pivota to nazwa sprite'a albo wzorzec `*/<część>` dla tej części we wszystkich skórkach; dokładna nazwa wygrywa.
- **`pnpm atlas`** (`scripts/atlas.ts`) pakuje każdy katalog metodą półek do `src/assets/generated/<atlas>.webp` i `<atlas>.json` (prostokąty w pikselach, pivoty). Szerokość atlasu to najmniejsza potęga dwójki dająca mniej więcej kwadrat. Odrzuca sprite bez pivota, pivot bez pliku, nazwy spoza `[a-z0-9_/]` i atlas powyżej 1 MB. Obrazów nie przycina, więc przezroczyste marginesy w źródle trafiają do atlasu. Kodowanie WebP robi sharp (ADR 0014); wygenerowane pliki są w repozytorium, więc build ich nie odtwarza.
- `pnpm atlas --check` i test w `scripts/lib/atlas-pipeline.test.ts` sprawdzają, że wygenerowane pliki odpowiadają źródłom (metadane bajt w bajt, obraz po zdekodowaniu).
- Do M6 źródłami atlasu `units` są grafiki placeholder z generatora `pnpm atlas:placeholder`. Generator nadpisuje tylko katalog oznaczony w manifeście jako `"generator": "placeholder"`. Vite nadaje nazwom plików hash treści.
- Docelowy podział: atlas bohaterów, atlas wrogów i tło per świat (ładowane leniwie przy wejściu do świata).
- Warianty atlasu (przyciemniony dla tylnych kończyn, biała sylwetka) powstają raz przy ładowaniu na osobnych canvasach (`render/atlas.ts`). Bez `ctx.filter`.
- `pnpm validate-content` sprawdza, że każda skórka ma komplet części swojego rigu, a każdy pocisk swój sprite.

### 5.7 Wydajność

Kod `step()` i `draw()` nie tworzy w stanie ustalonym obiektów, tablic, domknięć ani napisów. Pule: pociski, liczby obrażeń (prerenderowane cyfry z atlasu), zdarzenia. DPR ograniczony do 2, letterbox. Kod debug (pivoty, zasięgi, overlay wydajności, krokowanie) tylko pod `import.meta.env.DEV`.

**Pomiar** z 2026-10-02 narzędziem `/tools.html?view=perf` (`src/tools/perf.ts`): niekończąca się walka 5 na 5 ze wszystkimi efektami naraz (chód, zamachy, pociski zwykłe i przebijające, cięciwy, błyski, liczby obrażeń i leczenia, odrzut), 175 wywołań `drawImage` na klatkę. Edge 154 w trybie headless, Windows 11, Core i7-8700, RTX 5060 Ti; kod z serwera deweloperskiego (bez minifikacji, z licznikami debug).

| Miara | DPR 1 (canvas 1116×628) | DPR 2 (canvas 2232×1256) | Budżet |
|---|---|---|---|
| Czas JS klatki przy odtwarzaniu (rAF): średnio / p99 / max | 0,39 / 0,9 / 1,4 ms | 0,38 / 0,8 / 1,0 ms | < 4 ms |
| w tym symulacja, średnio na klatkę | ok. 0,002 ms | ok. 0,002 ms | tick < 0,2 ms |
| Odstęp klatek (ekran 120 Hz): mediana / max, zgubione klatki | 8,3 / 9,0 ms, 0 z 600 | 8,3 / 8,6 ms, 0 z 600 | — |
| Alokacje na stercie JS, mediana | 285 B na klatkę | 286 B na klatkę | 0 |

Czego ten pomiar nie obejmuje:

- Czas JS to symulacja i wywołania rysowania. Rasteryzację przeglądarka wykonuje poza wątkiem JS i nie da się jej zmierzyć z poziomu strony; pośrednim dowodem, że mieści się w czasie klatki, jest brak zgubionych klatek przy 120 Hz.
- Tryb headless na komputerze stacjonarnym. Telefon i zwykłe okno przeglądarki nie były mierzone.
- Kod deweloperski, nie paczka produkcyjna (narzędzia nie trafiają do `dist/`).

**Alokacje.** Przed poprawką renderer alokował ok. 2350 B na klatkę, choć w kodzie nie było żadnego `new` ani literału. Przyczyna (potwierdzona wyłączaniem pojedynczych wywołań): V8 pakuje każdy ułamkowy argument `drawImage` w 12-bajtowy obiekt na stercie, a ułamkowe było przesunięcie o pivot. `setTransform` przyjmuje ułamki bez alokacji. Dlatego `blit` (`render/scene.ts`) wlicza przesunięcie o pivot i skalę piksel → jednostka rigu w transformację, a `drawImage` dostaje same liczby całkowite. `Math.hypot` (36 B na wywołanie) zastąpiło `Math.sqrt`.

Pozostałe ok. 260–285 B na klatkę profiler przypisuje: `drawUnit` 124 B, pomiary czasu w `BattleRunner.frame` 50 B (tylko w dev), `updateUnitPose` 46 B, `hashInt32` 27 B, tworzenie liczb nad jednostkami 11 B. Najbardziej prawdopodobna przyczyna to pakowanie liczb zmiennoprzecinkowych (i całkowitych powyżej 2³⁰) przekazywanych między funkcjami, których silnik nie wbudował w miejscu wywołania; tego dla każdej pozycji z osobna nie sprawdzaliśmy. Przy 60 klatkach na sekundę to ok. 17 KB/s. Usunięcie reszty wymagałoby przekazywania pozycji i faz animacji przez tablice zamiast argumentów; decyzja w ADR 0013.

Pomiar powtórzony 2026-10-02 po dodaniu linii drzew do tła (DPR 1): mediana klatki w pętli 0,30 ms i 279 B na klatkę z linią drzew wobec 0,30 ms i 280 B bez niej, czyli bez mierzalnej różnicy.

Pomiar po dodaniu liczby życia nad paskiem (2026-10-03, DPR 1; w tej walce życie ma dziewięć cyfr, więc 257 zamiast 175 `drawImage` na klatkę): czas JS klatki przy odtwarzaniu 0,54 ms średnio, mediana klatki w pętli 0,40 ms, alokacje 279 B na klatkę. Pierwsza wersja przekazywała ułamkowe współrzędne liczby jako argumenty funkcji i alokowała 399 B na klatkę, czyli 12 B na jednostkę więcej; po przeniesieniu ich do `scene.local` narzut zniknął. To potwierdza przypuszczenie z poprzedniego akapitu dla tego jednego miejsca: ułamkowa liczba przekazana do funkcji, której silnik nie wbudował, trafia na stertę.

Jak mierzyć alokacje: przyrost sterty po długiej serii klatek nic nie mówi, bo silnik po drodze sam opróżnia młodą generację (tak wyszło „zero” przy 2350 B na klatkę). Narzędzie liczy więc krótkie serie zaczynane tuż po wymuszonym odśmieceniu, co wymaga Chromium z flagami `--enable-precise-memory-info --js-flags=--expose-gc`. Źródło alokacji wskazuje „Allocation sampling” w DevTools (Memory) na `ffPerfFrames(3000)` wywołanym z konsoli.

## 6. Gra (`src/game`)

### 6.1 Sceny i stan gry

Stan gry to obiekt `Game` (`game/game.ts`) z sygnałami Preact: zapis (`save`), scena (`scene`), stan pamięci przeglądarki (`storage`). Scena to wartość sygnału, nie ścieżka URL:

```
ekran startowy → mapa (ekran główny) ─┬─ walka → wynik → mapa
                                      ├─ skład (sloty, ulepszenia, ewolucja, runy)
                                      ├─ bohaterowie (formy linii, droga ulepszeń i ewolucji)
                                      └─ sklep (samo kupowanie)
```

Gra otwiera się ekranem startowym z jednym przyciskiem „Graj”. Dalej ekranem głównym jest mapa: gra na nią wraca po walce, a skład, bohaterowie i sklep mają tylko „Wróć” na mapę, bez przejść między sobą (ADR 0015). Scena bohaterów niesie wybraną linię (`{ name: 'heroes', line }`), żeby canvas wiedział, czyje formy pokazać; otwiera ją `openHeroes(linia)`. Skład zmienia się tylko na ekranie składu. Mapa pokazuje przeciwników i nagrody wybranego poziomu (`{ name: 'map', selected }`) i zaczyna walkę bieżącym składem. `openMap(poziom)` wybiera wskazany poziom, a bez argumentu albo dla poziomu zablokowanego pierwszy jeszcze nieprzeszły. Wynik walki ma jeden przycisk: po pierwszym przejściu poziomu mapa otwiera się z następnym, po porażce i powtórce z tym samym.

- **Reguły** leżą w `game/progress.ts` jako czyste funkcje `(treść, zapis) → nowy zapis | null`: odblokowywanie poziomów, nagrody, zakup bohatera, ulepszenia, ewolucja, runy, skład, statystyki efektywne (`heroView` używa `resolveUnitSpec`, więc podgląd w UI równa się temu, co dostaje symulacja).
- **Bohaterowie są egzemplarzami**: zapis trzyma listę `heroes` z id nadawanym kolejno; reguły i akcje adresują bohatera po id, a skład to id bohaterów per slot. Kilku bohaterów tej samej linii to osobne wpisy.
- **Akcje** `Game` wołają reguły i po każdej zmianie zapisują grę. UI czyta sygnały i wywołuje akcje; komponenty nie zawierają reguł.
- **Canvas** obsługuje `game/battle-stage.ts`. Linia podłogi jest wspólna dla wszystkich ekranów, zmieniają się aktorzy. Podgląd to walka w ticku 0 bez kroków symulacji: na ekranie startowym i mapie skład gracza naprzeciw przeciwników poziomu, na ekranie składu sam skład, w sklepie bohaterowie na sprzedaż, w informacjach o bohaterach obie formy wybranej linii. `StageControls.movePreviewUnit(slot, pozycja)` przesuwa postać podglądu za wskaźnikiem przy przeciąganiu na ekranie składu i każe rendererowi rysować ją na wierzchu; zapis pozycji idzie wprost do stanu podglądu, który nigdy nie jest krokowany, więc nie dotyka żadnej walki. W scenie walki działa `BattleRunner`. Atlas ładuje się przy starcie gry, przez `guardedLoad`; po błędzie ekrany działają bez postaci na scenie, a z walki gracz wraca na mapę i widzi komunikat.
- **Stanowiska na scenie** (`game/stage-stands.ts`): `shopStands` rozstawia linie bohaterów wzdłuż sceny (do pięciu w jednym rzędzie, do dziesięciu w dwóch grupach zwróconych do siebie), `formStands` stawia formy jednej drogi ewolucji (od bazowej przez wybraną do końca drogi, `displayPath`), a `standScene` buduje ze stanowisk wejście symulacji z własnymi pozycjami slotów. `squadFieldSetup` rozstawia skład na ekranie zarządzania szerzej niż w walce (`SQUAD_FIELD_AT`), żeby pod każdym bohaterem zmieściło się jego pole; sloty przeciwnika odsuwa na prawą krawędź, bo symulacja wymaga, by sloty gracza leżały na lewo od nich. Z tych samych stanowisk UI wylicza położenie metek i drogi ulepszeń.
- **Koniec walki**: po rozstrzygnięciu renderer rysuje jeszcze 1,4 s (animacje śmierci), potem `finishBattle` nalicza nagrody, zapisuje grę i przełącza na wynik. Pod arkuszem wyniku zostaje pole zakończonej walki. Wyjście ze sceny wyniku albo walki zwalnia `BattleRunner` i odpina walkę od renderera; sam renderer z atlasem żyje do końca sesji.

Pomiar z 2026-10-02 (Edge 154 headless): sterta JS po 5, 35 i 65 cyklach „wejdź do walki, wyjdź” to 9157, 9261 i 9310 KB, czyli ok. 1,6–3,5 KB na cykl przy ok. 20 KB zajmowanych przez jedną walkę. Walki nie wyciekają.

### 6.2 Zapis

Jeden obiekt w `localStorage`, dostęp wyłącznie przez moduł zapisu:

```ts
interface SaveV3 {
  saveVersion: 3;
  gameVersion: string;
  gold: number;
  heroes: {                           // posiadani bohaterowie, w kolejności zdobycia
    id: number;                       // unikalne w zapisie
    line: string;                     // id linii z lines.json
    form: string;                     // id jednostki bieżącej formy z drzewa linii
    upgrades: number;                 // 0..4 w bieżącej formie
    runes: (string | null)[];         // id runy per slot
  }[];
  nextHeroId: number;
  runes: string[];                    // id posiadanych run (także włożonych)
  levels: Record<string, { cleared: boolean; bestTicks: number | null }>;
  squad: (number | null)[];           // id bohatera per slot, długość 5
  settings: { lang: 'pl' | 'en'; battleSpeed: 1 | 2 | 4 };
}
```

Wersja 1 trzymała stan per linia (`lines`) i id linii w składzie; migracja `1 → 2` zamienia każdą linię na jednego bohatera. Wersja 2 trzymała formę jako indeks 0/1; migracja `2 → 3` zamienia go na id jednostki (`<linia>_a`, `<linia>_b`), bo formy tworzą teraz drzewo (ADR 0016).

- Wczytanie (`game/save.ts`): parsowanie → łańcuch migracji `vN → vN+1` (`save-migrations.ts`) → walidacja Zod. Błąd na dowolnym etapie: uszkodzony zapis trafia pod klucz kopii zapasowej `five-fangs.save.backup`, gra startuje z nowym zapisem i informuje gracza.
- Po wczytaniu `reconcileSave` dopasowuje zapis do treści gry: usuwa bohaterów nieistniejących linii, runy i poziomy, których już nie ma, przycina liczniki, naprawia skład; zapis bez żadnego bohatera dostaje bohaterów startowych. Zmiana treści między wersjami nie wymaga więc migracji, dopóki nie zmienia się kształt zapisu.
- Zapis nowszy niż obsługiwany przez grę nie jest nadpisywany (`storage = 'blocked'`): gra pokazuje ekran z prośbą o odświeżenie i nie wykonuje żadnego zapisu.
- Gdy przeglądarka blokuje `localStorage`, gra działa w pamięci (`storage = 'memory'`) i mówi o tym na mapie.
- Autozapis po każdej akcji gracza i po każdej wygranej walce. Eksport i import pliku w ustawieniach; import przechodzi tę samą ścieżkę co wczytanie.
- Każda zmiana kształtu: nowa wersja, migracja, plik `tests/fixtures/saves/v<N>.json`. Test `tests/saves/fixtures.test.ts` wymaga pliku dla każdej wersji i wczytuje każdy z nich bieżącą wersją gry.

### 6.3 Aktualizacje i błędy

- Każdy dynamiczny import i ładowanie atlasu przechodzi przez `guardedLoad`, które przy błędzie ustala przyczynę (nowa wersja albo brak sieci) i pokazuje komunikat z przeładowaniem.
- Nową wersję gra sprawdza też przy każdej zmianie sceny poza walką, nie częściej niż co 5 minut (`createUpdateChecker`); po wykryciu pokazuje ten sam komunikat.
- Globalne `error` i `unhandledrejection` trafiają do bufora w pamięci. „Zgłoś problem” w ustawieniach kopiuje raport (`game/report.ts`): wersja gry, przeglądarka, stan zapisu, ostatnie błędy, `BattleSetup` ostatniej walki. Walka jest deterministyczna, więc sam setup wystarcza do odtworzenia jej w piaskownicy. Gdy schowek jest niedostępny, raport pojawia się w polu tekstowym.

## 7. UI (`src/ui`)

Preact jako nakładka DOM nad canvasem. Korzeń (`App.tsx`) pokazuje ekran bieżącej sceny i komunikaty niezależne od sceny (nowa wersja, uszkodzony zapis, brak pamięci, zapis z nowszej wersji).

| Ekran | Plik | Zawartość |
|---|---|---|
| Ekran startowy | `TitleScreen.tsx` | Nazwa gry ze znakiem pięciu kłów, scena ze składem naprzeciw najbliższych przeciwników, przycisk „Graj” prowadzący na mapę, wersja gry |
| Mapa (ekran główny) | `MapScreen.tsx`, `Settings.tsx` | Nazwa gry w rogu, złoto, z boku małe przyciski Skład, Bohaterowie, Sklep, Ustawienia. Poziomy świata jako nieregularne kafle na krętym szlaku (zablokowany kafel to nieaktywny przycisk, ukończony ma odcisk kła). Tabliczka wybranego poziomu: nazwa, nagroda, najlepszy czas. Pod linią podłogi: podpis pod każdą postacią (nazwa i prostokąt z liczbą wzmocnień: zielony u bohaterów gracza, czerwony u przeciwników), przycisk walki. Bez zmiany składu. Ustawienia to okno nad mapą: język, eksport i import zapisu, reset z potwierdzeniem, raport błędu, wersja gry |
| Skład | `SquadScreen.tsx`, `HeroField.tsx`, `RunePicker.tsx`, `HeroCard.tsx` | Każdy bohater ma pole na scenie: u góry nazwa i gniazda run (okrągłe żetony: zielony życie, czerwony atak, z premią), pod kłem slotu pasek ulepszeń bieżącej formy i przycisk „Kup” z kosztem ulepszenia albo „Ewolucja” z jej kosztem. Gniazdo otwiera okienko z paletą wolnych run. Bohatera łapie się za postać, nazwę albo kieł. Arkusz bohaterów poza składem z podpowiedzią; karta wybranego bohatera tylko do czytania: statystyki z podglądem następnego zakupu |
| Bohaterowie | `HeroesScreen.tsx` | Zakładki linii; drzewo ewolucji jako siatka (kolumna to stopień, rozwidlenie zajmuje wiersze gałęzi) z kosztami ewolucji; postacie drogi przez wybraną formę na scenie, pod nimi nazwy i koszty; karta wybranej formy: stopień, skąd powstaje, w co ewoluuje, statystyki względem formy, z której powstaje, koszty ulepszeń; cena w sklepie i liczba posiadanych. Bez kupowania |
| Sklep | `ShopScreen.tsx` | Samo kupowanie: bohaterowie na sprzedaż stoją na scenie, pod każdym metka z nazwą, ceną i liczbą posiadanych |
| Walka | `BattleScreens.tsx` | Nazwa poziomu i czas w lewym rogu; pauza, prędkość x1/x2/x4 i wyjście w prawym; nic więcej, bo gracz nie wpływa na walkę |
| Wynik | `BattleScreens.tsx` | Arkusz nad polem zakończonej walki: wygrana albo powód przegranej, czas, nagrody, jeden przycisk OK wracający na mapę |

- **Szata graficzna** (ADR 0015): papierowe rekwizyty na jednej scenie. Style leżą w `ui/styles/`, po pliku na odpowiedzialność: `base.css` (czcionki, paleta, podstawy), `components.css` (wspólne klasy `btn`, `sheet`, kolory run, tabela statystyk), `map.css`, `squad.css`, `screens.css` (sklep, bohaterowie, ekran startowy, walka, wynik), `dialogs.css` (ustawienia, komunikaty); znaki SVG, w tym kształt kła, w `ui/icons.tsx`. Czcionki leżą w `src/assets/fonts/` i przechodzą przez Vite; licencje w `public/licenses/`.
- Przeciąganie (`drag.ts`) działa na Pointer Events, więc mysz i dotyk idą tym samym kodem. Cel upuszczenia to element z atrybutem `data-drop`; stan przeciągania niesie cel pod wskaźnikiem, więc slot docelowy się podświetla. Bohater ze składu jedzie po scenie za wskaźnikiem (`movePreviewUnit`), bohater spoza składu ma tylko etykietę przy wskaźniku. Upuszczenie na zajęty slot zamienia bohaterów miejscami, na arkusz „Poza składem” zdejmuje bohatera ze składu.
- Bez przeciągania: kliknięcie postaci wybiera bohatera, kliknięcie pustego slotu stawia na nim wybranego, strzałki w lewo i w prawo przestawiają bohatera z fokusem o jeden slot, a Delete zdejmuje go ze składu.
- Gdy z formy wychodzi kilka dróg ewolucji, przycisk zakupu otwiera `EvolvePicker.tsx`: drogi obok siebie z najważniejszymi statystykami po ewolucji i cechami. Okienka run i ewolucji dzielą zachowanie (`FieldPopup.tsx`).
- Okienka nigdy nie wychodzą poza scenę: po wyświetleniu `useKeepInside` (`ui/keep-inside.ts`) mierzy okienko i jego ekran, wsuwa je do środka z marginesem, a gdy jest wyższe niż scena, ogranicza wysokość i przewija treść. Położenie zapisuje w procentach, więc zostaje poprawne przy skalowaniu sceny z oknem, i przelicza je przy każdej zmianie rozmiaru okienka (treść, język, czcionka). Okno ustawień (`<dialog>` w górnej warstwie przeglądarki) ma wysokość ograniczoną wysokością sceny.
- Pola bohaterów, gniazda run i przyciski zakupu istnieją tylko na ekranie składu; mapa i walka pokazują samą postać. Co da się kupić i jakie runy są wolne, liczy `game/hero-options.ts` (`nextPurchase`, `runeStock`). Okienko run zamyka się po wyborze, Escape albo kliknięciem obok; fokus wraca do gniazda.
- Ekrany otwierane z mapy mają wspólny nagłówek (`ScreenHead`) z przyciskiem „Wróć”, tytułem i złotem. Nie ma przejść między nimi na skróty.
- Wszystkie teksty przez `t(key)`; nazwy jednostek, poziomów i światów przez `tName` z kluczem z `content/i18n/keys.ts`. Słowniki w `content/i18n`.
- Rozmiary są w `em` względem czcionki sceny, a położenie elementów stojących na scenie w procentach jej szerokości i wysokości (linia podłogi to zmienna `--floor`), więc UI skaluje się razem z canvasem i trafia pod postacie.
- Style w wierszu ustawia tylko Preact przez CSSOM, co dopuszcza CSP `style-src 'self'`.
- Ustawienia to natywne okno modalne `<dialog>`: przeglądarka trzyma w nim fokus, zamyka je na Escape i wyłącza resztę strony. Arkusz wyniku ustawia fokus na przycisku OK. Fokus z klawiatury ma widoczną obwódkę, a animacje wyłącza `prefers-reduced-motion`.
- HUD odświeża się, gdy zmienia się sekunda walki, pauza albo prędkość, nie co klatkę.
- UI nie importuje z `sim`; typ specyfikacji jednostki i wynik walki dostaje z `game`.

## 8. Narzędzia (`src/tools`, `scripts/`)

- `tools.html` + `src/tools.ts`: osobne wejście, serwowane tylko przez `pnpm dev`. Build produkcyjny ma jedno wejście (`index.html`), więc kod narzędzi nie trafia do `dist/`; CI dodatkowo sprawdza brak jego śladów (ADR 0010).
- Piaskownica walki (`/tools.html`): dowolne jednostki z treści na dowolnych slotach obu stron, ranga per jednostka, pauza, prędkość, krokowanie tick po ticku. Stan jest w adresie strony: `player`, `enemy` (składy), `tick=N` (przewinięcie i zatrzymanie), `debug=pgo` (nakładki), `setup=<JSON>` (gotowe wejście symulacji, np. z raportu błędu albo z `pnpm battle golden:<nazwa> --link`).
- Nakładki debug (`render/debug.ts`, klawisze P, G, O w piaskownicy): punkty obrotu i ramki części, zasięgi i cele, pomiary (FPS, czas symulacji i renderu, liczba wywołań rysowania). Cały kod debug jest w gałęziach `import.meta.env.DEV` i nie trafia do builda; `pnpm check:dist` szuka jego znacznika.
- Podgląd atlasu (`/tools.html?view=atlas`): obraz atlasu w trzech wariantach.
- Pomiar renderera (`/tools.html?view=perf`): czas klatki, alokacje i płynność odtwarzania na walce 5 na 5; metoda i wyniki w §5.7.
- Edytor animacji (`/tools.html?view=anim`, `src/tools/anim/`): podgląd postaci tą samą ścieżką rysowania co w walce (`sampleClip` → macierze kości → `drawRigParts`), wybór rigu, skórki, postawy i klipu, suwak i pole liczbowe na każdy kanał, ścieżka klatek kluczowych per kanał (kliknięcie ustawia czas, przeciągnięcie przesuwa klatkę), znaczniki, odtwarzanie w pętli z zadanym czasem trwania.
  - Suwak ustawia wartość w bieżącym czasie i tworzy tam klatkę, jeśli jej nie ma. Operacje na klipie (`clip-edit.ts`) utrzymują reguły walidatora: klatka w czasie 0, przy kilku klatkach także w czasie 1, rosnące czasy, równe końce w klipie zapętlonym. Klip po dowolnej edycji jest więc poprawny.
  - Panel na bieżąco pokazuje wynik `validateContent` dla treści gry z podmienionym rigiem, w tym niezgodność znacznika `hit` z `hitFraction` ataków używających klipu.
  - Eksport to wpis do obiektu `clips` w `rigs/<rig>.json`, w układzie tego pliku; import przyjmuje taki wpis albo sam obiekt klipu. Edytor nie zapisuje plików: klip wkleja się do pliku rigu ręcznie.
  - Stan początkowy z adresu: `clip`, `skin`, `stance`, `t`, `pivots=1`.
- `scripts/balance.ts` (`pnpm balance`): dla każdego poziomu jedna walka na każdą rangę składu referencyjnego; raport w `reports/balance.md` (wynik, czas, zapas HP, najniższa wygrywająca ranga i ocena względem rangi oczekiwanej). Rangi A0–A4 to ulepszenia formy bazowej, B0–B4 formy po ewolucji; wszyscy członkowie składu mają tę samą rangę, bez run. Składy i rangi oczekiwane leżą w `src/content/data/balance/reference-squads.json`. Raport nie zawiera daty, więc jego diff między commitami pokazuje tylko zmiany balansu.
- `scripts/run-battle.ts` (`pnpm battle`): walka w konsoli z logiem zdarzeń.
- `scripts/bench-sim.ts` (`pnpm bench`): pomiar budżetów symulacji.
- `scripts/validate-content.ts`: walidacja treści, niezmienniki symulacji dla treści, składy referencyjne.
- `scripts/check-deps.ts`, `scripts/check-size.ts`, `scripts/check-dist.ts`, `scripts/smoke-check.ts`: granice modułów, budżety rozmiaru, czystość builda, kontrola wdrożenia.
- `scripts/atlas.ts` (`pnpm atlas`), `scripts/atlas-placeholder.ts` (`pnpm atlas:placeholder`): potok atlasów, §5.6.

Wersję builda zapisuje wtyczka w `vite.config.ts` (logika w `scripts/lib/build-version.ts`), nie osobny skrypt.

## 9. Testy

| Rodzaj | Gdzie | Co sprawdza |
|---|---|---|
| Jednostkowe | obok kodu, `*.test.ts` | Każdy system sim z przypadkami brzegowymi; kompilacja treści; migracje zapisu |
| Golden | `tests/golden/` | Hash stanu i zdarzeń dla ustalonych `BattleSetup` |
| Treść | `pnpm validate-content` | Sekcja 4.4 |
| Granice | `pnpm deps:check` | Sekcja 1 |
| Build | `pnpm check:size`, test czystości `dist/` | Budżety rozmiaru, brak narzędzi dev |
| Zapisy | `tests/saves/`, pliki w `tests/fixtures/saves/` | Przykładowy plik z każdej wersji zapisu wczytuje się w bieżącej wersji gry |
| End-to-end | `tests/e2e/*.spec.ts`, `pnpm test:e2e` | Playwright na buildzie produkcyjnym z `vite preview` (te same nagłówki i CSP co na hostingu): nowa gra, walka do końca, nagroda w zapisie, postęp po przeładowaniu, ulepszenie, przeciąganie w składzie, zmiana języka, uszkodzony zapis; konsola bez błędów |
