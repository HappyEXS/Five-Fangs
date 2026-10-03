# Game Design – Five Fangs

Źródło prawdy o zasadach gry. Implementację opisuje [ARCHITECTURE.md](ARCHITECTURE.md), kolejność prac [ROADMAP.md](ROADMAP.md). Wartości liczbowe oznaczone jako „wyjściowe” są punktem startu do balansu, nie ustaleniem.

## 1. Pętla gry

Gra otwiera się **ekranem startowym** z przyciskiem „Graj”. Ekranem głównym jest **mapa**: z niej gracz przechodzi do **składu**, **informacji o bohaterach** i **sklepu** i na nią wraca po każdej walce. Z tych trzech ekranów wraca się tylko na mapę.

1. Na **mapie** gracz wybiera poziom (5 światów po 6 poziomów, odblokowywane kolejno), widzi jego przeciwników i nagrody i zaczyna walkę bieżącym składem. Mapa nie pozwala zmieniać składu.
2. Na ekranie **składu** ustawia do 5 bohaterów na 5 slotach, ulepsza ich, ewoluuje i wkłada im runy (do 2 na bohatera).
3. W **sklepie** kupuje za złoto nowych bohaterów; sklep służy tylko do kupowania.
4. W **informacjach o bohaterach** ogląda obie formy każdej linii, ich statystyki i cechy oraz drogę ulepszeń i ewolucji z kosztami.
5. Walka toczy się automatycznie. Gracz nie ma wpływu na jej przebieg; może ją tylko wstrzymać, zmienić prędkość odtwarzania (x1/x2/x4) albo wyjść.
6. Wygrana daje złoto, czasem runę, i odblokowuje następny poziom. Po walce gra pokazuje wynik i nagrody; jedyny przycisk wraca na mapę.

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

### Jednostki testowe

Do czasu, aż autor gry uzupełni roster, gra zawiera dwie linie bohaterów po dwie formy oraz jednostki specjalne świata „Las”. Nazwy i liczby są tymczasowe; balans pilnuje `pnpm balance`.

| Jednostka | `maxHp` | `attack` | `moveSpeed` | `attackSpeed` | `range` | `knockback` | Typ ataku i cechy |
|---|---|---|---|---|---|---|---|
| Miecznik `swordsman_a` (melee) | 600 | 40 | 60 | 1,0 | 30 | 15 | `slash` |
| Rycerz `swordsman_b` (melee) | 950 | 85 | 60 | 0,8 | 30 | 25 | `cleave`, `splash` 45 |
| Łucznik `archer_a` (ranged) | 350 | 30 | 50 | 0,8 | 220 | 0 | `shoot` |
| Strzelec wyborowy `archer_b` (ranged) | 480 | 75 | 50 | 0,6 | 300 | 0 | `snipe`, `pierce` |
| Osiłek `brute` (specjalna, melee) | 800 | 35 | 45 | 0,7 | 30 | 25 | `slash` |
| Łupieżca `raider` (specjalna, melee) | 520 | 30 | 75 | 1,3 | 30 | 5 | `slash`, `lifesteal` 35% |
| Szaman `shaman` (specjalna, ranged) | 300 | 18 | 45 | 0,7 | 200 | 0 | `shoot`, `periodicHeal` drużyny: 18 co 2,5 s |
| Herszt `chieftain` (boss, melee) | 2200 | 60 | 40 | 0,6 | 30 | 40 | `cleave`, `splash` 40, `enrage` poniżej 50%: +60% |

Typy ataku:

| Typ | Zamach | Trafienie | Klip, postawa | Pocisk |
|---|---|---|---|---|
| `slash` | 0,4 s | 0,5 | `slash`, `sword` | brak |
| `cleave` | 0,7 s | 0,6 | `cleave`, `sword` | brak |
| `shoot` | 0,6 s | 0,5 | `shoot`, `bow` | 400 jedn./s |
| `snipe` | 0,9 s | 0,7 | `snipe`, `longbow` | 700 jedn./s |

Forma po ewolucji ma inny typ ataku niż forma bazowa: Rycerz bije wolniej, mocniej i obszarowo, Strzelec wyborowy celuje dłużej, a jego strzały lecą szybciej i przebijają.

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

### 5.1 Linie, formy i egzemplarze

