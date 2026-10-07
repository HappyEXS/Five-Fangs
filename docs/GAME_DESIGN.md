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
| `attackSpeed` albo `attackInterval` | ataki / s albo sekundy między atakami | Tempo ataków: odstęp między początkami kolejnych ataków. Dane podają jedno z dwóch pól; szkice autora podają odstęp („Atk: 3,0” to atak co 3 s) |
| `range` | jednostki świata | Odległość, z której jednostka może zacząć atak; melee ok. 30, ranged ok. 150–250 |
| `knockback` | jednostki świata | Odrzut: siła odpychania trafionego wroga i zarazem opór przed byciem odepchniętym (sekcja 4.6); ranged zwykle mało albo 0 |
| `kind` | `melee` \| `ranged` | Ranged wystrzeliwuje pocisk zamiast trafiać bezpośrednio |
| `attackType` | id | Typ ataku: czas zamachu, moment trafienia, klip animacji, parametry pocisku |
| `traits` | lista | Cechy pasywne (sekcja 6) |

Pancerza, krytyków, uników, many i cooldownów umiejętności nie ma.

### Typ ataku

Typ ataku ma **stały czas zamachu** (`swingDuration`, np. 0,4 s) i `hitFraction` (np. 0,5), czyli moment trafienia lub wystrzału w ułamku zamachu. `attackSpeed` wyznacza tylko odstęp między początkami kolejnych ataków. Po zamachu jednostka jest wolna (może iść albo czekać w idle) do końca odstępu.

Odstęp nie może być krótszy niż zamach; walidator treści odrzuca takie dane. Gracz widzi w UI wartości efektywne, po zaokrągleniu do ticków.

### Jednostki specjalne świata „Las”

Wrogowie, których gracz nie zdobywa. Nazwy i liczby są tymczasowe; balans pilnuje `pnpm balance`. Bohaterów opisują kolejne sekcje, po jednej na szczep.

| Jednostka | `maxHp` | `attack` | `moveSpeed` | `attackSpeed` | `range` | `knockback` | Typ ataku i cechy |
|---|---|---|---|---|---|---|---|
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

`cleave` (wolniejszy, mocniejszy cios) i `snipe` (dłuższe celowanie, szybsza strzała) to ataki gałęzi Zbrojnego i Strzelca; pozostałe formy ludzi biją `slash` i strzelają `shoot`.

### Szczepy Mieczników i Łuczników

Decyzja autora gry z 2026-10-06: dawne cztery linie ludzi (Miecznicy, Łucznicy, Tarczownicy, Akolici) to dwa szczepy po siedem form, a dotychczasowe warianty są ich ewolucjami. Autor wybrał układ, w którym Rycerz, Strażnik, Strzelec wyborowy i Kapłan są formami końcowymi; brakujące formy (po trzy na szczep) i wszystkie liczby poniżej zaproponował wykonawca i są **robocze**. Wygląd: proste ludziki w dotychczasowym stylu, każda forma w innym kolorze (decyzja autora; styl „mroczna baśń” dotyczy czterech pozostałych szczepów).

**Miecznicy** (linia `swordsman`, startowa). Miecznik → Zbrojny albo Tarczownik; Zbrojny → Rycerz albo Berserker; Tarczownik → Strażnik albo Pawężnik. Gałąź Zbrojnego bije, gałąź Tarczownika wytrzymuje.

| Forma | Stopień | `maxHp` | `attack` | `moveSpeed` | Tempo ataków | `range` | `knockback` | Typ ataku i cechy |
|---|---|---|---|---|---|---|---|---|
| Miecznik `swordsman_a` | bazowa | 600 | 40 | 60 | 1,0 na s | 30 | 15 | `slash` |
| Zbrojny `swordsman_b` (nowa nazwa) | 1 | 950 | 85 | 60 | 0,8 na s | 30 | 25 | `cleave`, `splash` 45 |
| Tarczownik `guard_a` | 1 | 1300 | 28 | 45 | 0,8 na s | 30 | 35 | `slash` |
| Rycerz `swordsman_b2` | 2, ze Zbrojnego | 1300 | 115 | 60 | 0,8 na s | 30 | 30 | `cleave`, `splash` 60 |
| Berserker `berserker` (nowa) | 2, ze Zbrojnego | 1000 | 80 | 70 | 1,2 na s | 30 | 20 | `slash`, `enrage` poniżej 50%: +80% |
| Strażnik `guard_b` | 2, z Tarczownika | 2300 | 50 | 45 | 0,8 na s | 30 | 45 | `slash`, `periodicHeal` siebie: 45 co 3 s |
| Pawężnik `pavise_guard` (nowa) | 2, z Tarczownika | 1900 | 45 | 45 | 0,8 na s | 30 | 110 | `slash`, `shield` 35 |

