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

Cecha `targetLast` (flaga w `UnitSpec`) zmienia wybór celu i tryb pocisku; `validateSetup` wymaga dla niej ataku z pociskiem, braku `pierce` i `range ≥ width`, bo jednostka idąca do ostatniego wroga minęłaby bliższych i złamała gwarancję, że wrogie jednostki się nie mijają.

Cechy `doubleDamage`, `dodge` i `shield` to procenty w `UnitSpec` (`doubleDamagePercent`, `dodgePercent`, `shieldPercent`). Dwie pierwsze działają w stałym rytmie (GAME_DESIGN.md §6): liczniki `doubleCharge` i `dodgeCharge` w stanie jednostki rosną o procent cechy i po osiągnięciu 100 wyzwalają zdarzenie. Podwojenie liczy `nextAttackDamage` (raz na atak), a unik i tarczę `queueHit` (`sim/hits.ts`), wspólnie dla ciosów i pocisków. Walka bez tych cech nie czyta ich pól (`battle.hasDoubleDamage`, `battle.hasGuards`).

Nowa cecha pasywna dodaje pola do `UnitSpec` (ADR 0009). Poza polami z listingu specyfikacja ma: `enrageHpPercent` i `enrageAttackPercent` (szał), `lifestealPercent` (kradzież życia) oraz `splashRadius` w podjednostkach (cios obszarowy); zero oznacza brak cechy. Próg HP i obrażenia w szale symulacja liczy raz, przy tworzeniu walki, więc w tickach zostaje jedno porównanie. Wejście symulacji zapisane przez starszą wersję gry (bez tych pól) piaskownica wczytuje z wartościami zerowymi.

**Obrażenia w czasie i szarża** (ADR 0021): `dotDamage`, `dotInterval`, `dotTicks`, `dotKind` (`DOT_BLEED` albo `DOT_POISON`) oraz `chargePercent`; zero oznacza brak cechy. Efekt nakłada `afflict` wołane z `queueHit`, tyka go `tickDots` w fazie cech (`sim/dot.ts`); premię szarży dolicza `nextAttackDamage`. Walka bez tych cech ma flagi `hasDot` i `hasCharge` równe `false` i nie tworzy ich tablic. `validateSetup` sprawdza pola tych cech tylko u jednostki, która cechę ma.

**Przyzywacz** (ADR 0020) to jednostka z polem `summon: UnitSpec | null` niosącym specyfikację tego, co przyzywa; u zwykłej jednostki jest tam `null`. Przyzywana jednostka sama nie może przyzywać, a przyzywacz nie może mieć pocisku. `validateSetup` sprawdza zagnieżdżoną specyfikację tak samo jak jednostki składu i wlicza ją do reguły mijania oraz do limitu pocisków (pięciu przyzwanych na stronę ponad skład).

`createBattle` sprawdza niezmienniki setupu (`validateSetup`) i rzuca błąd, gdy są złamane: wartości całkowite, zależności pól ataku, sloty gracza na lewo od slotów przeciwnika, największy `moveStep` nie większy niż najmniejszy `range`, pula pocisków wystarczająca dla składu.

### 3.3 Stan

`unitId` jednostki składu jest stałe: slot gracza `s` → `s`, slot przeciwnika `s` → `5 + s`. Pusty slot ma stan `Empty`. Definicja: `src/sim/state.ts`. Wszystkie tablice to `Int32Array`; jeden typ tablic daje jednolity, szybki dostęp i prosty hash.

**Miejsca przyzwanych** (ADR 0020). Walka z przyzywaczem ma dwadzieścia miejsc zamiast dziesięciu: za składami leży po pięć miejsc na przyzwanych, `10..14` dla gracza i `15..19` dla przeciwnika (`isPlayerUnit`, `teamOf`). `state.unitSpan` to liczba miejsc w tej walce (10 albo 20) i zarazem długość tablic jednostek; walka bez przyzywaczy ma te same tablice, pętle i hash co przed dodaniem przyzywania. Pętla po drużynie obejmuje skład, a w walce z przyzywaczami także miejsca przyzwanych (wzór pętli w komentarzu `sim/types.ts`).

| Grupa | Pola | Uwagi |
|---|---|---|
| Walka | `tick`, `outcome`, `reason` | `tick` to liczba wykonanych ticków |
| Jednostki (`unitSpan`: 10 albo 20) | `status`, `x`, `prevX`, `hp`, `target`, `swingTick`, `sinceAttack`, `traitTimer`, `doubleCharge`, `dodgeCharge` | `status`: Empty, Idle, Moving, Attacking, Dead; `target` i `swingTick` mają -1 dla „brak” |
| Szarża (tylko gdy `hasCharge`) | `chargeBonus` | Premia procentowa czekająca na pierwszy atak jednostki; po nim 0 |
| Obrażenia w czasie (tylko gdy `hasDot`; `unitSpan × 2`) | `dotLeft`, `dotNext`, `dotDamage`, `dotInterval`, `dotSource` | Jeden efekt każdego rodzaju na jednostkę, indeks `rodzaj * unitSpan + unitId`. `dotLeft`: pozostałe tyknięcia (0 = brak efektu); `dotNext`: numer ticka następnego tyknięcia; `dotSource`: kto nałożył efekt |
| Przyzywanie | `summonedBy` (per miejsce), `summonCursor` (per strona) | `summonedBy`: `unitId` przyzywacza jednostki w miejscu przyzwanych, -1 dla reszty; `summonCursor`: od którego miejsca strona szuka wolnego (kolejka okrężna) |
| Pociski (pula 64) | `projCount`, `nextProjId`, `projId`, `projX`, `projPrevX`, `projStep`, `projOwner`, `projDamage`, `projKnockback`, `projMode`, `projHitMask`, `projTarget` | Aktywne zajmują indeksy `0..projCount-1` w kolejności wystrzelenia; `projId` rośnie przez całą walkę. `projMode`: pierwszy na drodze, przebijający albo wycelowany; `projTarget` to cel pocisku wycelowanego (dla pozostałych -1) |
| Statystyki | `damageDealt`, `damageTaken`, `healingDone` | Per `unitId` |

Specyfikacje jednostek są rozłożone na takie same tablice (`UnitSpecs`). Dla składów nie zmieniają się w trakcie walki; miejsce przyzwanych dostaje specyfikację przy każdym przyzwaniu (`placeUnit`), a o tym, czyja to specyfikacja, mówi `summonedBy`, które wchodzi do hasha.

Tablice tworzy `core/int-arrays.ts`: małe (do 64 bajtów, czyli 16 liczb) osobno, bo V8 trzyma je na stercie i tworzy najtaniej, a większe (pociski, zdarzenia, jednostki w walce z przyzywaczami) jako widoki jednego bufora. Kod symulacji widzi zwykłe `Int32Array`.

`prevX` służy dwóm celom: testowi trafienia pocisku i interpolacji w rendererze.

Konwencja odczytu w `sim`: `tablica[i] ?? 0`. Przy `noUncheckedIndexedAccess` każdy odczyt ma typ `number | undefined`; `?? 0` odpowiada temu, co tablica typowana i tak zapisałaby dla `undefined`. Pola czytamy do zmiennych lokalnych, liczymy i zapisujemy z powrotem.

### 3.4 Tick

Fazy w stałej kolejności; każda iteruje po `unitId` rosnąco, chyba że zaznaczono inaczej. Reguły gry dla każdej fazy: [GAME_DESIGN.md §4](GAME_DESIGN.md).