- **Linia** to typ bohatera z **drzewem form** połączonych ewolucjami (decyzja autora z 2026-10-03, ADR 0016). Forma może ewoluować w jedną formę, w kilka do wyboru albo w żadną (koniec drogi).
- Forma po ewolucji to **inny bohater**: własne części graficzne, własne statystyki bazowe, może mieć inny typ ataku i inne cechy. Wszystkie formy linii dzielą rig i klipy animacji.
- Gracz posiada **egzemplarze** bohaterów (decyzja autora z 2026-10-02). Każdy egzemplarz ma własne ulepszenia, formę i runy. Tej samej linii można mieć kilka egzemplarzy i wystawić ich w składzie obok siebie.
- Gracz zaczyna z dwoma bohaterami: po jednym z każdej linii startowej (Miecznik i Łucznik). Kolejnych kupuje w sklepie (sekcja 5.5).
- **Stan na teraz:** linie startowe to miecznik i łucznik; w sklepie są dodatkowo dwie linie testowe, Tarczownik → Strażnik (dużo życia i odrzutu; Strażnik leczy sam siebie) oraz Akolita → Kapłan (leczenie drużyny). Docelowy roster autor uzupełni przy wykańczaniu gry. Forma po ewolucji miecznika i łucznika ma inny typ ataku niż forma bazowa.
- **Drzewa testowe** (z kopii obecnych bohaterów, do sprawdzenia rozgałęzień): każda linia ma drogę przez swoją dotychczasową formę po ewolucji i drugą drogę przez kopię formy po ewolucji innej linii (Miecznik → Rycerz albo Strażnik (kopia); Łucznik → Strzelec wyborowy albo Kapłan (kopia); Tarczownik → Strażnik albo Rycerz (kopia); Akolita → Kapłan albo Strzelec wyborowy (kopia)). Każda z tych form ma jeszcze jeden stopień: tę samą postać z życiem i atakiem ×1,35 („… II”).

### 5.2 Ulepszenia i ewolucja

Drzewo jednej linii (obecny kształt testowy):

```
                      ┌→ [ewolucja] → B0 … B4 → [ewolucja] → C0 … C4
A0 → A1 → … → A4 ─────┤
                      └→ [ewolucja] → B'0 … B'4 → [ewolucja] → C'0 … C'4
```

- Ulepszenie kosztuje złoto i zwiększa `maxHp` oraz `attack` o 10% wartości bazowej formy (wyjściowo). Pozostałe statystyki się nie zmieniają.
- Po 4 ulepszeniach bieżącej formy dostępna jest **ewolucja** w jedną z jej następnych form: osobny zakup za złoto (koszt zależy od formy docelowej), zamienia bohatera na tę formę bez ulepszeń. Gdy następnych form jest kilka, gracz wybiera jedną.
- Każda forma ma własne 4 ulepszenia. Forma bez następnych jest końcem drogi.
- Ulepszenia i ewolucja są nieodwracalne, także wybór drogi. Kto chce drugiej drogi, kupuje w sklepie kolejny egzemplarz linii.

Koszty (wyjściowe, do balansu): ulepszenia formy bazowej `50, 80, 120, 180`; ewolucja na drugi stopień `250`, jego ulepszenia `300, 400, 550, 750`; ewolucja na trzeci stopień `1200`, jego ulepszenia `1000, 1300, 1700, 2200` (trzeci stopień to na razie liczby robocze).

### 5.3 Runy

- Runa to żeton z płaską premią do jednej statystyki. Runy dotyczą tylko `attack` i `maxHp` i mają trzy wielkości: atak +10, +25, +50; życie +100, +200, +400 (decyzja autora z 2026-10-02).
- Każda linia ma **2 sloty na runy**; sloty zostają po ewolucji.
- Runy są nagrodą za **pierwsze przejście** wybranych poziomów. Nie da się ich kupić. Wyjściowo runę daje co drugi poziom, czyli ok. 15 run w całej grze.
- Runy można dowolnie wkładać, wyjmować i przekładać między bohaterami, bez kosztu.
- Premia z runy dodaje się po przeliczeniu ulepszeń. Runy nie mają poziomów i się nie zużywają.
- Run nie widać na postaci; nie ma przedmiotów ani ich grafik.

### 5.4 Złoto

- Jedyna waluta. Źródło: nagrody za poziomy. Odpływ: ulepszenia, ewolucje i zakupy bohaterów w sklepie.
- Pierwsze przejście poziomu daje pełną nagrodę. Każda powtórka daje 25% złota i nic poza tym.
- Wynik walki jest powtarzalny, więc powtórka poziomu składem, który już wygrał, to pewne złoto. Ułamek 25% ma sprawić, że farmienie jest możliwe, ale wolniejsze niż postęp.