**Łucznicy** (linia `archer`, startowa). Łucznik → Strzelec albo Akolita; Strzelec → Strzelec wyborowy albo Łowca; Akolita → Kapłan albo Inkwizytor. Gałąź Strzelca zadaje obrażenia z daleka, gałąź Akolity wspiera.

| Forma | Stopień | `maxHp` | `attack` | `moveSpeed` | Tempo ataków | `range` | `knockback` | Typ ataku i cechy |
|---|---|---|---|---|---|---|---|---|
| Łucznik `archer_a` | bazowa | 350 | 30 | 50 | 0,8 na s | 220 | 0 | `shoot` |
| Strzelec `archer_b` (nowa nazwa) | 1 | 480 | 75 | 50 | 0,6 na s | 300 | 0 | `snipe`, `pierce` |
| Akolita `cleric_a` | 1 | 420 | 20 | 50 | 0,8 na s | 170 | 0 | `shoot`, `periodicHeal` drużyny: 16 co 3 s |
| Strzelec wyborowy `archer_b2` | 2, ze Strzelca | 650 | 100 | 50 | 0,6 na s | 320 | 0 | `snipe`, `pierce` |
| Łowca `hunter` (nowa) | 2, ze Strzelca | 560 | 70 | 50 | 0,7 na s | 1000 (całe pole) | 0 | `snipe`, `targetLast` |
| Kapłan `cleric_b` | 2, z Akolity | 600 | 30 | 50 | 0,8 na s | 190 | 0 | `shoot`, `periodicHeal` drużyny: 28 co 2,5 s |
| Inkwizytor `inquisitor` (nowa) | 2, z Akolity | 520 | 55 | 50 | 0,8 na s | 220 | 0 | `shoot`, `lifesteal` 50% |

Skąd te liczby i nazwy:

- **Formy pośrednie.** Układ autora wymagał nowej formy przed Rycerzem i przed Strzelcem wyborowym. Zbrojny i Strzelec przejęły id, statystyki i cechy dotychczasowych form po pierwszej ewolucji (`swordsman_b`, `archer_b`), a Rycerz i Strzelec wyborowy to ich mocniejsze wersje (dawne „Rycerz II” i „Strzelec wyborowy II”, zaokrąglone; Rycerz ma szerszy cios, Strzelec wyborowy dłuższy zasięg). Dzięki temu główna droga obu szczepów, poziomy świata „Las” i raport balansu zostały bez zmian.
- **Tarczownik i Akolita** były formami bazowymi osobnych linii, a są pierwszymi ewolucjami, więc dostały trochę więcej (1100/22 → 1300/28; 320/14 → 420/20, leczenie 12 → 16). **Strażnik i Kapłan** przeszły o stopień wyżej i mają liczby dawnych wersji „II” (życie i atak ×1,35) z mocniejszym leczeniem.
- **Nowe formy końcowe** korzystają z cech, które gra już ma: Berserker z szału, Pawężnik z tarczy i dużego odrzutu, Łowca z celowania w koniec szyku, Inkwizytor z kradzieży życia.
- Koszty i cena linii (200) są takie same jak u pozostałych szczepów. Dawne linie Tarczowników i Akolitów kosztowały 300.

Obserwacje z walk próbnych, do decyzji autora przy balansie:

- Formy końcowe Mieczników w pojedynkę z Hersztem: Berserker wygrywa w 19 s, Rycerz w 26 s, Strażnik w 57 s, Pawężnik w 64 s (zostaje mu 160 z 1900 życia). Formy obronne wygrywają wolno; ich miejsce jest w drużynie, przed strzelcami.
- Strzelec wyborowy sam przegrywa z Hersztem (zadaje 1300 z jego 2200 życia): strzelcy potrzebują kogoś z przodu.
- Łowca zabija Szamana stojącego za Hersztem, zanim Herszt do niego dojdzie, ale potem ginie; w składzie zdejmuje wrogich strzelców i leczących.
- Inkwizytor pokonuje Osiłka i kończy z prawie pełnym życiem (483 z 520). Akolita sam z Osiłkiem przegrywa, Tarczownik wygrywa w 38 s.
- Pięć form końcowych (Rycerz, Berserker, Strażnik, Pawężnik, Kapłan) przechodzi poziom Herszta w 16 s bez strat.

### Szczep Beasts

