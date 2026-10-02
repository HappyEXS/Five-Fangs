# Game Design – Five Fangs

Źródło prawdy o zasadach gry. Implementację opisuje [ARCHITECTURE.md](ARCHITECTURE.md), kolejność prac [ROADMAP.md](ROADMAP.md). Wartości liczbowe oznaczone jako „wyjściowe” są punktem startu do balansu, nie ustaleniem.

## 1. Pętla gry

1. Gracz wybiera poziom na mapie (5 światów po 6 poziomów, odblokowywane kolejno).
2. Układa skład: do 5 bohaterów na 5 slotach, każdemu może włożyć do 2 run.
3. Walka toczy się automatycznie. Gracz nie ma wpływu na jej przebieg; może ją tylko wstrzymać, zmienić prędkość odtwarzania (x1/x2/x4) albo wyjść.
4. Wygrana daje złoto, czasem runę lub nową linię bohaterów, i odblokowuje następny poziom.
5. Złoto idzie na ulepszenia i ewolucje bohaterów.

W walce **nie ma losowości**: ten sam skład na tym samym poziomie zawsze daje ten sam wynik. Gra jest więc bliższa łamigłówce: przegrana oznacza, że trzeba zmienić skład, ustawienie, runy albo ulepszyć bohaterów.

## 2. Pole walki

- Jednowymiarowe: jednostka ma tylko pozycję `x` na osi o szerokości 1000 jednostek świata. Oś Y istnieje wyłącznie w rendererze.
- Gracz startuje po lewej i idzie w prawo, przeciwnik odwrotnie.
- 5 slotów na stronę; slot 0 jest najbliżej środka (front). Wyjściowo: gracz `x = 400, 340, 280, 220, 160`, przeciwnik `x = 600, 660, 720, 780, 840`.
- Slot wyznacza **wyłącznie pozycję startową**. Nie ma premii za front, tył ani sąsiedztwo. Znaczenie taktyczne wynika z reguł: wróg atakuje najbliższego, więc front przyjmuje ciosy pierwszy.
- Sojusznicy się mijają, nachodzą na siebie, podchodzą do przeciwnika aby zadać obrażenia w swoim zasięgu.
- Jednostki przeciwnych drużyn nigdy się nie mijają.

## 3. Statystyki jednostki

| Statystyka | Jednostka w danych | Opis |
|---|---|---|
| `maxHp` | punkty | Życie |
| `attack` | punkty | Obrażenia jednego trafienia |
| `moveSpeed` | jednostki świata / s | Szybkość ruchu |
| `attackSpeed` | ataki / s | Wyznacza odstęp między początkami ataków |
| `range` | jednostki świata | Odległość, z której jednostka może zacząć atak; melee ok. 30, ranged ok. 150–250 |
| `knockback` | jednostki świata | Odrzut: siła odpychania trafionego wroga i zarazem opór przed byciem odepchniętym (sekcja 4.6); ranged zwykle mało albo 0 |
| `kind` | `melee` \| `ranged` | Ranged wystrzeliwuje pocisk zamiast trafiać bezpośrednio |
| `attackType` | id | Typ ataku: czas zamachu, moment trafienia, klip animacji, parametry pocisku |
| `traits` | lista | Cechy pasywne (sekcja 6) |

Pancerza, krytyków, uników, many i cooldownów umiejętności nie ma.

### Typ ataku

Typ ataku ma **stały czas zamachu** (`swingDuration`, np. 0,4 s) i `hitFraction` (np. 0,5), czyli moment trafienia lub wystrzału w ułamku zamachu. `attackSpeed` wyznacza tylko odstęp między początkami kolejnych ataków. Po zamachu jednostka jest wolna (może iść albo czekać w idle) do końca odstępu.

Odstęp nie może być krótszy niż zamach; walidator treści odrzuca takie dane. Gracz widzi w UI wartości efektywne, po zaokrągleniu do ticków.

### Wartości wyjściowe jednostek testowych (M1–M4)

Do czasu zaprojektowania rosteru (M5) gra zawiera jednostki testowe: dwie linie bohaterów po dwie formy i jednego wroga. Ich nazwy i liczby są tymczasowe.