| # | Faza | Uwagi implementacyjne |
|---|---|---|
| 0 | Początek | `prevX ← x`, `projPrevX ← projX`, wyczyszczenie kolejki zmian |
| 1 | Decyzje | Tylko jednostki poza zamachem. Odczyt stanu z początku ticka. Cel: front szyku przeciwnika, a dla jednostek z `targetLast` jego koniec; oba wyznaczane raz na tick, koniec tylko w walkach, w których ktoś ma tę cechę (`battle.hasTargetLast`). |
| 2 | Ruch | Każda jednostka niezależnie; sojusznicy się nie blokują. |
| 3 | Ataki | W `hitTick`: melee dopisuje obrażenia i odrzut do kolejki, ranged tworzy pocisk, przyzywacz dopisuje prośbę o jednostkę. Przyzywacz zaczyna zamach tylko wtedy, gdy jego strona ma wolne miejsce. |
| 4 | Pociski | Trafienie = wróg był przed pociskiem na początku ticka i nie jest przed nim po ruchu obu. Dopisuje obrażenia i odrzut do kolejki. Pocisk wycelowany sprawdza w ten sposób tylko swój cel. |
| 5 | Cechy okresowe | Leczenie dopisywane do kolejki. Potem tyknięcia obrażeń w czasie: wpis, którego `dotNext` równa się numerowi ticka, dopisuje obrażenia do kolejki (tylko gdy `hasDot`). |
| 6 | Rozstrzygnięcie | Dla wszystkich naraz: `hp = min(maxHp, hp − obrażenia + leczenie)`, potem przesunięcie o zsumowany odrzut w stronę własnej krawędzi, z przycięciem do pola. |
| 7 | Śmierci, przyzwani i koniec | Zdarzenia `Died`; potem na polu stają przyzwani z tego ticka (`sim/summon.ts`), w pozycji przyzywacza, w pierwszym wolnym miejscu od `summonCursor`; warunek końca liczy żywych obu stron razem z przyzwanymi; limit czasu. |

Test trafienia pocisku porównuje położenie względne przed i po ticku, a nie przedział przebyty przez sam pocisk. Dzięki temu wróg idący naprzeciw nie może „przeskoczyć” pocisku w fazie ruchu.