Pierwszy z czterech szczepów autora gry (szkice z 2026-10-05; kolor szczepu: brąz, świat: „Jungle of doom”). Szczep to jedna linia bohaterów z drzewem siedmiu form: Monstrosity → Batfang albo Reaper; Batfang → Spiker albo Ironbeak; Reaper → Tuskovator albo Ignitix. Nazwy są własne i takie same w obu językach.

Życie, atak, szybkość ruchu („Spd”), odrzut („Ela”), rodzaj ataku, odstęp między atakami strzelców („Atk: 1,2” to atak co 1,2 s; odpowiedź autora z 2026-10-06, wcześniej odczytane odwrotnie) i cechy pochodzą ze szkiców. **Wartości robocze** (kursywa), których szkice nie podają: ataki na sekundę form walczących wręcz, zasięg strzelców, cena i koszty linii (te same co u pozostałych linii).

| Forma | Stopień | `maxHp` | `attack` | `moveSpeed` | Tempo ataków | `range` | `knockback` | Typ ataku i cechy |
|---|---|---|---|---|---|---|---|---|
| Monstrosity (melee) | bazowa | 200 | 30 | 25 | *1,0 na s* | 30 | 50 | `slash` |
| Batfang (ranged) | 1 | 350 | 35 | 10 | co 1,2 s | *220* | 30 | `fang_spit` |
| Reaper (melee) | 1 | 400 | 50 | 30 | *1,2 na s* | 30 | 10 | `slash` |
| Spiker (ranged) | 2, z Batfanga | 700 | 40 | 15 | co 1,0 s | *240* | 10 | `spike_volley`, `periodicHeal` siebie: 25 co 1 s |
| Ironbeak (melee) | 2, z Batfanga | 900 | 80 | 100 | *1,0 na s* | 30 | 180 | `peck` |
| Tuskovator (melee) | 2, z Reapera | 800 | 90 | 30 | *0,7 na s* | 30 | 225 | `gore` |
| Ignitix (ranged) | 2, z Reapera | 1000 | 100 | 5 | co 0,8 s | 1000 (całe pole) | 50 | `fire_spit`, `targetLast` |

| Typ | Zamach | Trafienie | Klip, postawa | Pocisk |
|---|---|---|---|---|
| `peck` | 0,45 s | 0,5 | `peck`, `beast` | brak |
| `gore` | 0,8 s | 0,6 | `gore`, `beast` | brak |
| `fang_spit` | 0,5 s | 0,5 | `spit`, `beast` | kieł, 420 jedn./s |
| `spike_volley` | 0,6 s | 0,5 | `volley`, `beast` | kolec, 450 jedn./s |
| `fire_spit` | 0,7 s | 0,5 | `spit`, `beast` | kula ognia, 380 jedn./s |

Wygląd: bestie stoją na dwóch nogach na szkielecie ludzi (wybór autora), z własnymi częściami i czterema nowymi klipami ataku (ADR 0018). Obserwacje z walk próbnych, do decyzji autora przy balansie:

- Bestie chodzą 2–12 razy wolniej niż ludzie (45–60). Strzelcy o szybkości 10–15 często nie dochodzą na zasięg, zanim walka się rozstrzygnie, zwłaszcza gdy Ironbeak albo Tuskovator odrzucają wroga coraz dalej.
- Odrzut 180 i 225 przesuwa trafionego o jedną piątą pola; Tuskovator o szybkości 30 długo dochodzi potem do odrzuconego wroga, więc bije rzadziej, niż wynika z 0,7 ataku na sekundę.
- Monstrosity (200 życia) i Batfang przegrywają w pojedynkę z Osiłkiem z pierwszego poziomu. Ignitix sam pokonuje Herszta w 17 s; Spiker przegrywa z nim po 40 s.

### Szczepy Immortals, Plants i Robots

Trzy kolejne szczepy autora gry (szkice z 2026-10-05). Każdy to jedna linia z drzewem siedmiu form; nazwy są własne i takie same w obu językach. Zasady odczytu szkiców są te same co u bestii: życie, atak, szybkość ruchu, odrzut, rodzaj ataku, odstęp między atakami strzelców i zdolności pochodzą ze szkiców, a **wartości robocze** (kursywa) to ataki na sekundę form walczących wręcz, zasięg strzelców, cena i koszty linii.

Ustalenia z autorem (2026-10-05):