| Jednostka | `maxHp` | `attack` | `moveSpeed` | `attackSpeed` | `range` | `knockback` | Atak i cechy |
|---|---|---|---|---|---|---|---|
| swordsman_a (melee) | 600 | 40 | 60 | 1,0 | 30 | 15 | slash: zamach 0,4 s, trafienie 0,5 |
| swordsman_b (melee) | 900 | 60 | 60 | 1,1 | 30 | 20 | slash |
| archer_a (ranged) | 350 | 30 | 50 | 0,8 | 220 | 0 | shoot: zamach 0,6 s, wystrzał 0,5, pocisk 400 jedn./s |
| archer_b (ranged) | 500 | 45 | 50 | 0,9 | 240 | 0 | shoot, `pierce` |
| brute (wróg, melee) | 800 | 35 | 45 | 0,7 | 30 | 25 | slash |

Testowy świat ma 6 poziomów z osiłkami o rosnącym poziomie siły; szósty to boss (osiłek poziomu 12 z obstawą). Trudność rośnie tu przez cały zakres ulepszeń (rangi oczekiwane 0, 2, 4, 5, 7, 9 obu bohaterów), więc nagrody są ustawione tak, by pierwsze przejście poziomu opłacało rangę potrzebną na następnym: 260, 600, 500, 1400, 2600 i 500 złota.

## 4. Przebieg walki

Symulacja działa w stałym kroku 30 ticków na sekundę. Każdy tick ma te same fazy, w tej kolejności.

### 4.1 Decyzje

Każda żywa jednostka, która nie jest w trakcie zamachu:

- wybiera cel: **najbliższego żywego wroga**; przy równej odległości wygrywa niższe `unitId`;
- jeśli cel jest w zasięgu i minął odstęp od poprzedniego ataku, zaczyna atak;
- jeśli cel jest w zasięgu, ale odstęp jeszcze trwa, stoi;
- w przeciwnym razie idzie w stronę celu.

Na czas zamachu cel jest zablokowany, a jednostka nie rusza się i nie zmienia celu.

### 4.2 Ruch

Jednostka idąca przesuwa się w stronę celu o swój krok, ale nie dalej niż do granicy zasięgu. Sojusznicy nie blokują się nawzajem: mogą się mijać i stać w tym samym miejscu, więc ruch każdej jednostki jest niezależny od pozostałych.

### 4.3 Ataki

Liczniki zamachów rosną. W ticku trafienia:

- **melee**: obrażenia i odrzut trafiają do kolejki dla zablokowanego celu, jeśli ten wciąż żyje, niezależnie od tego, jak daleko jest w tej chwili (także po odrzuceniu poza zasięg). Jeśli cel zginął w trakcie zamachu, cios chybia, a zamach dobiega końca.
- **ranged**: powstaje pocisk w pozycji strzelca, lecący w stronę wroga. Powstaje także wtedy, gdy cel już nie żyje.

### 4.4 Pociski

Pocisk jest **fizyczny**: to punkt lecący ze stałą prędkością po osi, aż do krawędzi pola walki. Nie śledzi celu.

- Zwykły pocisk trafia **pierwszego żywego wroga na drodze** (remis pozycji → niższe `unitId`) i znika.
- Pocisk z cechą `pierce` trafia **każdego wroga, którego minie**, każdego najwyżej raz, i leci dalej.
- Jeśli pierwotny cel zginie w locie, pocisk po prostu leci dalej i trafia następnego wroga na drodze.
- Pocisk żyje dalej po śmierci strzelca.
- Pocisk wystrzelony w danym ticku porusza się już w tym samym ticku.

Obrażenia i odrzut pocisku to `attack` i `knockback` strzelca z chwili wystrzału. Pocisk przebijający odrzuca każdego trafionego wroga.

### 4.5 Cechy okresowe

Cechy działające co interwał (np. leczenie) dopisują swój efekt do kolejki.

### 4.6 Rozstrzygnięcie

Wszystkie obrażenia, leczenie i odrzut z tego ticka nakładane są **jednocześnie**:

```
hp = min(maxHp, hp − suma_obrażeń + suma_leczenia)
```

Kolejność jednostek nie daje przewagi. Dwie jednostki mogą zabić się nawzajem w tym samym ticku. Leczenie z tego samego ticka może uratować jednostkę przed śmiercią. Martwych jednostek nie da się uleczyć.

Formuła obrażeń: **obrażenia = `attack`**, bez modyfikatorów.