### 5.5 Sklep

- Sklep sprzedaje bohaterów za złoto. Wszystkie linie są dostępne od początku gry; ogranicza tylko cena.
- Zakup daje nowy egzemplarz w formie bazowej, bez ulepszeń i run. Jeśli w składzie jest wolny slot, bohater od razu go zajmuje (pierwszy wolny od frontu); inaczej trafia poza skład.
- Tę samą linię można kupić wiele razy; każdy egzemplarz kosztuje tyle samo. Liczba posiadanych bohaterów nie ma limitu.
- Bohaterów nie da się sprzedać.
- Jednostek specjalnych (przeciwników takich jak Osiłek czy Herszt) nie ma w sklepie.
- Ceny wyjściowe: Miecznik i Łucznik 200, Tarczownik i Akolita 300.

Nagrody świata „Las” są policzone tak, by pierwsze przejścia opłacały ulepszenia dwóch bohaterów startowych. Zakup dodatkowych bohaterów wymaga więc powtarzania poziomów albo rezygnacji z części ulepszeń; ceny i nagrody do korekty przy docelowym balansie.

## 6. Cechy pasywne

Jednostka może mieć kilka cech różnych typów, najwyżej jedną danego typu. Cechy nie wymagają decyzji gracza, nie mają many ani cooldownów aktywowanych ręcznie.

| Cecha | Parametry | Działanie |
|---|---|---|
| `periodicHeal` | `target`: `self` \| `team`; `amount`; `interval` (s) | Co `interval` leczy siebie albo wszystkich żywych sojuszników (wraz z sobą) o `amount`. Licznik biegnie od początku walki. |
| `pierce` | brak | Pociski tej jednostki przebijają: trafiają każdego wroga na drodze. Tylko dla ranged. |
| `splash` | `radius` (jednostki świata) | Cios wręcz zadaje pełne obrażenia także każdemu innemu żywemu wrogowi, który stoi nie dalej niż `radius` od celu. Odrzut dostaje tylko cel. Jeśli cel zginął w trakcie zamachu, cios chybia w całości. Tylko dla melee. |
| `lifesteal` | `percent` (1–100) | Po każdym trafieniu, wręcz albo pociskiem, jednostka leczy się o `percent` procent obrażeń ciosu (zaokrąglenie w dół). Liczą się obrażenia ciosu, nie HP, które cel jeszcze miał. Leczenie wchodzi w rozstrzygnięcie tego samego ticka, więc może uratować przed śmiercią. Martwy strzelec nie leczy się z pocisków, które jeszcze lecą. |
| `enrage` | `hpBelow` (1–99, procent życia), `attackBonus` (procent) | Gdy HP jednostki jest niższe niż `hpBelow` procent `maxHp`, jej ataki zadają o `attackBonus` procent więcej (zaokrąglenie w dół). Liczy się HP z chwili trafienia wręcz albo wystrzału; pocisk niesie obrażenia z chwili wystrzału. Uleczenie powyżej progu kończy szał. |

Cechy się łączą: cios obszarowy jednostki w szale zadaje powiększone obrażenia wszystkim trafionym, a kradzież życia leczy za każdego z nich. Odległości ciosu obszarowego liczone są z pozycji z początku ticka.

Zestaw cech jest **zamknięty**: każda cecha to wariant w schemacie danych plus kod w symulacji z testami. Dodanie nowej cechy to świadoma zmiana symulacji (nowe hashe golden), a nie konfiguracja. Wrogowie i bossowie korzystają z tych samych cech.

## 7. Poziomy i światy

- **5 światów po 6 poziomów.** Każdy świat ma własne tło i własny zestaw wrogów. Na razie istnieje jeden świat testowy, „Las”; motywy pozostałych poda autor gry.
- Szósty poziom świata to **boss**: większa jednostka z unikalną cechą lub kombinacją cech, zwykle z obstawą.
- **Wrogami są zwykłe postacie z gry oraz jednostki specjalne.** Poziom może wystawić dowolną formę bohatera (np. Miecznika albo Rycerza) i jednostki, których gracz nie może zdobyć ani ewoluować (Osiłek, Łupieżca, Szaman, Herszt).
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