- **„Atk: X” to sekundy między atakami** (odpowiedź z 2026-10-06): Ultimus z „Atk: 3,0” atakuje raz na 3 sekundy, Mother-tree z „Atk: 2,0” przyzywa co 2 sekundy.
- **Szansa to rytm.** „50% chance of dealing double damage” to cecha `doubleDamage` 50 (co drugi atak), „70% chance of avoiding enemy attack” to `dodge` 70 (§6).
- **Tarcza to mniejsze obrażenia:** „50% shield” to `shield` 50.
- **Postać o szybkości 0 strzela przez całe pole** (`range` 1000) i przez całą walkę stoi w swoim slocie; odrzut dalej ją przesuwa. Walidator treści odrzuca jednostkę bez ruchu o krótszym zasięgu.
- **„Attacks all enemies” Toxic Ivy** to pocisk z cechą `pierce`: chmura zarodników przechodzi przez wszystkich wrogów na drodze.
- **Mother-tree** (druga forma końcowa Trunka) przyzywa krzaki na osobne miejsca, do pięciu naraz ponad skład (§4.8, ADR 0020).

**Immortals** (kolor szczepu: złoto, świat: „Tower of time”). Orb → Cardinal albo Guardian of hell; Cardinal → Polaris albo Ultimus; Guardian of hell → Xartix albo Enigmatix.

| Forma | Stopień | `maxHp` | `attack` | `moveSpeed` | Tempo ataków | `range` | `knockback` | Typ ataku i cechy |
|---|---|---|---|---|---|---|---|---|
| Orb (ranged) | bazowa | 350 | 35 | 15 | co 1,5 s | *240* | 10 | `orb_gaze` |
| Cardinal (ranged) | 1 | 450 | 45 | 10 | co 1,0 s | *260* | 20 | `cardinal_gaze` |
| Guardian of hell (melee) | 1 | 400 | 60 | 30 | *1,0 na s* | 30 | 10 | `gore` |
| Polaris (ranged) | 2, z Cardinala | 1100 | 50 | 0 | *1,0 na s* | 1000 (całe pole) | 30 | `star_cast` |
| Ultimus (ranged) | 2, z Cardinala | 1250 | 250 | 30 | co 3,0 s | *260* | 50 | `ray_flare` |
| Xartix (melee) | 2, z Guardiana | 850 | 90 | 75 | *1,2 na s* | 30 | 75 | `slash`, `doubleDamage` 50 |
| Enigmatix (melee) | 2, z Guardiana | 1000 | 160 | 65 | *0,8 na s* | 30 | 100 | `cleave`, `shield` 50 |

**Plants** (kolor szczepu: jasna zieleń, świat: „Living swamps”). Bush → Trunk albo Ivy; Trunk → Oak warrior albo Mother-tree; Ivy → Ice Ivy albo Toxic Ivy.

| Forma | Stopień | `maxHp` | `attack` | `moveSpeed` | Tempo ataków | `range` | `knockback` | Typ ataku i cechy |
|---|---|---|---|---|---|---|---|---|
| Bush (ranged) | bazowa | 400 | 15 | 0 | co 1,5 s | 1000 (całe pole) | 10 | `bush_thorn` |
| Trunk (ranged) | 1 | 600 | 30 | 25 | co 1,5 s | *240* | 10 | `seed_cast` |
| Ivy (ranged) | 1 | 500 | 40 | 0 | co 1,7 s | 1000 (całe pole) | 30 | `ivy_thorn` |
| Oak warrior (melee) | 2, z Trunka | 1250 | 150 | 40 | *0,6 na s* | 30 | 300 | `cleave` |
| Mother-tree (summoning) | 2, z Trunka | 10 000 | 0 | 0 | co 2,0 s (przyzwanie) | 1000 (całe pole) | 40 | `summon`: przyzywa „Bush ver. 2” |
| Bush ver. 2 (melee, przyzywany) | – | 100 | 20 | 30 | *1,0 na s* | 30 | 0 | `peck`; nie jest bohaterem |
| Ice Ivy (ranged) | 2, z Ivy | 900 | 20 | 0 | co 2,0 s | 1000 (całe pole) | 10 | `frost_spit`, `periodicHeal` drużyny: 50 co 1 s |
| Toxic Ivy (ranged) | 2, z Ivy | 800 | 10 | 0 | co 1,0 s | 1000 (całe pole) | 30 | `spore_spit`, `pierce` |

**Robots** (kolor szczepu: niebieski, świat: „Mechanus town”). Bot → Egzo-bot albo Holo-bot; Egzo-bot → Thermobot albo Ax-bot; Holo-bot → Whirl-bot albo Titan-bot.