**Odrzut.** Każde trafienie (cios melee albo pocisk) odpycha trafionego o:

```
przesunięcie = max(0, knockback atakującego − knockback trafionego)
```

- Ta sama statystyka służy do odpychania i do opierania się. Ciężka jednostka odpycha lżejsze, a sama stoi; przy równych wartościach nikt się nie rusza.
- Jednostka jest odpychana w stronę własnej krawędzi pola (bohater w lewo, wróg w prawo), najdalej do tej krawędzi.
- Kilka trafień w jednym ticku sumuje przesunięcia.
- Przesunięcie jest natychmiastowe. Sojusznicy stojący za odrzuconym go nie zatrzymują.
- Odrzut **nie wpływa na ataki**: nie przerywa zamachu odrzuconej jednostki i nie sprawia, że trwający cios w nią chybi. Jego skutkiem jest zmiana pozycji: odrzucony (albo atakujący) musi potem podejść, zanim zacznie kolejny atak, a pociski mają do niego dalej.
- `knockback` nie rośnie z ulepszeniami.

### 4.7 Śmierć i koniec walki

Jednostka z `hp ≤ 0` ginie. Walka kończy się, gdy:

| Sytuacja | Wynik |
|---|---|
| Wszyscy wrogowie martwi, żyje co najmniej jeden bohater | Wygrana |
| Wszyscy bohaterowie martwi | Przegrana |
| Obie strony giną w tym samym ticku | Przegrana |
| Upłynęło 90 s (2700 ticków) | Przegrana |

Pociski w locie w chwili końca walki nie mają znaczenia.

## 5. Bohaterowie i progresja

### 5.1 Linie i formy

- **6 linii bohaterów, każda z 2 formami** (bazowa i ewolucja): łącznie 12 jednostek gracza.
- Forma po ewolucji to **inny bohater**: własne części graficzne, własne statystyki bazowe, może mieć inny typ ataku i inne cechy. Obie formy dzielą rig i klipy animacji.
- Gracz zaczyna z 3 liniami. Linie 4, 5 i 6 odblokowują się po pokonaniu bossów światów 1, 2 i 3.
- **Stan na teraz (decyzja autora z 2026-10-02):** gra ma dwie linie testowe, miecznika i łucznika; pozostałe linie autor uzupełni przy wykańczaniu gry. Forma po ewolucji obu linii ma inny typ ataku niż forma bazowa, żeby dało się przetestować wszystkie mechaniki.

### 5.2 Ulepszenia i ewolucja

Ścieżka jednej linii:

```
A0 → A1 → A2 → A3 → A4 → [ewolucja] → B0 → B1 → B2 → B3 → B4
```

- Ulepszenie kosztuje złoto i zwiększa `maxHp` oraz `attack` o 10% wartości bazowej formy (wyjściowo). Pozostałe statystyki się nie zmieniają.
- Po 4 ulepszeniach formy bazowej dostępna jest **ewolucja**: osobny zakup za złoto, zamienia bohatera na formę drugą bez ulepszeń (B0).
- Forma druga ma kolejne 4 ulepszenia. Dalszej ewolucji nie ma.
- Ulepszenia i ewolucja są nieodwracalne.

Koszty (wyjściowe, do balansu w M5): ulepszenia formy A `50, 80, 120, 180`, ewolucja `250`, ulepszenia formy B `300, 400, 550, 750`.

### 5.3 Runy

- Runa to żeton z płaską premią do jednej statystyki, np. `attack +25` albo `maxHp +200`. Na start runy dotyczą tylko `attack` i `maxHp`.
- Każda linia ma **2 sloty na runy**; sloty zostają po ewolucji.
- Runy są nagrodą za **pierwsze przejście** wybranych poziomów. Nie da się ich kupić. Wyjściowo runę daje co drugi poziom, czyli ok. 15 run w całej grze.
- Runy można dowolnie wkładać, wyjmować i przekładać między bohaterami, bez kosztu.
- Premia z runy dodaje się po przeliczeniu ulepszeń. Runy nie mają poziomów i się nie zużywają.
- Run nie widać na postaci; nie ma przedmiotów ani ich grafik.

### 5.4 Złoto