Kolejka zmian to tablice indeksowane `unitId`: `pendingDamage`, `pendingHeal`, `pendingKnockback` i `pendingSummon` (prośby przyzywaczy). Wszystkie źródła piszą do niej, a HP zmienia tylko faza 6. Przyzwany pojawia się na końcu ticka, więc nie działa w ticku przyzwania, a miejsce, w którym stanął, jest czyszczone z odwołań do poprzednika: cel trwającego zamachu, cel pocisku wycelowanego i bit w masce pocisku przebijającego. Każde trafienie dopisuje do `pendingKnockback` wartość `max(0, knockback źródła − knockback trafionego)`.

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
| `Dodged` | jednostka, która uniknęła | źródło trafienia | |
| `Summoned` | miejsce (`unitId`), w którym stanął przyzwany | przyzywacz | pozycja |
| `Afflicted` | jednostka, na którą nałożono nowy efekt obrażeń w czasie | rodzaj efektu | źródło |

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
  damageDealt: readonly number[];   // per unitId; obrażenia przyzwanych liczą się przyzywaczowi
  damageTaken: readonly number[];   // tablice mają 10 pozycji, a w walce z przyzywaczem 20
  healingDone: readonly number[];
  finalHp: readonly number[];
  stateHash: number;
  eventHash: number;
}
```

`createBattle` nie przyjmuje ziarna, bo sim nie losuje.

### 3.7 Hash

FNV-1a 32-bit (`Math.imul`) po wszystkich tablicach stanu i liczniku ticków; w walce z przyzywaczem także po miejscach przyzwanych, `summonedBy` i `summonCursor`, a w walce z obrażeniami w czasie albo szarżą także po ich tablicach (w pozostałych walkach są puste, więc starsze hashe się nie zmieniły). `eventHash` narasta w każdym ticku, w którym zaszły zdarzenia: obejmuje numer ticka i zawartość bufora, więc te same zdarzenia w innym momencie dają inny hash. Testy golden w `tests/golden/` przechowują parę hashy dla każdego ustalonego `BattleSetup`.

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

Pomiar po dodaniu cechy `targetLast` (2026-10-05, sześć przebiegów przed i po, ta sama walka bez tej cechy): 2236–2322 walk na sekundę wobec 2269–2357 przed zmianą, czyli różnica w granicach rozrzutu. Pierwsza wersja czytała flagę cechy dla każdej jednostki i cel dla każdego pocisku i była o ok. 5% wolniejsza; teraz walka bez cechy nie czyta flagi (jedno sprawdzenie `hasTargetLast` na jednostkę), a cel pocisku czytany jest tylko w trybie wycelowanym.

Pomiar po dodaniu cech `doubleDamage`, `dodge` i `shield` (2026-10-05, osiem przebiegów na przemian przed i po zmianie): mediana 2119 walk na sekundę wobec 2166 przed zmianą, czyli ok. 2% wolniej (tego dnia cały pomiar wypadał niżej niż rano). Sam tick nie czyta pól tych cech w walkach bez nich; koszt to pięć dodatkowych tablic tworzonych w `createBattle`. Zapas wobec budżetu 2000 spadł do ok. 6%.

Pomiar po dodaniu przyzywania (2026-10-06, ADR 0020). Pojedynczy przebieg `pnpm bench` waha się tego dnia o ±5% (od 1830 do 2150 walk na sekundę dla tego samego kodu), więc porównania robiono w jednym procesie: wersja sprzed zmiany i bieżąca na przemian, po 21 rund z 400 walkami.

| Wariant pętli po drużynie (skład + przyzwani) | Czas zwykłej walki względem stanu sprzed zmiany |
|---|---|
| Wspólna pętla zagnieżdżona po obu zakresach we `frontUnit` i w ruchu pocisków | +4–6% |
| Pętla składu i przyzwanych wyniesiona do wspólnej funkcji | +7–9% |
| Pętla składu jak przedtem, przyzwani w osobnej funkcji wołanej tylko w walce z przyzywaczami (stan obecny) | sam tick ok. +1,5% |

- Reszta zmian w ticku (granica pętli z `unitSpan`, `isPlayerUnit`, sprawdzenia `hasSummons`) nie daje różnicy mierzalnej ponad rozrzut.
- Przy okazji wyszło, że `createBattle` kosztuje 28 µs, czyli 6% całej walki, z czego 21 µs to alokacja czternastu tablic typowanych większych niż 64 bajty (pociski i zdarzenia): V8 daje każdej osobny bufor poza stertą, ok. 1 µs na sztukę. Wycinanie ich z jednego bufora (`core/int-arrays.ts`) skróciło `createBattle` do 13,5 µs.
- Bilans dla zwykłej walki: ok. 9 µs dłuższe ticki, 14,5 µs krótsze tworzenie. Osiem par przebiegów `pnpm bench` na przemian dało medianę 1951 walk na sekundę wobec 1932 przed zmianą (tego dnia cała maszyna mierzyła o kilka procent niżej niż rano, gdy ten sam kod sprzed zmiany dawał 2040–2110).
- Walka z przyzywaczami (golden `summon`, 924 ticki, do szesnastu jednostek naraz): ok. 1000 walk na sekundę, 1,1 µs na tick.

Pomiar po dodaniu obrażeń w czasie i szarży (2026-10-07, ADR 0021), tą samą metodą A/B w jednym procesie:

- Same ticki zwykłej walki: 0,99–1,01 czasu sprzed zmiany. W ticku doszły trzy sprawdzenia flag (`hasDot` w fazie cech i przy trafieniu, `hasCharge` przy ataku).
- `createBattle`: 9,6 → 10,0 µs. Pierwsza wersja sprawdzała pola nowych cech w ogólnej pętli walidacji i kosztowała 0,7 µs; teraz walidator czyta je tylko u jednostki, która cechę ma.
- Pełne walki: 1,01–1,02 czasu sprzed zmiany, ale **pomiar kontrolny tej samej wersji po obu stronach** daje 1,00–1,01 na minimach i do 1,03 na medianach. To dolna granica tego, co ta metoda rozróżnia; strona wczytana jako druga wypada odrobinę wolniej.
- `pnpm bench` tego dnia: 2154 walk na sekundę.

**Budżet 2000 walk na sekundę jest na styk**: wynik zależy dziś bardziej od obciążenia maszyny niż od kodu. Kolejna zmiana symulacji musi zacząć od pomiaru A/B w jednym procesie; pojedynczy `pnpm bench` nie rozróżni 2%. Dalsze przyspieszenie ticka wymagałoby jednej wspólnej tablicy na wszystkie pola jednostek kosztem czytelności. Przy zerowej losowości skrypt balansu rozgrywa setki, a nie setki tysięcy walk, więc na razie nie jest to potrzebne.

## 4. Treść (`src/content`)

### 4.1 Pliki

```
src/content/data/
  arena.json            szerokość pola, sloty, limit czasu
  attacks.json          typy ataków
  units/heroes.json     formy bohaterów
  units/enemies.json    wrogowie i bossowie
  units/summons.json    jednostki przyzywane (ADR 0020); gracz ich nie kupuje, poziomy ich nie wystawiają
  enemy-tribes.json     szczepy wrogów (Akronix): stopnie i jednostki z units/enemies.json w kolejności siły
  progression.json      stałe progresji: liczba ulepszeń, procent na ulepszenie, sloty run, złoto za powtórkę,
                        koszty ulepszeń i ewolucji według stopnia formy (ADR 0023)
  lines.json            linie bohaterów: drzewo form, cena w sklepie, linia startowa
  runes.json
  worlds.json           światy w kolejności gry: id i tło sceny (`backdrop`, zamknięty zestaw `BACKDROP_IDS`)
  levels/world_N.json   poziomy świata w kolejności odblokowywania
  rigs/*.json           (od M2)
  clips/*.json          (od M2)
  balance/reference-squads.json   skład odniesienia dla skryptu balansu poziomów: bohaterowie w kolejności kupowania (ADR 0025)
src/content/i18n/pl.json, en.json
```

Nazwy jednostek, szczepów (linii), światów i poziomów nie leżą w danych, tylko w słownikach pod kluczami `unit.<id>.name`, `line.<id>.name`, `world.<id>.name`, `level.<id>.name`; walidator sprawdza ich komplet.

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
// opcjonalnie własny kadr miniaturki (ADR 0017): "portrait": { "center": [9, -27], "size": 38 }

// tempo ataków: "attackSpeed" (ataki na sekundę) albo "attackInterval" (sekundy między atakami,
// tak jak na szkicach autora: „Atk: 3,0” to atak co 3 s); dokładnie jedno z dwóch pól
{ "id": "ultimus", "kind": "ranged", "maxHp": 1250, "attack": 250, "moveSpeed": 30,
  "attackInterval": 3, "range": 260, "knockback": 50, "attackType": "ray_flare" }

// przyzywacz (ADR 0020): nie atakuje, tempo ataków to tempo przyzwań,
// "summon" wskazuje jednostkę z units/summons.json
{ "id": "mother_tree", "kind": "summoner", "maxHp": 10000, "attack": 0, "moveSpeed": 0,
  "attackInterval": 2, "range": 1000, "knockback": 40, "attackType": "summon", "summon": "sprout" }

// pocisk może podać wysokość lotu nad stopami w jednostkach rigu (domyślnie 43): skąd wylatuje
{ "id": "fire_spit", "swingDuration": 0.9, "hitFraction": 0.5, "clip": "spit", "stance": "beast",
  "projectile": { "speed": 380, "sprite": "fireball", "height": 72 } }

// cechy: okresowa, szał, kradzież życia, cios obszarowy
{ "type": "periodicHeal", "target": "team", "amount": 20, "interval": 2.0 }
{ "type": "enrage", "hpBelow": 50, "attackBonus": 60 }   // procenty
{ "type": "lifesteal", "percent": 35 }
{ "type": "splash", "radius": 45 }                        // jednostki świata
{ "type": "targetLast" }                                  // celuje w koniec szyku wroga
{ "type": "doubleDamage", "percent": 50 }                 // co drugi atak podwójny (stały rytm)
{ "type": "dodge", "percent": 70 }                        // 70 na 100 trafień unikniętych
{ "type": "shield", "percent": 10 }                       // o 10% mniejsze obrażenia
{ "type": "bleed", "damage": 30, "duration": 10 }         // trafiony traci 30 co sekundę przez 10 s
{ "type": "poison", "damage": 15, "interval": 1, "duration": 4 }
{ "type": "charge", "bonus": 200 }                        // pierwszy atak w walce potrójny

// lines.json: drzewo form (ADR 0016); forma bez "from" jest bazowa
{ "id": "archer", "price": 200, "starter": true, "forms": [
  { "unit": "archer_a" },
  { "unit": "archer_b", "from": "archer_a" },
  { "unit": "cleric_a", "from": "archer_a" } ] }

// progression.json, pole "tiers": koszty według stopnia formy (ADR 0023); indeks 0 to forma bazowa
[ { "upgradeCost": 50 },
  { "evolveCost": 400, "upgradeCost": 200 },
  { "evolveCost": 1600, "upgradeCost": 800 } ]

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
| `attackInterval` | `round(30 / attackSpeed)` albo `round(30 × attackInterval)` dla odstępu w sekundach; co najmniej 1 |
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
- `targetLast` tylko przy ataku z pociskiem, bez `pierce`, a `range` takiej jednostki obejmuje całą szerokość areny;
- jednostka bez ruchu (`moveSpeed` 0) ma `range` na całą szerokość areny: inaczej stałaby bezczynnie, gdy wróg jest dalej;
- `kind: "summoner"` i pole `summon` występują razem; `summon` wskazuje jednostkę z `units/summons.json`, która sama nie przyzywa; typ ataku przyzywacza nie ma pocisku; jednostki przyzywane przechodzą te same reguły symulacji i atlasu co bohaterowie i wrogowie;
- procenty cech w zakresach: `doubleDamage` 1–100, `dodge` i `shield` 1–99;
- wróg na poziomie to dowolna jednostka: forma bohatera albo jednostka specjalna z `units/enemies.json`;
- górne ograniczenie liczby żywych pocisków mieści się w puli;
- każda linia jest drzewem form (jedna forma bazowa, każda inna osiągalna z niej jedną drogą; ADR 0016), forma należy do jednej linii, a każdy bohater do jakiejś linii;
- tabela kosztów według stopnia (ADR 0023) opisuje każdy stopień, na którym stoi jakaś forma; ceny rosną ze stopniem, a ewolucja kosztuje więcej niż ulepszenie formy przed nią i po niej;
- każdy świat ma plik poziomów z wymaganą liczbą poziomów (`levelsPerWorld`); w poziomie sloty wrogów się nie powtarzają;
- najwyżej jedna cecha danego typu na jednostkę;
- kadr miniaturki rigu (`portrait`) wskazuje istniejącą kość.

Reguły zależne od kodu symulacji (niezmienniki `UnitSpec`, mijanie się, pula pocisków) sprawdza `scripts/lib/content-sim-checks.ts`, bo `content` może importować z `sim` tylko typy.

## 5. Renderer (`src/render`)

### 5.1 Interfejs

```ts
interface Renderer {
  beginBattle(battle: Battle, visuals: readonly (UnitVisual | null)[]): void;  // wygląd per unitId
  consume(events: EventBuffer): void;                                           // po każdym ticku
  draw(viewport: Viewport, alpha: number, frameMs: number): void;
  setTopUnit(unit: number): void;                                               // -1: zwykła kolejność
  setShowcase(on: boolean): void;                                               // scena pokazowa
  setBackdrop(backdrop: BackdropId): void;                                      // tło świata (ADR 0022)
  endBattle(): void;
}

function createCanvasRenderer(ctx: CanvasRenderingContext2D, assets: RenderAssets): Renderer;
function createPortraitSheet(assets: RenderAssets, visuals: Iterable<[string, UnitVisual]>): PortraitSheet;
```

Reszta gry zna tylko ten interfejs; implementacja to Canvas 2D (ADR 0001). Jednostki rysowane są od najdalszego slotu do najbliższego; `setTopUnit` pozwala narysować jedną na wierzchu (ekran składu: bohater, którego gracz właśnie przeciąga). Przyzwani (ADR 0020) nie mają wyglądu w `visuals`: niesie go `UnitVisual.summon` przyzywacza. Renderer przygotowuje go przy `beginBattle` w wierszu wzorca (`LOOK_ROWS` = miejsca jednostek i po jednym wzorcu na jednostkę składu) i przy zdarzeniu `Summoned` przepisuje do miejsca, w którym przyzwany stanął (`copyLook`, bez alokacji); animator zeruje wtedy stan miejsca, żeby nowa jednostka nie przejęła padania ani pozy poprzednika. Przyzwani są rysowani po składach, z krótszym paskiem życia i bez liczby nad nim. `setBackdrop` wybiera tło sceny i zostaje w mocy do następnej zmiany, także między walkami (§5.5). `setShowcase` oznacza scenę, na której nikt nie walczy: paski życia obu stron mają wtedy kolor gracza (sklep stawia połowę linii w slotach prawej strony sceny). Symulacja nie wie nic o wyglądzie: `UnitVisual` (rig, skórka, skala, klip ataku, postawa, sprite pocisku) pochodzi z treści i trafia do renderera obok walki (`levelVisuals`). Zamianę `UnitVisual` na struktury renderera (`UnitLook`: skompilowany rig, postawa, klipy) robi `render/looks.ts`, wspólnie dla walki i miniaturek (§5.8).

### 5.2 Pętla

`requestAnimationFrame` (`game/frame-loop.ts`) z akumulatorem stałego kroku z `core`: mnożnik prędkości 1/2/4, limit skoku czasu 0,25 s, zerowanie czasu po powrocie do ukrytej karty. `BattleRunner` (`game/battle-runner.ts`) wykonuje należne ticki, po każdym przekazuje zdarzenia rendererowi i rysuje klatkę z `alpha = akumulator / krok`; pozycja jednostki to interpolacja między `prevX` a `x`. Po zakończeniu walki i w pauzie rysowany jest stan dokładnie z ostatniego ticka.

Renderer może używać `Math.sin/cos` i floatów. Zakaz dotyczy tylko `sim`.

### 5.3 Rig i klipy

Rig z klipami leży w jednym pliku treści (`rigs/humanoid.json`: dane z załącznika A briefu) i jest kompilowany przez renderer przy starcie (`render/rig.ts`, `render/clips.ts`).

- **Kość**: rodzic (albo `root`), punkt zaczepienia względem pivota rodzica, nazwa części, flagi `back` i `optional`. Kości są zapisane w kolejności obliczeń (rodzic przed dzieckiem); kolejność rysowania to osobna lista `drawOrder`.
- **Druga ręka** (`offhand`, kość opcjonalna): to, co postać trzyma w dalszej ręce (tarcza Defenixa, druga broń Axinów). Wisi na dalszym przedramieniu, ale rysuje się przed tułowiem i głową, tuż przed bliższą ręką, bo tylko tak tarcza zasłania postać. Skórka bez tej części po prostu jej nie rysuje, a kontrola atlasu (`content-asset-checks.ts`) nie wymaga części opcjonalnych. Kąt chwytu podają postawy `shield` i `dual`.
- **Skórka** (`skin` jednostki) wyznacza sprite'y: `<skórka>/<część>` w atlasie. Formy bohaterów dzielą rig i klipy, a różnią się skórką.
- **Poza** to `channelCount` liczb: kąt każdej kości w radianach, potem `bob` i `dx` korzenia w jednostkach rigu.
- **Klip**: klatki kluczowe `[czas 0..1, wartość]` per kanał, w `Float32Array`; interpolacja smoothstep; znaczniki (`hit`). Kanały, których klip nie animuje, biorą wartość z **postawy** typu ataku (np. kąt chwytu miecza albo łuku w idle i chodzie).
- **Macierze**: 6 wartości na kość, liczone ręcznie (`computeBoneMatrices`). `blit` składa macierz kości z przesunięciem o pivot sprite'a i przekazuje wynik do `ctx.setTransform` (powód w §5.7). Dodatni kąt to obrót zgodny z ruchem wskazówek zegara. Macierz korzenia zawiera pozycję stóp, skalę (ujemna w osi X odbija przeciwnika) i obrót całej postaci przy śmierci.
- Elementy dynamiczne (cięciwa) rysowane wektorowo między punktami kości.
- Rig `humanoid` służy też czterem szczepom (ADR 0018, ADR 0019): skórka może mieć części innej wielkości i z innymi pivotami niż ludzie (pivot każdego sprite'a jest w atlasie), a klipy `peck`, `gore`, `spit` i `volley` z postawą `beast` animują ataki łbem, paszczą i grzbietem zamiast miecza i łuku. Kolejne szczepy dodały `cast` (rzut znad głowy), `flare` (uniesienie rąk), `summon` (przyzwanie) i `jab` (dziobnięcie całym ciałem przy prawie nieruchomych ramionach: u postaci-kuli ramię jest powieką oka).
- **Kadr miniaturki** (`portrait`): kość, punkt względem jej pivota i bok kwadratu w jednostkach rigu; z niego powstają miniaturki postaci (§5.8).

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

**Wysokość postaci.** Pasek życia wisi nad `scene.headHeight[unit]`: dla postaci o ludzkiej budowie to wspólna wysokość z rigu (biodra + 48 jednostek), dla wyższych (długa szyja, rogi, uszy) zmierzony czubek stojącej postaci (`Reach.stand` z klipu idle). Dzięki temu paski ludzi stoją w jednej linii, a pasek Ironbeaka nie przecina mu szyi.

**Pociski.** Pocisk leci na wysokości podanej w typie ataku (`projectile.height`, razy skala postaci), więc kieł wychodzi z paszczy, a kolec z grzbietu. Pocisk wycelowany (`projMode` = wycelowany) leci łukiem od strzelca do bieżącej pozycji celu i obraca się wzdłuż toru; szczyt łuku to 30% odległości, najwyżej 210 jednostek. To tylko wygląd: w symulacji pocisk jest punktem na osi X.

Nad głową każdej żywej postaci jest pasek życia, a nad nim bieżące życie jako liczba (`render/draw-units.ts`): pasek pokazuje ułamek, liczba skalę. Po zdarzeniu `Dodged` nad postacią unosi się znak uniku (`fx/dodge`), żeby chybiony cios nie wyglądał na błąd. Cyfry pochodzą z atlasu (zestaw `fx/hp_0..9`) i są wyliczane dzieleniem całkowitym, bez tworzenia napisów. Liczby obrażeń i leczenia startują nad liczbą życia.

**Tła światów** (ADR 0022). Każdy świat ma własne tło z zamkniętego zestawu `BACKDROP_IDS` (`content/schema-progression.ts`): `castle`, `mechanus`, `swamps`, `jungle`, `tower`, `citadel`. Tło nie ma plików graficznych: to kod w `render/backdrops/`, po pliku na świat.

- Opis tła (`BackdropSpec`) to kolor nieba, ziemi i linii podłogi oraz lista warstw od najdalszej (cztery do siedmiu na tło); warstwa to kolor i wielokąty w jednostkach logicznych sceny (płaskie listy `x, y`). `kit.ts` ma klocki wspólne dla wszystkich teł (prostokąt, koło, owal, iskra, grzbiet gór, schody, blanki, trójkąt, koło zębate, łuk) i `vary`, czyli powtarzalny rozrzut z numeru elementu: tła nie używają losowości, więc wyglądają tak samo przy każdym uruchomieniu.
- `index.ts` to rejestr `BACKDROP_SPECS: Record<BackdropId, () => BackdropSpec>`; typ pilnuje, że każde id z treści ma rysunek. Geometria jest czysta, więc test (`backdrops.test.ts`) sprawdza ją bez canvasu: poprawność wielokątów i kolorów, powtarzalność, kontrast napisów interfejsu z niebem i ziemią co najmniej 4,5:1, duże warstwy blisko koloru nieba (kontrast poniżej 1,6), żeby postacie i kafle mapy były wyraźniejsze od dekoracji.
- `render/background.ts` buduje z opisu po jednej ścieżce `Path2D` na warstwę, przy pierwszej klatce z danym tłem, i trzyma je w mapie per id. W pętli klatek `drawBackground(ctx, viewport, backdrop)` tylko wypełnia: niebo, warstwy, ziemia, atramentowa linia podłogi; bez alokacji.
- Renderer trzyma id tła w `scene.backdrop`; ustawia je `Renderer.setBackdrop`. O tym, które tło pokazać, decyduje gra (`game/scene-world.ts`, §6.1), nie renderer.

### 5.6 Atlasy

- Części rysowane w ponad 2× rozdzielczości logicznej (3 piksele atlasu na jednostkę rigu przy skali postaci 1,4), wygładzanie włączone.
- **Źródła** leżą w `assets/src/<atlas>/`: pliki PNG (nazwa sprite'a to ścieżka względem katalogu atlasu, np. `swordsman_a/torso`) i manifest `atlas.json` z gęstością `pixelsPerUnit`, ustawieniami kodowania (`lossless`, `quality`) i pivotami w jednostkach rigu. Klucz pivota to nazwa sprite'a albo wzorzec `*/<część>` dla tej części we wszystkich skórkach; dokładna nazwa wygrywa.
- **`pnpm atlas`** (`scripts/atlas.ts`) pakuje każdy katalog metodą półek do `src/assets/generated/<atlas>.webp` i `<atlas>.json` (prostokąty w pikselach, pivoty). Szerokość atlasu to najmniejsza potęga dwójki dająca mniej więcej kwadrat. Odrzuca sprite bez pivota, pivot bez pliku, nazwy spoza `[a-z0-9_/]` i atlas powyżej 1 MB. Obrazów nie przycina, więc przezroczyste marginesy w źródle trafiają do atlasu. Kodowanie WebP robi sharp (ADR 0014); wygenerowane pliki są w repozytorium, więc build ich nie odtwarza.
- `pnpm atlas --check` i test w `scripts/lib/atlas-pipeline.test.ts` sprawdzają, że wygenerowane pliki odpowiadają źródłom (metadane bajt w bajt, obraz po zdekodowaniu).
- Generator rysuje kształtami opisanymi odległością ze znakiem (`scripts/lib/raster.ts`: koło, elipsa, prostokąt, odcinek, odcinek zwężany, wielokąt, suma, różnica, część wspólna). Kształt niesie prostokąt ograniczający, więc wypełnianie liczy tylko piksele w jego obrębie. Ludzie to proste bryły (`placeholder-parts.ts`); postacie czterech szczepów mają własne części rysowane w układzie stawu (`scripts/lib/skins/`: `kit.ts` z płótnem części i regułami stylu „mroczna baśń” z ADR 0019, `limbs*.ts` z kończynami per materiał, katalog na szczep z plikiem na postać, `fx.ts` z pociskami, `index.ts` z rejestrem skórek). Styl wymaga szumu: `raster.ts` ma szum wartości o stałym ziarnie, poszarpanie krawędzi kształtu, plamy i postarzanie gotowego obrazka; ziarno wynika z granic części, więc generator jest powtarzalny.
- Do M6 źródłami atlasu `units` są grafiki placeholder z generatora `pnpm atlas:placeholder`. Generator nadpisuje tylko katalog oznaczony w manifeście jako `"generator": "placeholder"`. Vite nadaje nazwom plików hash treści.
- Docelowy podział: atlas bohaterów i atlas wrogów per świat, ładowany leniwie przy wejściu do świata (M6). Tła światów nie mają plików (§5.5), więc nie wchodzą do atlasów ani do transferu.
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

Pomiar po dodaniu miniaturek postaci (2026-10-05, DPR 1, ta sama walka): mediana klatki w pętli 0,30 ms, alokacje 278 B na klatkę, czyli bez zmian. Miniaturki powstają raz, po wczytaniu atlasu, a w pętli klatek doszło tylko porównanie maski żywych jednostek (liczba całkowita).

Pomiar po dodaniu opcjonalnej kości `offhand` do rigu i znaczków efektów przy pasku życia (2026-10-07, DPR 1, ta sama walka): mediana klatki w pętli 0,40 ms, czas JS klatki przy odtwarzaniu 0,64 ms średnio (p99 1,1 ms), 299 B na klatkę i 258 `drawImage`, czyli bez zmian. Postać ma teraz dwanaście macierzy kości zamiast jedenastu; kość bez sprite'a nie jest rysowana. Znaczki rysują się tylko w walce, w której ktoś nakłada efekty (`battle.hasDot`).

Pomiar po dodaniu teł światów (2026-10-07, DPR 1, ta sama walka na każdym z sześciu teł; adres `/tools.html?view=perf&backdrop=<id>`): mediana klatki w pętli 0,40 ms, czas JS klatki przy odtwarzaniu 0,64–0,73 ms średnio, 298–300 B na klatkę i 0 zgubionych klatek na każdym tle, czyli bez zmian w czasie JS i alokacjach. Tło to cztery do siedmiu wywołań `fill` gotowych ścieżek. Różni się natomiast **średnia** klatki w pętli bez czekania na ekran: zamek 1,6 ms (40 wielokątów), cytadela 1,8 ms (62), wieża 1,8 ms (100), fabryka 2,0 ms (72), bagna 2,2 ms (142), dżungla 2,3 ms (73). Średnią podnoszą pojedyncze długie klatki, w których przeglądarka nadrabia rysowanie zlecone wcześniej (mediana się nie zmienia), więc jest to pośredni ślad kosztu rasteryzacji poza wątkiem JS; rośnie z liczbą i wielkością wielokątów. Na komputerze mieści się on w klatce z dużym zapasem; telefon nie był mierzony. Gdyby nie nadążał, tło można raz narysować do osobnego canvasu i kopiować jednym `drawImage` (ADR 0022).

Pomiar po dodaniu pocisków wycelowanych (2026-10-05, DPR 1): scena pomiaru ma teraz po jednym strzelcu z cechą `targetLast` na stronę, więc lot łukiem jest mierzony razem z resztą. Wynik: 297 B na klatkę, 258 `drawImage`. Ta sama scena z wyłączonym rysowaniem łuku daje te same 297 B, więc łuk nie alokuje; różnica wobec 280 B to inny przebieg walki (trafienia w tylne jednostki, więcej liczb naraz).

Jak mierzyć alokacje: przyrost sterty po długiej serii klatek nic nie mówi, bo silnik po drodze sam opróżnia młodą generację (tak wyszło „zero” przy 2350 B na klatkę). Narzędzie liczy więc krótkie serie zaczynane tuż po wymuszonym odśmieceniu, co wymaga Chromium z flagami `--enable-precise-memory-info --js-flags=--expose-gc`. Źródło alokacji wskazuje „Allocation sampling” w DevTools (Memory) na `ffPerfFrames(3000)` wywołanym z konsoli.

### 5.8 Miniaturki postaci

Miniaturka to popiersie wycięte z prawdziwej postaci (ADR 0017), bez osobnych grafik. `createPortraitSheet` (`render/portrait.ts`) rysuje raz, po wczytaniu atlasu, po jednej miniaturce na każdy wygląd (rig, skórka, postawa) na wspólnym arkuszu poza ekranem, 128 × 128 px na komórkę:

- kadr to `portraitFrame(rig, visual)`: własny kadr jednostki z treści (`portrait` w danych jednostki), a bez niego kadr rigu. Bestie mają własne kadry, bo ich łby są większe albo siedzą na długiej szyi;
- `posePortrait` ustawia rig w pierwszej klatce klipu idle, w jednostkach rigu i bez skali jednostki, tak że lewy górny róg kadru leży w (0, 0); kadr idzie za swoją kością, ale się z nią nie obraca;
- części rysuje ten sam kod co w walce (`drawRigParts`, cięciwa przez `drawString`), każdą miniaturkę na canvasie roboczym, żeby broń wystająca poza kadr nie wchodziła w sąsiednią komórkę;
- `PortraitSheet.paint(canvas, klucz)` kopiuje komórkę na canvas interfejsu. Kluczem jest id jednostki z treści; jednostki o tym samym wyglądzie dzielą komórkę.

Moduł działa poza pętlą klatek, więc może alokować i woła `drawImage` wprost (z całkowitymi współrzędnymi), jak budowanie wariantów atlasu.

## 6. Gra (`src/game`)

### 6.1 Sceny i stan gry

Stan gry to obiekt `Game` (`game/game.ts`) z sygnałami Preact: zapis (`save`), scena (`scene`), stan pamięci przeglądarki (`storage`). Scena to wartość sygnału, nie ścieżka URL:

```
ekran startowy → mapa (ekran główny) ─┬─ walka → wynik → mapa
                                      ├─ skład (sloty, ulepszenia, ewolucja, runy)
                                      ├─ bohaterowie (formy linii, droga ulepszeń i ewolucji)
                                      └─ sklep (samo kupowanie)