| Forma | Stopień | `maxHp` | `attack` | `moveSpeed` | Tempo ataków | `range` | `knockback` | Typ ataku i cechy |
|---|---|---|---|---|---|---|---|---|
| Bot (melee) | bazowa | 200 | 25 | 50 | *1,0 na s* | 30 | 15 | `jab` |
| Egzo-bot (melee) | 1 | 400 | 40 | 70 | *1,2 na s* | 30 | 25 | `slash` |
| Holo-bot (ranged) | 1 | 300 | 30 | 0 | co 1,0 s | 1000 (całe pole) | 30 | `glitch_spit` |
| Thermobot (ranged) | 2, z Egzo-bota | 900 | 100 | 80 | co 1,0 s | *220* | 25 | `slag_cast` |
| Ax-bot (melee) | 2, z Egzo-bota | 750 | 75 | 80 | *0,8 na s* | 30 | 40 | `cleave`, `doubleDamage` 20 |
| Whirl-bot (melee) | 2, z Holo-bota | 700 | 70 | 175 | *1,5 na s* | 30 | 30 | `slash`, `dodge` 70 |
| Titan-bot (melee) | 2, z Holo-bota | 1200 | 75 | 40 | *0,7 na s* | 30 | 70 | `gore`, `shield` 10 |

Nowe typy ataków (wszystkie z postawą `beast`, trafienie w połowie zamachu):

| Typ | Zamach | Klip | Pocisk |
|---|---|---|---|
| `jab` | 0,45 s | `jab` | brak |
| `orb_gaze` | 0,5 s | `spit` | spojrzenie, 420 jedn./s |
| `cardinal_gaze` | 0,6 s | `cast` | spojrzenie, 440 jedn./s |
| `star_cast` | 0,6 s | `cast` | odłamek gwiazdy, 480 jedn./s |
| `ray_flare` | 0,9 s | `flare` | promień, 700 jedn./s |
| `bush_thorn`, `ivy_thorn` | 0,5 s | `spit` | cierń, 420 i 440 jedn./s (różnią się wysokością wylotu) |
| `seed_cast` | 0,6 s | `cast` | kolczaste nasiono, 400 jedn./s |
| `frost_spit` | 0,45 s | `spit` | odłamek lodu, 460 jedn./s |
| `spore_spit` | 0,6 s | `spit` | chmura zarodników, 300 jedn./s |
| `glitch_spit` | 0,5 s | `spit` | zakłócenie, 520 jedn./s |
| `slag_cast` | 0,6 s | `cast` | żużel, 380 jedn./s |
| `summon` | 0,5 s | `summon` | brak; w połowie zamachu przyzwanie |

Wygląd: wszystkie trzy szczepy i przerysowane bestie mają styl „mroczna baśń” (ADR 0019). Obserwacje z walk próbnych, do decyzji autora przy balansie:

- **Strzelcy biją rzadko.** Po poprawce odczytu „Atk:” obrażenia na sekundę strzelców to m.in.: Bush 10, Orb 23, Ivy 24, Holo-bot 30, Cardinal 45, Ultimus 83, Thermobot 100. Ultimus sam pokonuje Herszta w 25 s (zostaje mu 278 z 1250 życia), ale z całym poziomem Herszta przegrywa.
- **Mother-tree** przyzywa krzak co 2 s, więc pięć miejsc zapełnia się po ok. 8 s. Sama pokonuje dwóch Osiłków i Zbója w 31 s, tracąc 1600 z 10 000 życia; z poziomem Herszta przegrywa po 78 s, bo wróg przebija się przez krzaki szybciej, niż ona je rodzi.
- Postacie stojące (Bush, Ivy, obie formy końcowe Ivy, Holo-bot, Polaris) strzelają od pierwszej sekundy. Skład samych roślin wygrywa poziom Herszta w 41 s: najwięcej zadaje Oak warrior (2850), z pnączy Toxic Ivy (1530, bo jej pocisk trafia wszystkich). Stojące giną, gdy wróg do nich dojdzie: Polaris sam przegrywa z Hersztem i Osiłkiem.
- **Formy bazowe trzech szczepów przegrywają w pojedynkę z Osiłkiem** z pierwszego poziomu: Orb, Bush i Bot; tak samo pierwsze ewolucje Ivy, Trunk i Holo-bot. Cardinal wygrywa.
- Whirl-bot z unikiem 70 na 100 wygrywa sam z dwoma Osiłkami i Zbójem, tracąc 405 z 700 życia. Titan-bot z tarczą 10% przegrywa z Hersztem (zadaje 1725 z jego 2200 życia).
- Oak warrior odrzuca o 300 jednostek, prawie jedną trzecią pola: po każdym ciosie idzie do wroga od nowa.

## 4. Przebieg walki

Symulacja działa w stałym kroku 30 ticków na sekundę. Każdy tick ma te same fazy, w tej kolejności.

### 4.1 Decyzje

Każda żywa jednostka, która nie jest w trakcie zamachu:

- wybiera cel: **najbliższego żywego wroga**; przy równej odległości wygrywa niższe `unitId`. Jednostka z cechą `targetLast` wybiera zamiast tego **ostatniego żywego wroga w szyku** (stojącego najdalej; remis pozycji → niższe `unitId`);
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
- **przyzywacz**: zamiast ciosu przyzywa jednostkę (§4.8).

### 4.4 Pociski

Pocisk jest **fizyczny**: to punkt lecący ze stałą prędkością po osi, aż do krawędzi pola walki. Nie śledzi celu.

- Zwykły pocisk trafia **pierwszego żywego wroga na drodze** (remis pozycji → niższe `unitId`) i znika.
- Pocisk z cechą `pierce` trafia **każdego wroga, którego minie**, każdego najwyżej raz, i leci dalej.
- Pocisk jednostki z cechą `targetLast` jest **wycelowany**: mija wszystkich wrogów poza tym, w którego strzelec celował na początku zamachu, i trafia tylko jego. Jeśli ten cel zginął (w trakcie zamachu albo lotu), pocisk nikogo nie trafia i leci do krawędzi pola. Na ekranie taki pocisk leci łukiem nad mijanymi wrogami.
- Jeśli pierwotny cel zginie w locie, pocisk po prostu leci dalej i trafia następnego wroga na drodze.
- Pocisk żyje dalej po śmierci strzelca.
- Pocisk wystrzelony w danym ticku porusza się już w tym samym ticku.

Obrażenia i odrzut pocisku to `attack` i `knockback` strzelca z chwili wystrzału. Pocisk przebijający odrzuca każdego trafionego wroga.

### 4.5 Cechy okresowe

Cechy działające co interwał (np. leczenie) dopisują swój efekt do kolejki. W tej samej fazie tykają **obrażenia w czasie** (krwawienie, trucizna; cechy `bleed` i `poison`, ADR 0021):

- Trafienie jednostki z taką cechą, które doszło celu, nakłada na trafionego efekt: co `interval` sekund traci `damage` życia, przez `duration` sekund. Pierwsze tyknięcie przychodzi pełny odstęp po trafieniu.
- Kolejne trafienie **nie sumuje** efektu: odnawia liczbę tyknięć, a rytm tyknięć biegnie dalej. Po ostatnim trafieniu efekt tyka jeszcze pełną liczbę razy.
- Jednostka może mieć naraz jedno krwawienie i jedną truciznę; działają obok siebie. W obrębie rodzaju słabsze trafienie niczego nie zmienia, a równe albo silniejsze przejmuje efekt.
- Tyknięcie to nie trafienie: nie odrzuca, nie da się go uniknąć i nie daje kradzieży życia. Tarcza trafionego zmniejsza je tak jak ciosy.
- Efekt trwa po śmierci tego, kto go nałożył, i jemu liczą się obrażenia; śmierć trafionego kończy efekt.

### 4.6 Rozstrzygnięcie

Wszystkie obrażenia, leczenie i odrzut z tego ticka nakładane są **jednocześnie**:

```
hp = min(maxHp, hp − suma_obrażeń + suma_leczenia)
```

Kolejność jednostek nie daje przewagi. Dwie jednostki mogą zabić się nawzajem w tym samym ticku. Leczenie z tego samego ticka może uratować jednostkę przed śmiercią. Martwych jednostek nie da się uleczyć.

Formuła obrażeń: **obrażenia = `attack`**, bez modyfikatorów poza cechami (szał, szarża, podwojenie w rytmie, tarcza trafionego; §6).

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
| Wszyscy wrogowie martwi (także przyzwani), żyje ktoś po stronie gracza | Wygrana |
| Po stronie gracza nie żyje nikt: ani bohater, ani przyzwany | Przegrana |
| Obie strony giną w tym samym ticku | Przegrana |
| Upłynęło 90 s (2700 ticków) | Przegrana |

Pociski w locie w chwili końca walki nie mają znaczenia.

### 4.8 Przyzywanie

Przyzywacz (na razie tylko Mother-tree) nie atakuje. Jego tempo ataków to tempo przyzwań: co odstęp zaczyna zamach i w chwili, w której zwykła jednostka zadałaby cios, przyzywa sojusznika (ADR 0020).