- Jedyna waluta. Źródło: nagrody za poziomy. Odpływ: ulepszenia i ewolucje. Sklepu nie ma.
- Pierwsze przejście poziomu daje pełną nagrodę. Każda powtórka daje 25% złota i nic poza tym.
- Wynik walki jest powtarzalny, więc powtórka poziomu składem, który już wygrał, to pewne złoto. Ułamek 25% ma sprawić, że farmienie jest możliwe, ale wolniejsze niż postęp.

## 6. Cechy pasywne

Jednostka może mieć kilka cech różnych typów, najwyżej jedną danego typu. Cechy nie wymagają decyzji gracza, nie mają many ani cooldownów aktywowanych ręcznie.

| Cecha | Parametry | Działanie |
|---|---|---|
| `periodicHeal` | `target`: `self` \| `team`; `amount`; `interval` (s) | Co `interval` leczy siebie albo wszystkich żywych sojuszników (wraz z sobą) o `amount`. Licznik biegnie od początku walki. |
| `pierce` | brak | Pociski tej jednostki przebijają: trafiają każdego wroga na drodze. Tylko dla ranged. |

Zestaw cech jest **zamknięty**: każda cecha to wariant w schemacie danych plus kod w symulacji z testami. Dodanie nowej cechy to świadoma zmiana symulacji (nowe hashe golden), a nie konfiguracja. Wrogowie i bossowie korzystają z tych samych cech.

## 7. Poziomy i światy

- **5 światów po 6 poziomów.** Każdy świat ma własne tło i własny zestaw wrogów.
- Szósty poziom świata to **boss**: większa jednostka z unikalną cechą lub kombinacją cech, zwykle z obstawą.
- Poziomy odblokowują się kolejno. Przeszły poziom można powtarzać.
- Poziom to skład wrogów na slotach, z poziomem siły każdej jednostki, oraz nagrody:

```json
{
  "id": "w2_l1",
  "enemies": [
    { "slot": 0, "unit": "brute", "level": 7 },
    { "slot": 1, "unit": "brute", "level": 7 },
    { "slot": 3, "unit": "archer", "level": 6 }
  ],
  "rewards": { "gold": 120, "rune": "rune_attack_25" }
}
```

Poziomy jednego świata leżą w jednym pliku, w kolejności odblokowywania. Nazwa poziomu to tekst `level.<id>.name` w słownikach, nazwa świata `world.<id>.name`.

`level` wroga skaluje `maxHp` i `attack` tak samo jak ulepszenia bohatera: +10% wartości bazowej na poziom (wyjściowo, `upgradePercent` w `progression.json`), z zaokrągleniem w dół.

## 8. Prezentacja

- Widok z boku, animacja wycinankowa (cutout). Grafika gładka, rysowana w 2× rozdzielczości logicznej 1280×720.
- Każda postać ma animacje: idle, chód, atak, błysk przy trafieniu, śmierć (obrót wokół stóp i zanikanie).
- Liczby obrażeń i leczenia unoszą się nad postacią i zanikają.
- Desktop jest platformą główną (mysz, duży ekran). Telefon w poziomie ma działać, bez gwarancji wygody.
- Języki: polski i angielski.
- Dźwięk: brak do M6; potem efekty walki i UI, bez muzyki.

## 9. Kwestie otwarte

Do rozstrzygnięcia z autorem gry; do tego czasu nie zgadujemy.

| Kwestia | Stan |
|---|---|
| Roster: pozostałe cztery linie bohaterów | Autor uzupełni przy wykańczaniu gry; do tego czasu grają dwie linie testowe |
| Motywy, wrogowie i bossowie światów 2–5 | Autor poda później; do tego czasu istnieje jeden świat testowy „Las” |
| Ostateczne koszty ulepszeń, nagrody i ułamek za powtórki | Po ustaleniu pełnego rosteru, na podstawie raportu balansu |
| Czy gra może być osadzana na innych stronach (`frame-ancestors`) | Przed premierą |
| Hosting publiczny | Przed premierą (M6) |

Rozstrzygnięte 2026-10-02:

- Nowe cechy pasywne: `splash`, `lifesteal`, `enrage` (sekcja 6).
- Runy obejmują tylko `attack` i `maxHp`, w trzech wielkościach każdej statystyki.
- Wrogami na poziomach mogą być zwykłe postacie z gry (formy bohaterów) oraz jednostki specjalne, których gracz nie może zdobyć ani ewoluować.