`level` wroga skaluje `maxHp` i `attack` tak samo jak ulepszenia bohatera: +10% wartości bazowej na poziom (wyjściowo, `upgradePercent` w `progression.json`), z zaokrągleniem w dół. Mapa pokazuje go tak samo jak ulepszenia bohatera, jako „+N” przy nazwie; wróg na poziomie 0 nie ma oznaczenia.

### Świat 1: Las (testowy)

| Poziom | Przeciwnicy (slot: jednostka, poziom siły) | Ranga oczekiwana | Złoto | Runa |
|---|---|---|---|---|
| Skraj lasu | 0: Osiłek 0 | A0 | 100 | |
| Zasadzka | 0: Miecznik 0; 2: Łucznik 0 | A1 | 400 | życie +100 |
| Obóz szamana | 0: Osiłek 4; 2: Szaman 4 | A3 | 860 | |
| Łupieżcy | 0, 1: Łupieżca 3; 3: Łucznik 3 | B0 | 1400 | atak +10 |
| Straż herszta | 0: Rycerz 1; 1: Osiłek 5; 3: Strzelec wyborowy 1 | B2 | 2600 | |
| Herszt | 0: Herszt 3; 1: Łupieżca 5; 3: Szaman 4 | B4 | 1000 | życie +200 |

Ranga oczekiwana to najniższa ranga obu bohaterów składu referencyjnego (Miecznik w slocie 1, Łucznik w slocie 2, bez run), przy której poziom da się wygrać; pilnuje jej raport `pnpm balance`. Złoto za pierwsze przejście poziomu wystarcza dokładnie na rangę oczekiwaną na następnym. Każda cecha pasywna występuje w tym świecie co najmniej raz.

## 8. Prezentacja

- Widok z boku, animacja wycinankowa (cutout). Grafika gładka, rysowana w 2× rozdzielczości logicznej 1280×720.
- **Scena jest płaska, bez perspektywy** (decyzja autora z 2026-10-02): wszystkie postacie stoją i chodzą dokładnie po linii podłogi, na jednej wysokości. Sloty w interfejsie leżą w jednym rzędzie.
- Interfejs to teatrzyk z wycinanek (ADR 0015): na każdym ekranie ta sama scena z linią podłogi, a przyciski, kafle mapy i karty to papierowe rekwizyty. Pięć kłów pod linią podłogi oznacza pięć slotów składu.
- Walkę oddziela od reszty gry metalowa brama: zamyka się po ekranie startowym, przed walką i po niej; wynik walki wisi na zamkniętej bramie (ADR 0015).
- Każda postać ma animacje: idle, chód, atak, błysk przy trafieniu, śmierć (obrót wokół stóp i zanikanie).
- Nad każdą postacią jest pasek życia z bieżącym życiem jako liczbą (decyzja autora z 2026-10-03: sam pasek nie pokazuje skali).
- Liczby obrażeń i leczenia unoszą się nad postacią i zanikają.
- Desktop jest platformą główną (mysz, duży ekran). Telefon w poziomie ma działać, bez gwarancji wygody.
- Języki: polski i angielski.
- Dźwięk: brak do M6; potem efekty walki i UI, bez muzyki.

## 9. Kwestie otwarte

Do rozstrzygnięcia z autorem gry; do tego czasu nie zgadujemy.

| Kwestia | Stan |
|---|---|
| Roster: pozostałe cztery linie bohaterów | Autor uzupełni przy wykańczaniu gry; do tego czasu grają dwie linie testowe |
| Docelowe drzewa ewolucji i koszty trzeciego stopnia | Autor poda razem z rosterem; do tego czasu drzewa z kopii (§5.1) |
| Motywy, wrogowie i bossowie światów 2–5 | Autor poda później; do tego czasu istnieje jeden świat testowy „Las” |
| Ostateczne koszty ulepszeń, nagrody i ułamek za powtórki | Po ustaleniu pełnego rosteru, na podstawie raportu balansu |
| Czy gra może być osadzana na innych stronach (`frame-ancestors`) | Przed premierą |
| Hosting publiczny | Przed premierą (M6) |

Rozstrzygnięte 2026-10-02:

- Nowe cechy pasywne: `splash`, `lifesteal`, `enrage` (sekcja 6).
- Runy obejmują tylko `attack` i `maxHp`, w trzech wielkościach każdej statystyki.
- Wrogami na poziomach mogą być zwykłe postacie z gry (formy bohaterów) oraz jednostki specjalne, których gracz nie może zdobyć ani ewoluować.