- **Gdzie.** Przyzwany staje w miejscu przyzywacza i od następnego ticka zachowuje się jak każda jednostka: wybiera cel, idzie, bije.
- **Ilu.** Każda strona ma pięć miejsc na przyzwanych, ponad pięć slotów składu i wspólnych dla wszystkich jej przyzywaczy. Gdy wszystkie są zajęte, przyzywacz czeka; gdy któryś przyzwany zginie, następny pojawia się po samym zamachu (odstęp biegnie także podczas czekania).
- **Kim są dla reszty.** Pełnoprawnymi jednostkami swojej strony: wróg celuje w najbliższego, także przyzwanego; trafiają ich pociski i ciosy obszarowe; obejmuje ich leczenie drużyny. Strona żyje, dopóki żyje ktokolwiek z niej, więc po śmierci bohaterów walkę mogą dokończyć przyzwani.
- **Ulepszenia.** Przyzwany rośnie z ulepszeniami przyzywacza tak jak on (10% życia i ataku na ulepszenie). Runy przyzywacza go nie dotyczą.
- **Wynik walki.** Obrażenia zadane przez przyzwanych liczą się przyzywaczowi.
- **Na ekranie.** Przyzwani mają krótszy pasek życia bez liczby i nie mają miniaturki w rogu ekranu.

Przyzwanie i śmierć rozstrzygają się razem z obrażeniami na końcu ticka: przyzwanie dochodzi do skutku także wtedy, gdy przyzywacz ginie w tym samym ticku.

## 5. Bohaterowie i progresja

### 5.1 Linie, formy i egzemplarze

- **Linia** to typ bohatera z **drzewem form** połączonych ewolucjami (decyzja autora z 2026-10-03, ADR 0016). Forma może ewoluować w jedną formę, w kilka do wyboru albo w żadną (koniec drogi).
- Forma po ewolucji to **inny bohater**: własne części graficzne, własne statystyki bazowe, może mieć inny typ ataku i inne cechy. Wszystkie formy linii dzielą rig i klipy animacji.
- Gracz posiada **egzemplarze** bohaterów (decyzja autora z 2026-10-02). Każdy egzemplarz ma własne ulepszenia, formę i runy. Tej samej linii można mieć kilka egzemplarzy i wystawić ich w składzie obok siebie.
- Gracz zaczyna z dwoma bohaterami: po jednym z każdej linii startowej (Miecznik i Łucznik). Kolejnych kupuje w sklepie (sekcja 5.5).
- **Szczepy** (decyzje autora z 2026-10-05 i 2026-10-06): roster to sześć szczepów, każdy jako jedna linia z drzewem siedmiu form (forma bazowa, dwie pierwsze ewolucje, po dwie drugie ewolucje z każdej): Miecznicy, Łucznicy, Beasts, Immortals, Plants i Robots (sekcja 3). Każdy szczep ma nazwę w słowniku (`line.<id>.name`), którą nosi jego zakładka w „Bohaterach”.
- **Stan na teraz:** szczepy startowe to Miecznicy i Łucznicy. Dawne linie Tarczowników i Akolitów weszły do nich jako gałęzie (Tarczownik → Strażnik albo Pawężnik; Akolita → Kapłan albo Inkwizytor); zapisy graczy przenosi migracja v3 → v4 (bohater zachowuje postać, ulepszenia i runy).

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
- Ceny wyjściowe: każdy szczep 200 za formę bazową.

Nagrody świata „Las” są policzone tak, by pierwsze przejścia opłacały ulepszenia dwóch bohaterów startowych. Zakup dodatkowych bohaterów wymaga więc powtarzania poziomów albo rezygnacji z części ulepszeń; ceny i nagrody do korekty przy docelowym balansie.

## 6. Cechy pasywne

Jednostka może mieć kilka cech różnych typów, najwyżej jedną danego typu. Cechy nie wymagają decyzji gracza, nie mają many ani cooldownów aktywowanych ręcznie.