```

Gra otwiera się ekranem startowym z jednym przyciskiem „Graj”. Dalej ekranem głównym jest mapa: gra na nią wraca po walce, a skład, bohaterowie i sklep mają tylko „Wróć” na mapę, bez przejść między sobą (ADR 0015). Scena bohaterów niesie wybraną linię (`{ name: 'heroes', line }`), żeby canvas wiedział, czyje formy pokazać; otwiera ją `openHeroes(linia)`. Skład zmienia się tylko na ekranie składu. Mapa pokazuje przeciwników i nagrody wybranego poziomu (`{ name: 'map', selected }`) i zaczyna walkę bieżącym składem. Mapa pokazuje jeden świat naraz: **świat wybranego poziomu**, bez osobnego pola w scenie, więc szlak, przeciwnicy i tło zawsze należą do tego samego świata (ADR 0022). `openMap(poziom)` wybiera wskazany poziom, także zablokowany (można go obejrzeć, ale `startBattle` go nie uruchomi), a bez argumentu albo dla nieistniejącego id pierwszy jeszcze nieprzeszły. `openWorld(świat)` przełącza mapę na inny świat: wybiera jego pierwszy nieprzeszły poziom, a w świecie odbitym bossa (`worldEntryLevel`). Wynik walki ma jeden przycisk: po pierwszym przejściu poziomu mapa otwiera się z następnym, po porażce i powtórce z tym samym.

- **Reguły** leżą w `game/progress.ts` jako czyste funkcje `(treść, zapis) → nowy zapis | null`: odblokowywanie poziomów, nagrody, zakup bohatera, ulepszenia, ewolucja, runy, skład, statystyki efektywne (`heroView` używa `resolveUnitSpec`, więc podgląd w UI równa się temu, co dostaje symulacja).
- **Bohaterowie są egzemplarzami**: zapis trzyma listę `heroes` z id nadawanym kolejno; reguły i akcje adresują bohatera po id, a skład to id bohaterów per slot. Kilku bohaterów tej samej linii to osobne wpisy.
- **Akcje** `Game` wołają reguły i po każdej zmianie zapisują grę. UI czyta sygnały i wywołuje akcje; komponenty nie zawierają reguł.
- **Canvas** obsługuje `game/battle-stage.ts`. Linia podłogi jest wspólna dla wszystkich ekranów, zmieniają się aktorzy i tło. Tło wskazuje `sceneBackdrop(treść, zapis, scena)` z `game/scene-world.ts`: mapa pokazuje tło świata wybranego poziomu, walka i wynik świata swojego poziomu, ekran startowy świata, do którego gracz doszedł; skład, sklep i bohaterowie zwracają `null` i zostają na tle poprzedniego ekranu. Podgląd to walka w ticku 0 bez kroków symulacji: na ekranie startowym i mapie skład gracza naprzeciw przeciwników poziomu, na ekranie składu sam skład, w sklepie bohaterowie na sprzedaż, w informacjach o bohaterach obie formy wybranej linii. `StageControls.movePreviewUnit(slot, pozycja)` przesuwa postać podglądu za wskaźnikiem przy przeciąganiu na ekranie składu i każe rendererowi rysować ją na wierzchu; zapis pozycji idzie wprost do stanu podglądu, który nigdy nie jest krokowany, więc nie dotyka żadnej walki. W scenie walki działa `BattleRunner`. Atlas ładuje się przy starcie gry, przez `guardedLoad`; po błędzie ekrany działają bez postaci na scenie, a z walki gracz wraca na mapę i widzi komunikat.
- **Miniaturki i twarze walki.** Po wczytaniu atlasu `battle-stage.ts` tworzy arkusz miniaturek wszystkich jednostek z treści (`game/portraits.ts`, §5.8) i udostępnia go interfejsowi jako `StageControls.paintPortrait(canvas, unitId)`. Gdy arkusza nie da się narysować, błąd trafia do raportu, okienka zostają puste, a scena i walka działają dalej. `StageControls.faces` to lista postaci trwającej walki w kolejności ze sceny (tył składu gracza … front, front przeciwnika … tył) z flagą `alive`; poza walką jest pusta. `game/battle-faces.ts` buduje ją z tych samych danych co `levelSetup`; pętla klatek porównuje samą maskę bitową żywych (`aliveMask`), a nową listę tworzy na początku walki i gdy ktoś ginie.
- **Stanowiska na scenie** (`game/stage-stands.ts`): `shopStands` rozstawia linie bohaterów w równych odstępach wzdłuż sceny (do pięciu w jednym rzędzie; do dziesięciu w dwóch połowach zwróconych do siebie, z których prawa zajmuje sloty przeciwnika), `formStands` stawia formy jednej drogi ewolucji (od bazowej przez wybraną do końca drogi, `displayPath`), a `standScene` buduje ze stanowisk wejście symulacji z własnymi pozycjami slotów. `squadFieldSetup` rozstawia skład na ekranie zarządzania szerzej niż w walce (`SQUAD_FIELD_AT`), żeby pod każdym bohaterem zmieściło się jego pole; sloty przeciwnika odsuwa na prawą krawędź, bo symulacja wymaga, by sloty gracza leżały na lewo od nich. Z tych samych stanowisk UI wylicza położenie metek i drogi ulepszeń.
- **Koniec walki**: po rozstrzygnięciu renderer rysuje jeszcze 1,4 s (animacje śmierci), potem `finishBattle` nalicza nagrody, zapisuje grę i przełącza na wynik. Pod arkuszem wyniku zostaje pole zakończonej walki. Wyjście ze sceny wyniku albo walki zwalnia `BattleRunner` i odpina walkę od renderera; sam renderer z atlasem żyje do końca sesji.

Pomiar z 2026-10-02 (Edge 154 headless): sterta JS po 5, 35 i 65 cyklach „wejdź do walki, wyjdź” to 9157, 9261 i 9310 KB, czyli ok. 1,6–3,5 KB na cykl przy ok. 20 KB zajmowanych przez jedną walkę. Walki nie wyciekają.

### 6.2 Zapis

Jeden obiekt w `localStorage`, dostęp wyłącznie przez moduł zapisu:

```ts
interface SaveV4 {
  saveVersion: 4;
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

Wersja 1 trzymała stan per linia (`lines`) i id linii w składzie; migracja `1 → 2` zamienia każdą linię na jednego bohatera. Wersja 2 trzymała formę jako indeks 0/1; migracja `2 → 3` zamienia go na id jednostki (`<linia>_a`, `<linia>_b`), bo formy tworzą teraz drzewo (ADR 0016). Wersja 4 ma ten sam kształt co 3, ale inne linie: migracja `3 → 4` przenosi bohaterów dawnych linii `guard` i `cleric` do szczepów `swordsman` i `archer`, a formy-kopie z testowych drzew zamienia na prawdziwe formy tej samej postaci (M5j).

- Wczytanie (`game/save.ts`): parsowanie → łańcuch migracji `vN → vN+1` (`save-migrations.ts`) → walidacja Zod. Błąd na dowolnym etapie: uszkodzony zapis trafia pod klucz kopii zapasowej `five-fangs.save.backup`, gra startuje z nowym zapisem i informuje gracza.
- Po wczytaniu `reconcileSave` dopasowuje zapis do treści gry: usuwa bohaterów nieistniejących linii, runy i poziomy, których już nie ma, przycina liczniki, naprawia skład; zapis bez żadnego bohatera dostaje bohaterów startowych. Zmiana treści między wersjami nie wymaga więc migracji, dopóki nie zmienia się kształt zapisu i dopóki gracz niczego przez nią nie traci. Gdy treść usuwa linię albo formę, którą gracz mógł mieć, potrzebna jest migracja, która wskaże następcę: `reconcileSave` potrafi tylko usunąć bohatera nieistniejącej linii i cofnąć nieznaną formę do bazowej (tak powstała wersja 4).
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
| Mapa (ekran główny) | `MapScreen.tsx`, `MapTrail.tsx`, `WorldNav.tsx`, `trail-layout.ts`, `Settings.tsx` | Nazwa gry w rogu, złoto, z boku małe przyciski Skład, Bohaterowie, Sklep, Ustawienia. Jeden świat naraz (ADR 0022): u góry nazwa świata i rząd sześciu kłów, po jednym na świat (`data-state`: `cleared`, `open`, `locked`; kieł pokazywanego świata jest większy i ma `aria-pressed`), przy lewej i prawej krawędzi sceny duże strzałki do sąsiedniego świata (na pierwszym i ostatnim nieaktywne); strzałki i kły wołają `game.openWorld`. Poziomy świata jako nieregularne kafle na szlaku, którego kształt zależy od świata (`tileSpots(liczba, świat)` w `trail-layout.ts`: czysta geometria w procentach pola mapy, z testem); kafel ma `data-state`, zablokowany jest przygaszony, ale da się go wybrać, ukończony ma odcisk kła. Tabliczka wybranego poziomu: nazwa, nagroda, najlepszy czas. Pod linią podłogi: podpis pod każdą postacią (nazwa i prostokąt z liczbą wzmocnień: zielony u bohaterów gracza, czerwony u przeciwników), przycisk walki; przy zablokowanym poziomie przycisk jest nieaktywny, a pod nim stoi, który poziom trzeba przejść najpierw. Bez zmiany składu. Ustawienia to okno nad mapą: język, eksport i import zapisu, reset z potwierdzeniem, raport błędu, wersja gry |
| Skład | `SquadScreen.tsx`, `HeroField.tsx`, `RunePicker.tsx`, `HeroCard.tsx` | Każdy bohater ma pole na scenie: u góry nazwa i gniazda run (okrągłe żetony: zielony życie, czerwony atak, z premią), pod kłem slotu pasek ulepszeń bieżącej formy i przycisk „Kup” z kosztem ulepszenia albo „Ewolucja” z jej kosztem. Gniazdo otwiera okienko z paletą wolnych run. Bohatera łapie się za postać, nazwę albo kieł. Arkusz „Poza składem”: tytuł (obok niego tylko ostrzeżenie o pustym składzie) i jeden rząd o stałej wysokości na miniaturki bohaterów (nazwa formy w najwyżej dwóch wierszach, plakietka „+N” ulepszeń); pusty rząd pokazuje przerywany zarys miejsca, a nadmiar bohaterów przewija się w bok (także kółkiem myszy), więc arkusz nigdy nie zmienia wysokości. Karta wybranego bohatera tylko do czytania: miniaturka, nazwa, statystyki z podglądem następnego zakupu, przycisk „i” wyjaśniający wartości po strzałkach. Zasady ekranu pod przyciskiem „i” przy tytule |
| Bohaterowie | `HeroesScreen.tsx`, `FoeTribe.tsx` | Zakładki z nazwami szczepów; drzewo ewolucji jako siatka (kolumna to stopień, rozwidlenie zajmuje wiersze gałęzi) z miniaturką każdej formy i kosztami ewolucji; postacie drogi przez wybraną formę na scenie, pod nimi nazwy i koszty; karta wybranej formy: miniaturka, stopień, skąd się bierze i za ile (forma bazowa ze sklepu, pozostałe z ewolucji), w co ewoluuje, statystyki względem formy, z której powstaje (z przyciskiem „i”), koszty ulepszeń. Zasady ulepszeń i ewolucji pod przyciskiem „i” przy tytule. Bez kupowania. Za szczepami bohaterów stoją zakładki **szczepów wrogów** (Akronix): zamiast drzewa poczet postaci w kolumnach stopni, na scenie stopień wybranej postaci po stronie przeciwnika (patrzy w lewo, czerwone paski życia), karta ze statystykami i cechami bez cen, kosztów i strzałek; okienko „i” mówi wtedy, że to wrogowie |
| Sklep | `ShopScreen.tsx` | Samo kupowanie: bohaterowie na sprzedaż stoją na scenie, pod każdym metka z nazwą, ceną i liczbą posiadanych. Zasady zakupu pod przyciskiem „i” przy tytule |
| Walka | `BattleScreens.tsx` | Nazwa poziomu i czas w lewym górnym rogu; pauza, prędkość x1/x2/x4 i wyjście w prawym; w dolnych rogach miniaturki żywych postaci (gracz z lewej, przeciwnik z prawej, w kolejności ze sceny). Nic więcej, bo gracz nie wpływa na walkę |
| Wynik | `BattleScreens.tsx` | Arkusz nad polem zakończonej walki: wygrana albo powód przegranej, czas, nagrody, jeden przycisk OK wracający na mapę |

- **Brama** (ADR 0015): `ui/gate.ts` to kolejność ruchów (fazy `open`, `closing`, `closed`, `opening`; `pass(zmiana)` zamyka, w zamknięciu zmienia scenę, czeka i otwiera; wywołanie w trakcie ruchu jest pomijane), `ui/Gate.tsx` to rysunek SVG i ruch na Web Animations API. Przejścia przez bramę zaczynają przyciski „Graj”, „Walcz”, „Wyjdź” i „OK”; koniec walki zamyka bramę z `App`, który obserwuje scenę. Pod bramą scena ma atrybut `inert`. Walkę wstrzymuje `StageControls.held` (osobno od pauzy gracza), dopóki brama nie jest otwarta.
- **Szata graficzna** (ADR 0015): papierowe rekwizyty na jednej scenie. Okna, przyciski i kafle mają teksturę starego papieru z `ui/paper.ts` (szum SVG w adresie `data:`, ustawiany jako zmienne CSS `--paper-grain` i `--paper-stains`, a dla kafli jako wzór `#ff-paper` z `PaperDefs.tsx`). Style leżą w `ui/styles/`, po pliku na odpowiedzialność: `base.css` (czcionki, paleta, podstawy), `components.css` (wspólne klasy `btn`, `sheet`, kolory run, tabela statystyk), `map.css`, `squad.css`, `screens.css` (sklep, bohaterowie, ekran startowy, walka, wynik), `dialogs.css` (ustawienia, komunikaty, przycisk „i” i jego okienko); znaki SVG, w tym kształt kła, w `ui/icons.tsx`. Czcionki leżą w `src/assets/fonts/` i przechodzą przez Vite; licencje w `public/licenses/`.
- **Miniaturka** (`Portrait.tsx`, ADR 0017) to mały canvas w okienku z kolorem nieba sceny; rysuje go `StageControls.paintPortrait`, gdy grafiki są wczytane, i ponownie przy zmianie jednostki. Jest ozdobą (`aria-hidden`): nazwę postaci podaje element, w którym siedzi. Przeciwnik w walce jest odbity w poziomie stylem, tak jak na scenie. Poległy w walce zostaje w drzewie z `data-alive="false"`: styl przewraca jego miniaturkę i zsuwa rząd do rogu, a przy ograniczonym ruchu miniaturka znika od razu.
- Przeciąganie (`drag.ts`) działa na Pointer Events, więc mysz i dotyk idą tym samym kodem. Cel upuszczenia to element z atrybutem `data-drop`; stan przeciągania niesie cel pod wskaźnikiem, więc slot docelowy się podświetla. Bohater ze składu jedzie po scenie za wskaźnikiem (`movePreviewUnit`), bohater spoza składu ma przy wskaźniku swoją miniaturkę z nazwą. Upuszczenie na zajęty slot zamienia bohaterów miejscami, na arkusz „Poza składem” zdejmuje bohatera ze składu.
- Bez przeciągania: kliknięcie postaci wybiera bohatera, kliknięcie pustego slotu stawia na nim wybranego, strzałki w lewo i w prawo przestawiają bohatera z fokusem o jeden slot, a Delete zdejmuje go ze składu.
- Gdy z formy wychodzi kilka dróg ewolucji, przycisk zakupu otwiera `EvolvePicker.tsx`: drogi obok siebie, każda z miniaturką i nazwą formy, najważniejszymi statystykami po ewolucji i cechami. Okienka run i ewolucji dzielą zachowanie (`FieldPopup.tsx`).
- Okienka nigdy nie wychodzą poza scenę: po wyświetleniu `useKeepInside` (`ui/keep-inside.ts`) mierzy okienko i jego ekran, wsuwa je do środka z marginesem, a gdy jest wyższe niż scena, ogranicza wysokość i przewija treść. Położenie zapisuje w procentach, więc zostaje poprawne przy skalowaniu sceny z oknem, i przelicza je przy każdej zmianie rozmiaru okienka (treść, język, czcionka). Okno ustawień (`<dialog>` w górnej warstwie przeglądarki) ma wysokość ograniczoną wysokością sceny.
- **Przycisk „i”** (`InfoButton.tsx`, ADR 0015): zasady ekranów i wyjaśnienia kart nie stoją na scenie, tylko czekają w okienku pod okrągłym przyciskiem. `ScreenHead` przyjmuje `info` (akapity) i stawia przycisk przy tytule; karty wstawiają `InfoButton` w nagłówku. Otwarte jest najwyżej jedno okienko: jego stan to sygnał modułu, a rysuje je `InfoOutlet`, jeden raz w warstwie sceny w `App.tsx` (przyciski siedzą w arkuszach, które przycinają zawartość, więc okienko nie może być ich dzieckiem). Miejsce okienka to środek i dolna krawędź przycisku w ułamkach sceny; resztę robi `useKeepInside`. Zamyka je ten sam przycisk, Escape, wciśnięcie wskaźnika gdziekolwiek indziej (kliknięcie działa dalej normalnie), zmiana opisywanej treści i zniknięcie przycisku. Fokus zostaje na przycisku (`aria-expanded`), a okienko siedzi w stałym regionie `role="status"`, więc czytnik ekranu odczytuje treść po otwarciu.
- Pola bohaterów, gniazda run i przyciski zakupu istnieją tylko na ekranie składu; mapa i walka pokazują samą postać. Co da się kupić i jakie runy są wolne, liczy `game/hero-options.ts` (`nextPurchase`, `runeStock`). Okienko run zamyka się po wyborze, Escape albo kliknięciem obok; fokus wraca do gniazda.
- Ekrany otwierane z mapy mają wspólny nagłówek (`ScreenHead`) z przyciskiem „Wróć”, tytułem, przyciskiem „i” z zasadami ekranu i złotem. Nie ma przejść między nimi na skróty.
- Wszystkie teksty przez `t(key)`; nazwy jednostek, poziomów i światów przez `tName` z kluczem z `content/i18n/keys.ts`. Słowniki w `content/i18n`.
- Rozmiary są w `em` względem czcionki sceny, a położenie elementów stojących na scenie w procentach jej szerokości i wysokości (linia podłogi to zmienna `--floor`), więc UI skaluje się razem z canvasem i trafia pod postacie.
- Style w wierszu ustawia tylko Preact przez CSSOM, co dopuszcza CSP `style-src 'self'`.
- Ustawienia to natywne okno modalne `<dialog>`: przeglądarka trzyma w nim fokus, zamyka je na Escape i wyłącza resztę strony. Arkusz wyniku ustawia fokus na przycisku OK. Fokus z klawiatury ma widoczną obwódkę, a animacje wyłącza `prefers-reduced-motion`.
- HUD odświeża się, gdy zmienia się sekunda walki, pauza albo prędkość, a miniaturki w rogach, gdy ktoś ginie; nic nie odświeża się co klatkę.
- UI nie importuje z `sim`; typ specyfikacji jednostki i wynik walki dostaje z `game`.

## 8. Narzędzia (`src/tools`, `scripts/`)

- `tools.html` + `src/tools.ts`: osobne wejście, serwowane tylko przez `pnpm dev`. Build produkcyjny ma jedno wejście (`index.html`), więc kod narzędzi nie trafia do `dist/`; CI dodatkowo sprawdza brak jego śladów (ADR 0010).
- Piaskownica walki (`/tools.html`): dowolne jednostki z treści na dowolnych slotach obu stron, ranga per jednostka, pauza, prędkość, krokowanie tick po ticku. Stan jest w adresie strony: `player`, `enemy` (składy), `tick=N` (przewinięcie i zatrzymanie), `debug=pgo` (nakładki), `setup=<JSON>` (gotowe wejście symulacji, np. z raportu błędu albo z `pnpm battle golden:<nazwa> --link`).
- Nakładki debug (`render/debug.ts`, klawisze P, G, O w piaskownicy): punkty obrotu i ramki części, zasięgi i cele, pomiary (FPS, czas symulacji i renderu, liczba wywołań rysowania). Cały kod debug jest w gałęziach `import.meta.env.DEV` i nie trafia do builda; `pnpm check:dist` szuka jego znacznika.
- Podgląd atlasu (`/tools.html?view=atlas`): obraz atlasu w trzech wariantach.
- Pomiar renderera (`/tools.html?view=perf`): czas klatki, alokacje i płynność odtwarzania na walce 5 na 5; metoda i wyniki w §5.7.
- Tło w narzędziach: piaskownica i pomiar renderera przyjmują w adresie `backdrop=<id>` (jedno z teł światów, `src/tools/backdrop-param.ts`); bez parametru albo dla nieznanego id rysują tło zamku.
- Edytor animacji (`/tools.html?view=anim`, `src/tools/anim/`): podgląd postaci tą samą ścieżką rysowania co w walce (`sampleClip` → macierze kości → `drawRigParts`), wybór rigu, skórki, postawy i klipu, suwak i pole liczbowe na każdy kanał, ścieżka klatek kluczowych per kanał (kliknięcie ustawia czas, przeciągnięcie przesuwa klatkę), znaczniki, odtwarzanie w pętli z zadanym czasem trwania.
  - Suwak ustawia wartość w bieżącym czasie i tworzy tam klatkę, jeśli jej nie ma. Operacje na klipie (`clip-edit.ts`) utrzymują reguły walidatora: klatka w czasie 0, przy kilku klatkach także w czasie 1, rosnące czasy, równe końce w klipie zapętlonym. Klip po dowolnej edycji jest więc poprawny.
  - Panel na bieżąco pokazuje wynik `validateContent` dla treści gry z podmienionym rigiem, w tym niezgodność znacznika `hit` z `hitFraction` ataków używających klipu.
  - Eksport to wpis do obiektu `clips` w `rigs/<rig>.json`, w układzie tego pliku; import przyjmuje taki wpis albo sam obiekt klipu. Edytor nie zapisuje plików: klip wkleja się do pliku rigu ręcznie.
  - Stan początkowy z adresu: `clip`, `skin`, `stance`, `t`, `pivots=1`.
- `scripts/balance.ts` (`pnpm balance`): balans poziomów (ADR 0025). Miarą jest złoto: `scripts/lib/reference-plan.ts` wylicza, co skład odniesienia ma za złoto zdobyte przed poziomem (najpierw brakujący bohaterowie, potem równy rozwój, zawsze całe złoto), a `scripts/lib/balance.ts` rozgrywa dla każdego poziomu trzy walki: tym składem bez run, z runami zdobytymi wcześniej (życie od frontu, atak od tyłu) i składem sprzed poprzedniej nagrody. Zwykły poziom jest „zgodny”, gdy pierwsza walka to wygrana, a trzecia przegrana; boss i poziomy po zamknięciu rozwoju składu, gdy bez run jest przegrana, a z runami wygrana. Raport w `reports/balance.md`, bez daty. Test `scripts/lib/level-rules.test.ts` pilnuje reguł autora na treści gry: suma i wzrost nagród, liczba wrogów, kolejność Akronixów, Axiny jako bossowie i ocena „zgodny” na każdym poziomie.
- `scripts/balance-heroes.ts` (`pnpm balance:heroes`): balans bohaterów (ADR 0024). Dla każdej formy pojedynki z pozostałymi formami tego samego stopnia, z obu stron pola, i wartość w drużynie (forma w trójce ludzi swojego stopnia przeciw takiej samej trójce); dla drużyn pokazowych szczepów walki 5 na 5 bez ulepszeń i z kompletem. Raport w `reports/heroes.md`, bez daty. Logika leży w `scripts/lib/hero-balance.ts`, a test obok niej pilnuje reguł autora: ludzie słabsi od szczepów ze szkiców, żaden szczep ze szkiców nie wygrywa ani nie przegrywa ze wszystkimi, postacie walczące wręcz w skali szybkości 40–130.
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
| End-to-end | `tests/e2e/*.spec.ts`, `pnpm test:e2e` | Playwright na buildzie produkcyjnym z `vite preview` (te same nagłówki i CSP co na hostingu): nowa gra, walka do końca, nagroda w zapisie, postęp po przeładowaniu, ulepszenie, przeciąganie w składzie, zmiana języka, uszkodzony zapis, miniaturki postaci (narysowane poza składem i w drzewie, znikające po śmierci w walce); konsola bez błędów |