| Cecha | Parametry | Działanie |
|---|---|---|
| `periodicHeal` | `target`: `self` \| `team`; `amount`; `interval` (s) | Co `interval` leczy siebie albo wszystkich żywych sojuszników (wraz z sobą) o `amount`. Licznik biegnie od początku walki. |
| `pierce` | brak | Pociski tej jednostki przebijają: trafiają każdego wroga na drodze. Tylko dla ranged. |
| `splash` | `radius` (jednostki świata) | Cios wręcz zadaje pełne obrażenia także każdemu innemu żywemu wrogowi, który stoi nie dalej niż `radius` od celu. Odrzut dostaje tylko cel. Jeśli cel zginął w trakcie zamachu, cios chybia w całości. Tylko dla melee. |
| `lifesteal` | `percent` (1–100) | Po każdym trafieniu, wręcz albo pociskiem, jednostka leczy się o `percent` procent obrażeń ciosu (zaokrąglenie w dół). Liczą się obrażenia ciosu, nie HP, które cel jeszcze miał. Leczenie wchodzi w rozstrzygnięcie tego samego ticka, więc może uratować przed śmiercią. Martwy strzelec nie leczy się z pocisków, które jeszcze lecą. |
| `targetLast` | brak | Jednostka celuje w ostatniego żywego wroga w szyku zamiast w najbliższego, a jej pocisk mija pozostałych i trafia tylko ten cel (sekcje 4.1 i 4.4). Strzela z miejsca: jej `range` musi obejmować całe pole, bo idąc do celu, minęłaby bliższych wrogów. Tylko dla ranged; nie łączy się z `pierce`. |
| `doubleDamage` | `percent` (1–100) | Podwójne obrażenia w **stałym rytmie**: `percent` na każde 100 ataków jest podwójnych, równo rozłożonych (50 to co drugi atak, zaczynając od drugiego; 20 to co piąty). Atak to cios wręcz, który doszedł celu, albo wystrzał; pocisk niesie obrażenia z chwili wystrzału, a cios obszarowy podwaja je wszystkim trafionym. Podwojenie liczy się po premii szału. |
| `dodge` | `percent` (1–99) | Unik w stałym rytmie: `percent` na każde 100 trafień jednostka unika w całości, bez obrażeń, odrzutu i kradzieży życia przez atakującego. Trafienia jednego ticka liczą się w kolejności `unitId` atakujących, potem pocisków. Zwykły pocisk, którego cel uniknął, znika; przebijający leci dalej. |
| `shield` | `percent` (1–99) | Tarcza: obrażenia każdego trafienia są mniejsze o `percent` procent (zaokrąglenie w dół). Nie zmienia odrzutu. Kradzież życia atakującego liczy obrażenia po tarczy. |
| `bleed`, `poison` | `damage`; `interval` (s, domyślnie 1); `duration` (s) | Obrażenia w czasie (§4.5): każde trafienie nakłada na trafionego krwawienie albo truciznę. Dwa rodzaje tego samego mechanizmu; jednostka może mieć jedną z tych cech. Obrażenia efektu nie rosną z ulepszeniami ani z poziomem wroga. |
| `charge` | `bonus` (procent) | Szarża: pierwszy atak jednostki w walce zadaje o `bonus` procent więcej (200 to cios potrójny). Atak to cios wręcz, który doszedł celu, albo wystrzał; zamach, którego cel zginął wcześniej, nie zużywa szarży, a unik trafionego ją zużywa. Premia liczy się po premii szału i przed podwojeniem z rytmu. |
| `enrage` | `hpBelow` (1–99, procent życia), `attackBonus` (procent) | Gdy HP jednostki jest niższe niż `hpBelow` procent `maxHp`, jej ataki zadają o `attackBonus` procent więcej (zaokrąglenie w dół). Liczy się HP z chwili trafienia wręcz albo wystrzału; pocisk niesie obrażenia z chwili wystrzału. Uleczenie powyżej progu kończy szał. |

**Szanse ze szkiców to rytm, nie los** (decyzja autora gry z 2026-10-05). Szkice postaci podają zdolności jako szanse („50% chance of dealing double damage”, „70% chance of avoiding enemy's attack”). Walka nie ma losowości, więc szansa `p`% oznacza w grze dokładnie `p` zdarzeń na każde 100, w stałej kolejności: licznik jednostki rośnie o `p` przy każdym ataku (trafieniu), a gdy osiągnie 100, zdarzenie zachodzi i licznik spada o 100. Gracz może ten rytm policzyć i na nim polegać.

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
| Roster: sześć szczepów po siedem form | W grze. Liczby Mieczników i Łuczników oraz ich sześć nowych form to propozycja wykonawcy (§3), do oceny autora; wartości robocze pozostałych szczepów wypisane w §3 |
| Koszty ewolucji i ulepszeń trzeciego stopnia | Liczby robocze, te same dla wszystkich szczepów (ewolucja 250 i 1200, ulepszenia 1000–2200) |
| Motywy, wrogowie i bossowie światów 2–5 | Autor poda później; do tego czasu istnieje jeden świat testowy „Las” |
| Ostateczne koszty ulepszeń, nagrody i ułamek za powtórki | Po ustaleniu pełnego rosteru, na podstawie raportu balansu |
| Czy gra może być osadzana na innych stronach (`frame-ancestors`) | Przed premierą |
| Hosting publiczny | Przed premierą (M6) |

Rozstrzygnięte 2026-10-02:

- Nowe cechy pasywne: `splash`, `lifesteal`, `enrage` (sekcja 6).
- Runy obejmują tylko `attack` i `maxHp`, w trzech wielkościach każdej statystyki.
- Wrogami na poziomach mogą być zwykłe postacie z gry (formy bohaterów) oraz jednostki specjalne, których gracz nie może zdobyć ani ewoluować.
