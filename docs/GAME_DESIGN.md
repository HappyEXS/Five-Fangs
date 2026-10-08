# Game Design – Five Fangs

Źródło prawdy o zasadach gry. Implementację opisuje [ARCHITECTURE.md](ARCHITECTURE.md), kolejność prac [ROADMAP.md](ROADMAP.md). Wartości liczbowe oznaczone jako „wyjściowe” są punktem startu do balansu, nie ustaleniem.

## 1. Pętla gry

Gra otwiera się **ekranem startowym** z przyciskiem „Graj”. Ekranem głównym jest **mapa**: z niej gracz przechodzi do **składu**, **informacji o bohaterach** i **sklepu** i na nią wraca po każdej walce. Z tych trzech ekranów wraca się tylko na mapę.

1. Na **mapie** gracz wybiera poziom (6 światów po 6 poziomów, odblokowywane kolejno; strzałki po bokach mapy przełączają świat), widzi jego przeciwników i nagrody i zaczyna walkę bieżącym składem. Mapa nie pozwala zmieniać składu.
2. Na ekranie **składu** ustawia do 5 bohaterów na 5 slotach, ulepsza ich, ewoluuje i wkłada im runy (do 2 na bohatera).
3. W **sklepie** kupuje za złoto nowych bohaterów, a za żetony run odblokowuje runy w drzewku run; sklep służy tylko do tego.
4. W **informacjach o bohaterach** ogląda obie formy każdej linii, ich statystyki i cechy oraz drogę ulepszeń i ewolucji z kosztami.
5. Walka toczy się automatycznie. Gracz nie ma wpływu na jej przebieg; może ją tylko wstrzymać, zmienić prędkość odtwarzania (x1/x2/x4) albo wyjść.
6. Wygrana daje złoto, czasem żeton run, i odblokowuje następny poziom. Po walce gra pokazuje wynik i nagrody; jedyny przycisk wraca na mapę.

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

### Jednostki specjalne dawnego świata „Las”

Wrogowie, których gracz nie zdobywa. Pochodzą ze świata testowego „Las”, który ustąpił sześciu światom z §7: zostają w treści (piaskownica, testy), ale **nie stoją dziś na żadnym poziomie**. Nazwy i liczby są tymczasowe. Bohaterów opisują kolejne sekcje, po jednej na szczep.

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
| Miecznik `swordsman_a` | bazowa | 160 | 20 | 60 | 1,0 na s | 30 | 15 | `slash` |
| Zbrojny `swordsman_b` (nowa nazwa) | 1 | 320 | 40 | 60 | 0,8 na s | 30 | 25 | `cleave`, `splash` 45 |
| Tarczownik `guard_a` | 1 | 520 | 22 | 45 | 0,8 na s | 30 | 35 | `slash` |
| Rycerz `swordsman_b2` | 2, ze Zbrojnego | 700 | 80 | 60 | 0,8 na s | 30 | 30 | `cleave`, `splash` 60 |
| Berserker `berserker` (nowa) | 2, ze Zbrojnego | 580 | 55 | 70 | 1,2 na s | 30 | 20 | `slash`, `enrage` poniżej 50%: +80% |
| Strażnik `guard_b` | 2, z Tarczownika | 1150 | 35 | 45 | 0,8 na s | 30 | 45 | `slash`, `periodicHeal` siebie: 30 co 3 s |
| Pawężnik `pavise_guard` (nowa) | 2, z Tarczownika | 950 | 32 | 45 | 0,8 na s | 30 | 110 | `slash`, `shield` 35 |

**Łucznicy** (linia `archer`, startowa). Łucznik → Strzelec albo Akolita; Strzelec → Strzelec wyborowy albo Łowca; Akolita → Kapłan albo Inkwizytor. Gałąź Strzelca zadaje obrażenia z daleka, gałąź Akolity wspiera.

| Forma | Stopień | `maxHp` | `attack` | `moveSpeed` | Tempo ataków | `range` | `knockback` | Typ ataku i cechy |
|---|---|---|---|---|---|---|---|---|
| Łucznik `archer_a` | bazowa | 120 | 14 | 50 | 0,8 na s | 220 | 0 | `shoot` |
| Strzelec `archer_b` (nowa nazwa) | 1 | 200 | 28 | 50 | 0,6 na s | 280 | 0 | `snipe`, `pierce` |
| Akolita `cleric_a` | 1 | 190 | 12 | 50 | 0,8 na s | 170 | 0 | `shoot`, `periodicHeal` drużyny: 8 co 3 s |
| Strzelec wyborowy `archer_b2` | 2, ze Strzelca | 360 | 55 | 50 | 0,6 na s | 300 | 0 | `snipe`, `pierce` |
| Łowca `hunter` (nowa) | 2, ze Strzelca | 320 | 45 | 50 | 0,7 na s | 1000 (całe pole) | 0 | `snipe`, `targetLast` |
| Kapłan `cleric_b` | 2, z Akolity | 340 | 18 | 50 | 0,8 na s | 190 | 0 | `shoot`, `periodicHeal` drużyny: 16 co 2,5 s |
| Inkwizytor `inquisitor` (nowa) | 2, z Akolity | 340 | 40 | 50 | 0,8 na s | 220 | 0 | `shoot`, `lifesteal` 50% |

Skąd te liczby i nazwy:

- **Formy pośrednie.** Układ autora wymagał nowej formy przed Rycerzem i przed Strzelcem wyborowym. Zbrojny i Strzelec przejęły id, statystyki i cechy dotychczasowych form po pierwszej ewolucji (`swordsman_b`, `archer_b`), a Rycerz i Strzelec wyborowy to ich mocniejsze wersje (dawne „Rycerz II” i „Strzelec wyborowy II”, zaokrąglone; Rycerz ma szerszy cios, Strzelec wyborowy dłuższy zasięg). Dzięki temu główna droga obu szczepów, poziomy świata „Las” i raport balansu zostały bez zmian.
- **Tarczownik i Akolita** były formami bazowymi osobnych linii, a są pierwszymi ewolucjami, więc dostały trochę więcej (1100/22 → 1300/28; 320/14 → 420/20, leczenie 12 → 16). **Strażnik i Kapłan** przeszły o stopień wyżej i mają liczby dawnych wersji „II” (życie i atak ×1,35) z mocniejszym leczeniem.
- **Nowe formy końcowe** korzystają z cech, które gra już ma: Berserker z szału, Pawężnik z tarczy i dużego odrzutu, Łowca z celowania w koniec szyku, Inkwizytor z kradzieży życia.
- Koszty i cena linii (200) są takie same jak u pozostałych szczepów. Dawne linie Tarczowników i Akolitów kosztowały 300.

Liczby ludzi w tabelach to stan po balansie z 2026-10-07 (niżej, „Balans bohaterów”): życie i atak spadły do ok. 70% siły form innych szczepów na tym samym stopniu, słabsze jest też leczenie Strażnika, Akolity i Kapłana. Szybkość, tempo ataków, odrzut i zdolności zostały.

### Szczep Beasts

Pierwszy z czterech szczepów autora gry (szkice z 2026-10-05; kolor szczepu: brąz, świat: „Jungle of doom”). Szczep to jedna linia bohaterów z drzewem siedmiu form: Monstrosity → Batfang albo Reaper; Batfang → Spiker albo Ironbeak; Reaper → Tuskovator albo Ignitix. Nazwy są własne i takie same w obu językach.

Życie, atak, szybkość ruchu („Spd”), odrzut („Ela”), rodzaj ataku, odstęp między atakami strzelców („Atk: 1,2” to atak co 1,2 s; odpowiedź autora z 2026-10-06, wcześniej odczytane odwrotnie) i cechy pochodzą ze szkiców. **Wartości robocze** (kursywa), których szkice nie podają: ataki na sekundę form walczących wręcz, zasięg strzelców, cena i koszty linii (te same co u pozostałych linii).

| Forma | Stopień | `maxHp` | `attack` | `moveSpeed` | Tempo ataków | `range` | `knockback` | Typ ataku i cechy |
|---|---|---|---|---|---|---|---|---|
| Monstrosity (melee) | bazowa | 200 | 30 | 40 | *1,2 na s* | 30 | 50 | `slash` |
| Batfang (ranged) | 1 | 350 | 35 | 10 | co 1,2 s | *320* | 30 | `fang_spit` |
| Reaper (melee) | 1 | 400 | 50 | 50 | *1,4 na s* | 30 | 10 | `slash` |
| Spiker (ranged) | 2, z Batfanga | 700 | 40 | 15 | co 1,0 s | *340* | 10 | `spike_volley`, `periodicHeal` siebie: 25 co 1 s |
| Ironbeak (melee) | 2, z Batfanga | 900 | 80 | 100 | *1,2 na s* | 30 | 180 | `peck` |
| Tuskovator (melee) | 2, z Reapera | 800 | 90 | 50 | *1,0 na s* | 30 | 225 | `gore` |
| Ignitix (ranged) | 2, z Reapera | 1000 | 100 | 5 | co 0,8 s | 1000 (całe pole) | 50 | `fire_spit`, `targetLast` |

| Typ | Zamach | Trafienie | Klip, postawa | Pocisk |
|---|---|---|---|---|
| `peck` | 0,45 s | 0,5 | `peck`, `beast` | brak |
| `gore` | 0,8 s | 0,6 | `gore`, `beast` | brak |
| `fang_spit` | 0,5 s | 0,5 | `spit`, `beast` | kieł, 420 jedn./s |
| `spike_volley` | 0,6 s | 0,5 | `volley`, `beast` | kolec, 450 jedn./s |
| `fire_spit` | 0,7 s | 0,5 | `spit`, `beast` | kula ognia, 380 jedn./s |

Wygląd: bestie stoją na dwóch nogach na szkielecie ludzi (wybór autora), z własnymi częściami i czterema nowymi klipami ataku (ADR 0018). Modele były rysowane trzy razy; obecne powstały 2026-10-07 po ocenie autora, że poprzednie są „zbyt przyjazne, delikatne i dziecinne” przy Immortals, Plants i Robots (ADR 0019): sierść prawie czarna, pysk to ciemność z małymi światłami oczu i zębami, a rogi, kły, kolce i czaszki są ze starej kości. Monstrosity to kopiec kudłów z rogami, Batfang nietoperz-upiór z kłami dłuższymi od brody, Reaper lisia czaszka w kapturze z sierści z kościanymi sierpami, Spiker garb najeżony kolcami, Ironbeak sęp w żelaznej masce z dziobem jak sierp, Tuskovator paszcza jak pułapka z kłem wygiętym w hak, Ignitix zwęglony gad z żarem w pęknięciach. Obserwacje z walk próbnych, do decyzji autora przy balansie:

- Bestie walczące wręcz chodziły 2 razy wolniej niż ludzie (25–30 wobec 45–60); po balansie z 2026-10-07 mają 40–50, a strzelcy o szybkości 10–15 dostali zasięg, przy którym prawie nie muszą chodzić (niżej, „Balans bohaterów”).
- Odrzut 180 i 225 przesuwa trafionego o jedną piątą pola; Tuskovator po każdym ciosie musi dojść do odrzuconego wroga, więc w pojedynku bije rzadziej, niż wynika z tempa ataków. W drużynie bije wtedy następnego wroga z frontu.

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
| Cardinal (ranged) | 1 | 450 | 45 | 10 | co 1,0 s | *240* | 20 | `cardinal_gaze` |
| Guardian of hell (melee) | 1 | 400 | 60 | 45 | *1,0 na s* | 30 | 10 | `gore` |
| Polaris (ranged) | 2, z Cardinala | 1100 | 50 | 0 | *1,0 na s* | 1000 (całe pole) | 30 | `star_cast` |
| Ultimus (ranged) | 2, z Cardinala | 1250 | 250 | 30 | co 3,0 s | *220* | 50 | `ray_flare` |
| Xartix (melee) | 2, z Guardiana | 850 | 90 | 80 | *1,0 na s* | 30 | 75 | `slash`, `doubleDamage` 50 |
| Enigmatix (melee) | 2, z Guardiana | 1000 | 160 | 65 | *0,4 na s* | 30 | 100 | `cleave`, `shield` 50 |

**Plants** (kolor szczepu: jasna zieleń, świat: „Living swamps”). Bush → Trunk albo Ivy; Trunk → Oak warrior albo Mother-tree; Ivy → Ice Ivy albo Toxic Ivy.

| Forma | Stopień | `maxHp` | `attack` | `moveSpeed` | Tempo ataków | `range` | `knockback` | Typ ataku i cechy |
|---|---|---|---|---|---|---|---|---|
| Bush (ranged) | bazowa | 400 | 15 | 0 | co 1,5 s | 1000 (całe pole) | 10 | `bush_thorn` |
| Trunk (ranged) | 1 | 600 | 30 | 25 | co 1,5 s | *300* | 10 | `seed_cast` |
| Ivy (ranged) | 1 | 500 | 40 | 0 | co 1,7 s | 1000 (całe pole) | 30 | `ivy_thorn` |
| Oak warrior (melee) | 2, z Trunka | 1250 | 150 | 45 | *0,6 na s* | 30 | 300 | `cleave` |
| Mother-tree (summoning) | 2, z Trunka | 10 000 | 0 | 0 | co 2,0 s (przyzwanie) | 1000 (całe pole) | 40 | `summon`: przyzywa „Bush ver. 2” |
| Bush ver. 2 (melee, przyzywany) | – | 100 | 20 | 30 | *1,0 na s* | 30 | 0 | `peck`; nie jest bohaterem |
| Ice Ivy (ranged) | 2, z Ivy | 900 | 20 | 0 | co 2,0 s | 1000 (całe pole) | 10 | `frost_spit`, `periodicHeal` drużyny: 25 co 1 s (szkic: 50) |
| Toxic Ivy (ranged) | 2, z Ivy | 800 | 10 | 0 | co 1,0 s | 1000 (całe pole) | 30 | `spore_spit`, `pierce` |

**Robots** (kolor szczepu: niebieski, świat: „Mechanus town”). Bot → Egzo-bot albo Holo-bot; Egzo-bot → Thermobot albo Ax-bot; Holo-bot → Whirl-bot albo Titan-bot.

| Forma | Stopień | `maxHp` | `attack` | `moveSpeed` | Tempo ataków | `range` | `knockback` | Typ ataku i cechy |
|---|---|---|---|---|---|---|---|---|
| Bot (melee) | bazowa | 200 | 25 | 50 | *1,2 na s* | 30 | 15 | `jab` |
| Egzo-bot (melee) | 1 | 400 | 40 | 70 | *1,2 na s* | 30 | 25 | `slash` |
| Holo-bot (ranged) | 1 | 300 | 30 | 0 | co 1,0 s | 1000 (całe pole) | 30 | `glitch_spit` |
| Thermobot (ranged) | 2, z Egzo-bota | 900 | 100 | 80 | co 1,0 s | *200* | 25 | `slag_cast` |
| Ax-bot (melee) | 2, z Egzo-bota | 750 | 75 | 80 | *1,25 na s* | 30 | 40 | `cleave`, `doubleDamage` 20 |
| Whirl-bot (melee) | 2, z Holo-bota | 700 | 70 | 130 | *0,8 na s* | 30 | 30 | `slash`, `dodge` 70 |
| Titan-bot (melee) | 2, z Holo-bota | 1200 | 75 | 45 | *0,9 na s* | 30 | 70 | `gore`, `shield` 10 |

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

Wygląd: wszystkie trzy szczepy i bestie mają styl „mroczna baśń” (ADR 0019). Obserwacje:

- **Strzelcy biją rzadko.** Obrażenia na sekundę strzelców to m.in.: Bush 10, Orb 23, Ivy 24, Holo-bot 30, Cardinal 45, Ultimus 83, Thermobot 100.
- **Mother-tree** przyzywa krzak co 2 s, więc pięć miejsc zapełnia się po ok. 8 s. Z 10 000 życia praktycznie nie da się jej zabić w 90 sekund walki: drużyna z nią nie przegrywa przez wybicie, ale może przegrać limitem czasu, a jako przeciwnik jest ścianą.
- Postacie stojące (Bush, Ivy, obie formy końcowe Ivy, Holo-bot, Polaris) strzelają od pierwszej sekundy i giną, gdy wróg do nich dojdzie.
- Oak warrior odrzuca o 300 jednostek, prawie jedną trzecią pola: po każdym ciosie idzie do wroga od nowa.

### Balans bohaterów (2026-10-07)

Decyzje autora gry (ADR 0024):

- **Miecznicy i Łucznicy mają być wyraźnie słabsi** od szczepów ze szkiców i mniej opłacalni: forma ludzi ma ok. 70% siły form innych szczepów na tym samym stopniu, a drużyna ludzi przegrywa równą walkę z drużyną każdego innego szczepu, ale wystarcza na początek gry.
- **Liczby ze szkiców zostają punktem wyjścia.** Zmienia się tylko to, co wyraźnie odstaje, i każda taka zmiana jest wypisana.
- **Skala szybkości jest ściśnięta dla postaci walczących wręcz**, które były tak wolne, że nie dochodziły do celu. Postacie stojące i strzelcy, którzy nie muszą wiele chodzić, zostają.

Co się zmieniło:

| Co | Było | Jest |
|---|---|---|
| Życie i atak 14 form ludzi | np. Miecznik 600 / 40, Rycerz 1300 / 115, Łucznik 350 / 30 | Miecznik 160 / 20, Rycerz 700 / 80, Łucznik 120 / 14 (pełne tabele wyżej) |
| Leczenie ludzi | Strażnik 45, Akolita 16, Kapłan 28 | 30, 8, 16 |
| Zasięg Strzelca i Strzelca wyborowego | 300, 320 | 280, 300 |
| Szybkość postaci walczących wręcz (ze szkiców) | Monstrosity 25, Reaper 30, Tuskovator 30, Guardian of hell 30, Oak warrior 40, Titan-bot 40, Xartix 75, Whirl-bot 175 | 40, 50, 50, 45, 45, 45, 80, 130 |
| Tempo ataków wręcz (wartości robocze) | Monstrosity 1,0, Bot 1,0, Reaper 1,2, Tuskovator 0,7, Ironbeak 1,0, Ax-bot 0,8, Titan-bot 0,7; Enigmatix 0,8, Xartix 1,2, Whirl-bot 1,5 | 1,2, 1,2, 1,4, 1,0, 1,2, 1,25, 0,9; 0,4, 1,0, 0,8 |
| Zasięg strzelców (wartości robocze) | Batfang 220, Spiker 240, Trunk 240; Cardinal 260, Ultimus 260, Thermobot 220 | 320, 340, 300; 240, 220, 200 |
| Leczenie drużyny przez Ice Ivy (ze szkicu) | 50 na sekundę | 25 na sekundę |

Szybkości, które zostały: postacie stojące (0), strzelcy ze szkiców (Ignitix 5, Batfang 10, Cardinal 10, Spiker 15, Orb 15, Trunk 25, Ultimus 30, Thermobot 80), Ironbeak 100, Enigmatix 65, Bot 50, Egzo-bot 70, Ax-bot 80 i ludzie (45–70). Chodzące postacie walczące wręcz mieszczą się teraz w skali 40–130.

**Jedyna zmieniona liczba ze szkiców poza szybkością to leczenie Ice Ivy.** Leczyła każdą jednostkę drużyny o 50 na sekundę, w jednej walce próbnej łącznie 16 000 punktów życia, i drużyna Plants była nie do przebicia. Enigmatix (tarcza 50%, atak 160) i Whirl-bot (unik 70 na 100) wygrywali prawie każdy pojedynek; wystarczyło im zwolnić tempo ataków, które jest wartością roboczą.

Miernik: `pnpm balance:heroes` zapisuje w `reports/heroes.md` pojedynki form tego samego stopnia (z obu stron pola), wartość formy w drużynie i walki drużyn szczepów 5 na 5. Stan po zmianach:

- W pojedynkach każda forma ludzi przegrywa więcej, niż wygrywa, a średni bilans obu szczepów ludzi jest na każdym stopniu niższy niż każdego szczepu ze szkiców.
- Drużyny Mieczników, Łuczników i mieszana drużyna ludzi przegrywają z drużyną każdego szczepu ze szkiców, z obu stron pola, bez ulepszeń i z kompletem.
- Szczepy ze szkiców wygrywają między sobą na zmianę: Robots z Immortals i Plants, Beasts z Robots, Immortals i Plants z Beasts; Immortals z Plants nie umieją się przebić w limicie czasu.

Te reguły sprawdza test (`scripts/lib/hero-balance.test.ts`), więc następna zmiana liczb nie może ich po cichu odwrócić.

Znane nierówności, zostawione świadomie:

- **Orb** wygrywa pojedynek z każdą inną formą bazową (350 życia i strzał wobec 200 życia form walczących wręcz); to liczby ze szkicu i tylko pierwszy stopień gry.
- **Ignitix, Ultimus i Enigmatix** wygrywają po 21 z 23 pojedynków form końcowych, **Toxic Ivy** nie wygrywa żadnego (jej pocisk bije wszystkich po trochu, więc liczy się w drużynie), **Mother-tree** żadnego nie przegrywa. Szczepy jako całość są wyrównane, więc tych liczb ze szkiców nie ruszałem.
- **Runy mają wartości płaskie** (§5.3), więc ta sama runa waży więcej u bohatera o niskich liczbach, czyli u ludzi. Od wprowadzenia drzewka run pierwsze runy są mniejsze niż dawniej (życie +60 zamiast +100).
- Przeciwnicy i nagrody wszystkich światów są zbalansowane osobno, do pięcioosobowego składu odniesienia (§7, „Balans poziomów i nagród”).

### Szczep Akronix (wrogowie)

Piąty szkic autora gry (2026-10-07) to szczep, który **jest wyłącznie przeciwnikiem**: jego postaci nie da się kupić, nie mają ewolucji (każda to jedna forma) ani ulepszeń, a w zakładce Bohaterowie mają własny poczet z opisem. Dziesięć postaci: siedem w czterech stopniach i trzej Axiny, którzy są bossami. Nazwy są własne i takie same w obu językach. Poziom wroga skaluje ich życie i atak jak u każdej jednostki (§7).

Szkic podaje statystyki tylko dla Axinów (życie, atak, szybkość, odrzut); pozostałe liczby są **robocze** (kursywa) i dobrane tak, żeby każda kolejna postać była mocniejsza od poprzedniej. Miarą jest pojedynek jeden na jednego na poziomie 0: każda postać wygrywa z poprzednią z obu stron pola (pilnuje tego test `tests/content/akronix.test.ts`).

| Postać | Stopień | `maxHp` | `attack` | `moveSpeed` | Tempo ataków | `range` | `knockback` | Typ ataku i cechy |
|---|---|---|---|---|---|---|---|---|
| Bowix (ranged) | zwiadowca | *220* | *25* | *110* | *co 1,0 s* | *240* | *5* | `barb_shot` |
| Assasinix (ranged) | zwiadowca | *300* | *35* | *140* | *co 1,2 s* | 1000 (całe pole) | *5* | `dart_shot`, `targetLast` |
| Katanix (melee) | żołnierz | *450* | *45* | *120* | *1,4 na s* | 30 | *15* | `slash`, `doubleDamage` 25% (co czwarty cios) |
| Defenix (melee) | żołnierz | *700* | *60* | *70* | *0,8 na s* | 30 | *60* | `shield_chop`, `shield` 20% (ze szkicu) |
| Poisonix (ranged) | wojownik | *750* | *55* | *80* | *co 1,5 s* | *220* | *10* | `flask_throw`, `poison`: *20 co sekundę przez 5 s* |
| Hornix (melee) | wojownik | *850* | *80* | *220* | *0,7 na s* | 30 | *250* | `horn_charge`, `charge` +200% (pierwszy cios potrójny) |
| Kaisarix (melee) | generał | *950* | *95* | *60* | *0,7 na s* | 30 | *80* | `cleave`, `splash` *60*, `enrage` *poniżej 50%: +60%* |
| Axin 1 (melee) | boss | 1000 | 100 | 400 | *1,2 na s* | 30 | 150 | `dual_cleave` |
| Axin 2 (melee) | boss | 2000 | 90 | 400 | *1,0 na s* | 30 | 300 | `dual_cleave`, `bleed`: 30 co sekundę przez 10 s (ramka „+30” ze szkicu) |
| Axin 3 (melee) | boss | 3000 | 300 | 200 | *0,7 na s* | 30 | 200 | `dual_cleave`, `shield` 10% (ze szkicu) |

| Typ | Zamach | Trafienie | Klip, postawa | Pocisk |
|---|---|---|---|---|
| `barb_shot` | 0,6 s | 0,5 | `shoot`, `bow` | strzała, 420 jedn./s |
| `dart_shot` | 0,5 s | 0,5 | `cast`, `beast` | strzałka, 620 jedn./s |
| `shield_chop` | 0,5 s | 0,5 | `slash`, `shield` (pawęż w drugiej ręce) | brak |
| `flask_throw` | 0,6 s | 0,5 | `cast`, `beast` | kolba, 340 jedn./s |
| `horn_charge` | 0,8 s | 0,6 | `gore`, `sword` | brak |
| `dual_cleave` | 0,7 s | 0,6 | `cleave`, `dual` (broń w obu rękach) | brak |

Ustalenia z autorem (2026-10-07) i moje wybory do jego oceny:

- Nazwy odczytane ze szkicu poprawnie; Axiny to bossowie na szczycie drabinki; „+30” to krwawienie, trucizna Poisonixa działa tak samo (ADR 0021); Hornix dostał szarżę. „Rozkaz generała” autor odrzucił, więc Kaisarix ma istniejące cechy (cios obszarowy i szał).
- **Atak Axina 2** odczytałem jako 90 (mniej niż Axina 1); autor przy pytaniu o „+30” go nie poprawił. Z krwawieniem Axin 2 zadaje ok. 120 na sekundę, tyle co Axin 1, przy dwukrotnie większym życiu.
- Trucizna Poisonixa (20 przez 5 s) jest słabsza niż krwawienie bossa. Kolba trafia jeden cel: cios obszarowy działa dziś tylko wręcz.
- Assasinix celuje w ostatniego wroga w szyku (istniejąca cecha `targetLast`), jak przystało na skrytobójcę.
- Szybkość 400 Axinów 1 i 2 (ze szkicu) to ponad dwa razy więcej niż u najszybszego bohatera (Whirl-bot, 175): dobiegają do składu gracza w pół sekundy, a ich odrzut (150 i 300) spycha bohaterów na krawędź pola.
- Dla skali, pojedynki na poziomie 0: cała siódemka przegrywa z Hersztem i z Rycerzem; Axin 1 i 2 przegrywają z Enigmatixem (tarcza 50%), Axin 3 wygrywa z każdym z nich.
- Akronix nie stoi na razie na żadnym poziomie: poziomy i balans autor zaplanuje później. Postacie da się wystawić w piaskownicy walki i w `pnpm battle`.

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

- Ulepszenie kosztuje złoto i zwiększa `maxHp` oraz `attack` o 10% wartości bazowej formy (wyjściowo). Pozostałe statystyki się nie zmieniają. **Każde ulepszenie formy kosztuje tyle samo** (decyzja autora z 2026-10-07, ADR 0023).
- Po 4 ulepszeniach bieżącej formy dostępna jest **ewolucja** w jedną z jej następnych form: osobny zakup za złoto (koszt zależy od stopnia formy docelowej i jest wyższy niż ulepszenia), zamienia bohatera na tę formę bez ulepszeń. Gdy następnych form jest kilka, gracz wybiera jedną.
- Każda forma ma własne 4 ulepszenia. Forma bez następnych jest końcem drogi.
- Ulepszenia i ewolucja są nieodwracalne, także wybór drogi. Kto chce drugiej drogi, kupuje w sklepie kolejny egzemplarz linii.

**Koszty zależą tylko od stopnia formy** i są takie same dla wszystkich szczepów (reguły autora z 2026-10-07; liczby to propozycja wykonawcy, do balansu; ADR 0023):

| Stopień formy | Ewolucja w tę formę | Każde z 4 ulepszeń | Komplet ulepszeń |
|---|---|---|---|
| bazowa (ze sklepu) | — | 50 | 200 |
| po pierwszej ewolucji | 400 | 200 | 800 |
| po drugiej ewolucji | 1600 | 800 | 3200 |

Reguły, których pilnuje walidator treści: ceny rosną ze stopniem, a ewolucja kosztuje więcej niż ulepszenie formy przed nią i po niej. W tych liczbach każdy stopień jest cztery razy droższy od poprzedniego, a ewolucja to dwa ulepszenia nowej formy. Bohater od zakupu (200) do końca drogi kosztuje 6400 złota. Dawne koszty rosły z każdym ulepszeniem (`50, 80, 120, 180`, ewolucja `250`, `300–750`, ewolucja `1200`, `1000–2200`).

### 5.3 Runy i drzewko run

System od autora gry (2026-10-07, ADR 0026); liczba run w kierunku i ich wartości to propozycja wykonawcy z pomiarów.

- Runa to żeton z płaską premią do jednej statystyki. Każdy bohater ma **2 gniazda na runy**; gniazda zostają po ewolucji. Runy można dowolnie wkładać, wyjmować i przekładać między bohaterami, bez kosztu.
- Runy bierze się z **drzewka run** w sklepie. Drzewko ma cztery kierunki, po jednym na statystykę, a w każdym sześć run, coraz mocniejszych:

| Kierunek | Runy od pierwszej do szóstej |
|---|---|
| Życie | +60, +100, +160, +240, +340, +460 |
| Atak | +6, +10, +16, +24, +34, +46 |
| Odrzut | +20, +40, +60, +90, +120, +160 |
| Szybkość | +15, +30, +45, +60, +75, +90 |

- Runę odblokowuje **żeton run**. Żeton jest nagrodą za **pierwsze przejście** drugiego i piątego poziomu każdego świata, czyli jest ich 12 w całej grze, a run w drzewku 24. Gracz weźmie więc połowę drzewka: dwa kierunki do końca, każdy do połowy albo coś pomiędzy.
- Żeton odblokowuje **następną runę wybranego kierunku**; kierunku nie da się przeskoczyć. Każda odblokowana runa to osobny przedmiot, więc słabsze runy kierunku zostają graczowi i też trafiają do gniazd. Wyboru nie da się cofnąć; sklep pyta o potwierdzenie.
- Premia z runy dodaje się po przeliczeniu ulepszeń. Runy nie mają poziomów i się nie zużywają.
- **Odrzut** jest w walce zarazem siłą odrzutu i oporem przed nim (§4.6), więc runa daje jedno i drugie.
- **Szybkość** to szybkość ruchu. Runa nie działa na bohatera, który stoi w miejscu (szybkość 0). Jej wartość musi być wielokrotnością 15, żeby karta bohatera pokazywała równe liczby.
- Run nie widać na postaci; nie ma przedmiotów ani ich grafik. Kolor żetonu mówi, co runa wzmacnia: zielony życie, czerwony atak, granatowy odrzut, błękitny szybkość.

Co pokazał pomiar (ADR 0026):

- **Życie i atak pomagają zawsze.** Do nich są strojeni bossowie (§7).
- **Odrzut i szybkość zmieniają przebieg walki**, więc w jednych walkach pomagają, a w innych szkodzą. Odrzut trzyma walczących wręcz z dala od strzelców gracza (Mechanus town, Cytadela), ale stojących strzelców odpycha poza zasięg własnych bohaterów (Living swamps) i potrafi przegrać walkę wygraną bez run. Szybkość pomaga walczącym wręcz, którzy startują z tyłu szyku; włożona frontowi wysyła go do wroga samego.
- Runy przekłada się za darmo, więc gracz dobiera je do poziomu: to, komu je dać, jest częścią łamigłówki.

### 5.4 Złoto

- Jedyna waluta. Źródło: nagrody za poziomy. Odpływ: ulepszenia, ewolucje i zakupy bohaterów w sklepie.
- Pierwsze przejście poziomu daje pełną nagrodę. Każda powtórka daje 25% złota i nic poza tym.
- Wynik walki jest powtarzalny, więc powtórka poziomu składem, który już wygrał, to pewne złoto. Ułamek 25% ma sprawić, że farmienie jest możliwe, ale wolniejsze niż postęp.

### 5.5 Sklep

- Sklep sprzedaje bohaterów za złoto. Wszystkie linie są dostępne od początku gry; ogranicza tylko cena.
- W sklepie jest też **drzewko run** (§5.3): tu wydaje się żetony run. Żetonów nie da się kupić za złoto.
- Zakup daje nowy egzemplarz w formie bazowej, bez ulepszeń i run. Jeśli w składzie jest wolny slot, bohater od razu go zajmuje (pierwszy wolny od frontu); inaczej trafia poza skład.
- Tę samą linię można kupić wiele razy; każdy egzemplarz kosztuje tyle samo. Liczba posiadanych bohaterów nie ma limitu.
- Bohaterów nie da się sprzedać.
- Jednostek specjalnych (przeciwników takich jak Osiłek czy Herszt) nie ma w sklepie.
- Ceny wyjściowe: każdy szczep 200 za formę bazową.

Nagrody są policzone razem z przeciwnikami (§7, „Balans poziomów i nagród”): trzy pierwsze poziomy gry dają po 200 złota, czyli po jednym bohaterze, a cała gra ok. 60 000.

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

- **6 światów po 6 poziomów** (decyzja autora z 2026-10-07, ADR 0022). Motyw: Akronix zaatakowali wszystkie światy, a gracz **odbija** je po kolei, aż zdobędzie ich siedzibę. Pierwszy świat to zamek Mieczników i Łuczników, cztery kolejne należą do szczepów bohaterów, ostatni to cytadela Akronixów: najtrudniejszy, końcowy etap gry.

| # | Świat (pl / en) | Przeciwnicy | Tło i szlak na mapie |
|---|---|---|---|
| 1 | Zamek / The Castle | Miecznicy i Łucznicy | Zmierzch nad murami: blanki, baszty z proporcami, brama; szlak zygzakiem |
| 2 | Mechanus town | Robots | Stalowy smog: hale o zębatych dachach, kominy, koła zębate, żuraw; szlak jak taśma na dwóch poziomach |
| 3 | Living swamps | Plants | Mętna zieleń: księżyc we mgle, drzewa na cienkich pniach, pnącza, trzciny, świetliki; szlak meandrem |
| 4 | Jungle of doom | Beasts | Duszny zmierzch: dymiący wulkan, palmy i liany, żebra olbrzyma; szlak przez stok wulkanu |
| 5 | Tower of time | Immortals | Fioletowa noc ze złotem: tarcza zegara na niebie, iglice, kolumnada, wieża poza kadr; szlak schodami w górę |
| 6 | Cytadela Akronix / Akronix citadel | Akronix | Niebo jak wino: czerwony księżyc, mur z kolcami, brama z kłami, proporce; szlak w dół i z powrotem w górę, do tronu |

- Kolejność światów szczepów wynika z numerów na szkicach autora (Robots 2, Plants 3, Beasts 4, Immortals 5), a ich nazwy z tych samych szkiców. Nazwy „Zamek” i „Cytadela Akronix”, nazwy wszystkich poziomów i wygląd teł to propozycja wykonawcy, do oceny autora.
- Każdy świat ma własne tło, własny kształt szlaku i własne nazwy poziomów. Tło idzie za światem: mapa, walka i wynik pokazują tło świata swojego poziomu, a skład, sklep i bohaterowie zostają na tle, z którego gracz przyszedł.
- **Mapa pokazuje jeden świat naraz.** Duże strzałki przy lewej i prawej krawędzi sceny przechodzą do sąsiedniego świata. Pod nazwą świata stoi rząd sześciu kłów, po jednym na świat: świat odbity, w toku albo zablokowany; kieł też przełącza świat. Świat otwiera się na pierwszym nieprzeszłym poziomie, a odbity na swoim bossie.
- Świat jest **odbity**, gdy wszystkie jego poziomy są przeszłe.
- Szósty poziom świata to **boss**: mocniejsza jednostka z obstawą; od świata 3 jest nim Axin. Boss wymaga run (niżej, „Balans poziomów i nagród”).
- **Wrogami są zwykłe postacie z gry oraz jednostki specjalne.** Poziom może wystawić dowolną formę bohatera (np. Miecznika albo Rycerza) i jednostki, których gracz nie może zdobyć ani ewoluować (szczep Akronix, §3).
- Poziomy odblokowują się kolejno przez całą grę: boss świata odblokowuje pierwszy poziom następnego. Przeszły poziom można powtarzać.
- **Zablokowany poziom można obejrzeć** (przeciwnicy na scenie, nagroda na tabliczce), także w świecie, do którego gracz jeszcze nie doszedł, ale nie można na nim walczyć: przycisk walki jest nieaktywny, a pod nim stoi, który poziom trzeba przejść najpierw.
- Poziom to skład wrogów na slotach, z poziomem siły każdej jednostki, oraz nagrody:

```json
{
  "id": "w2_l2",
  "enemies": [
    { "slot": 0, "unit": "egzo_bot", "level": 2 },
    { "slot": 1, "unit": "bot", "level": 4 },
    { "slot": 2, "unit": "bot", "level": 1 },
    { "slot": 3, "unit": "bowix", "level": 3 }
  ],
  "rewards": { "gold": 500, "runeToken": true }
}
```

`runeToken` to żeton run za pierwsze przejście (§5.3); poziom bez żetonu nie ma tego pola. Poziomy jednego świata leżą w jednym pliku, w kolejności odblokowywania; świat wskazuje swoje tło w `worlds.json` (`backdrop`, zamknięty zestaw sześciu teł). Nazwa poziomu to tekst `level.<id>.name` w słownikach, nazwa świata `world.<id>.name`.

`level` wroga skaluje `maxHp` i `attack` tak samo jak ulepszenia bohatera: +10% wartości bazowej na poziom (wyjściowo, `upgradePercent` w `progression.json`), z zaokrągleniem w dół. Mapa pokazuje go tak samo jak ulepszenia bohatera, jako „+N” przy nazwie; wróg na poziomie 0 nie ma oznaczenia.

### Balans poziomów i nagród (2026-10-07)

Decyzje autora gry (ADR 0025):

- **Złoto:** cała gra daje za pierwsze przejścia ok. 60 000, czyli na dziesięciu maksymalnie rozwiniętych bohaterów (komplet jednej piątki to 31 600); w pierwszych światach mniej, w dalszych więcej.
- **Liczba wrogów:** od trzech do pięciu na poziom, od świata 3 zwykle pięciu. Wyjątek: dwa pierwsze poziomy gry mają po dwóch, bo dwaj bohaterowie startowi nie pokonują trzech nawet najsłabszych wrogów.
- **Akronix** pojawiają się w każdym świecie, raz na jakiś czas, w kolejności swojego pocztu. Axin 1 kończy świat 3, Axin 2 świat 4, Axin 3 świat 5, a w świecie 6 wracają wszyscy trzej. Finałowego bossa gry autor zaprojektuje później; do tego czasu w finale stoją trzej Axiny.
- **Trudność: wymagająco.** Zwykłe poziomy bez zapasu, a bossowie wymagają run albo powtórzenia wcześniejszych poziomów dla złota.

Jak to jest policzone:

- **Skład odniesienia** to pięciu bohaterów: Miecznik i Łucznik ze startu oraz kupieni po kolei Bot (Robots), Monstrosity (Beasts, drogą Reaper → Tuskovator) i Orb (Immortals). Wydaje całe zdobyte złoto: najpierw kupuje brakujących bohaterów, potem rozwija wszystkich równo.
- **Zwykły poziom:** skład odniesienia bez run wygrywa, a skład sprzed poprzedniej nagrody już nie. Poziom wymaga więc złota ze wszystkich wcześniejszych poziomów i ani trochę więcej; runy dają margines.
- **Boss** (szósty poziom świata): skład odniesienia bez run przegrywa, z runami wygrywa. Runy składu odniesienia to te, które odblokował za żetony zdobyte wcześniej, biorąc na zmianę runę życia i runę ataku (ADR 0026); przed bossem świata N ma ich po N. Runy życia nosi front, runy ataku tył.
- **Cytadela:** skład odniesienia kończy rozwój w piątym świecie, więc każdy poziom szóstego świata jest strojony jak boss, a jego złoto służy budowie drugiego składu.
- Rangi w tabelach idą od frontu: litera to stopień formy (A bazowa, B po pierwszej ewolucji, C po drugiej), cyfra to liczba ulepszeń. „5 × B2” to pięciu bohaterów na tej samej randze.

Nagrody: trzy pierwsze poziomy dają po 200 złota, czyli po jednym bohaterze, więc gracz ma pełną piątkę przed czwartym poziomem gry. Dalej każda nagroda kupuje składowi odniesienia co najmniej jeden krok rozwoju. Żeton run czeka na drugim i piątym poziomie każdego świata (§5.3).

| Świat | Złoto | Razem od początku |
|---|---|---|
| 1 Zamek | 1 600 | 1 600 |
| 2 Mechanus town | 4 000 | 5 600 |
| 3 Living swamps | 6 800 | 12 400 |
| 4 Jungle of doom | 10 900 | 23 300 |
| 5 Tower of time | 13 800 | 37 100 |
| 6 Cytadela Akronix | 22 900 | 60 000 |

Poziom siły przy wrogu („+N”) to +10% życia i ataku na punkt. Liczby dobrał skrypt: dla każdego poziomu najtrudniejsze ustawienie, które skład odniesienia jeszcze przechodzi. Raport `pnpm balance` (`reports/balance.md`) pokazuje wynik każdego poziomu, a test reguł pilnuje, żeby wszystkie zostały „zgodne”. Po wprowadzeniu drzewka run (ADR 0026) bossowie i poziomy Cytadeli dostali nowe poziomy siły wrogów, dobrane do run z drzewka; zwykłe poziomy nie zależą od run i zostały bez zmian.

Raport ma też tabelę „Inne drogi przez drzewko run”: ten sam skład na poziomach wymagających run, gdy żetony pójdą inaczej. Na 11 takich poziomach plan odniesienia wygrywa wszystkie, „najpierw życie” 10, „najpierw odrzut” 7, „najpierw atak” 6, „najpierw szybkość” 4, a wszystkie kierunki po równo 2.

### Świat 1: Zamek (1600 złota)

| Poziom | Przeciwnicy od frontu (jednostka i poziom siły) | Złoto | Żeton run | Skład odniesienia przed poziomem |
|---|---|---|---|---|
| Podgrodzie | Łucznik, Łucznik +1 | 200 |  | 2 × A0 |
| Most zwodzony | Miecznik +4, Łucznik +5 | 200 | tak | 3 × A0 |
| Brama | Miecznik +3, Łucznik +3, Łucznik | 200 |  | 4 × A0 |
| Dziedziniec | Miecznik +1, Miecznik +1, Łucznik, Bowix +2 | 250 |  | 5 × A0 |
| Zbrojownia | Tarczownik +3, Miecznik +3, Łucznik +4, Łucznik +5 | 300 | tak | 5 × A1 |
| Sala tronowa (boss) | Zbrojny, Tarczownik, Łucznik +1, Assasinix | 450 |  | A3 A2 A2 A2 A2, runy: 2 |

### Świat 2: Mechanus town (4000 złota)

| Poziom | Przeciwnicy od frontu (jednostka i poziom siły) | Złoto | Żeton run | Skład odniesienia przed poziomem |
|---|---|---|---|---|
| Złomowisko | Egzo-bot +2, Bot +4, Bot +5 | 450 |  | 5 × A4 |
| Rogatki | Egzo-bot +2, Bot +4, Bot +1, Bowix +3 | 500 | tak | B0 A4 A4 A4 A4 |
| Hala montażowa | Egzo-bot +5, Egzo-bot +2, Bot +2, Bot +5 | 600 |  | B0 A4 B0 A4 A4 |
| Odlewnia | Katanix +2, Egzo-bot +3, Bot +2, Bot +4 | 700 |  | B0 A4 B0 B0 A4 |
| Elektrownia | Egzo-bot, Bot +3, Bot +2, Holo-bot +1, Bowix +1 | 800 | tak | B1 B0 B0 B0 B0 |
| Rdzeń (boss) | Titan-bot +1, Defenix +1, Bot, Bot +1, Holo-bot | 950 |  | 5 × B1, runy: 4 |

### Świat 3: Living swamps (6800 złota)

| Poziom | Przeciwnicy od frontu (jednostka i poziom siły) | Złoto | Żeton run | Skład odniesienia przed poziomem |
|---|---|---|---|---|
| Skraj bagien | Trunk +3, Bush +3, Bush +1, Ivy +3, Bush +3 | 700 |  | 5 × B2 |
| Zgniła kładka | Trunk, Bush +3, Poisonix +1, Bush +2, Bush +3 | 750 | tak | B3 B2 B3 B3 B2 |
| Cierniowy gąszcz | Trunk +2, Bush +2, Trunk +1, Ivy +1, Ivy | 850 |  | B4 B3 B4 B3 B3 |
| Mglista topiel | Hornix +5, Bush +4, Bush +5, Bush +4, Bowix +6 | 1300 |  | 5 × B4 |
| Trujący gaj | Kaisarix +1, Trunk +1, Bush +1, Ivy, Bush +2 | 1600 | tak | C0 B4 B4 B4 B4 |
| Serce bagien (boss) | Axin 1 +4, Oak warrior +3, Trunk +3, Ivy +4, Bush +4 | 1600 |  | C0 B4 C0 B4 B4, runy: 6 |

### Świat 4: Jungle of doom (10900 złota)

| Poziom | Przeciwnicy od frontu (jednostka i poziom siły) | Złoto | Żeton run | Skład odniesienia przed poziomem |
|---|---|---|---|---|
| Ścieżka łowców | Tuskovator +9, Ironbeak +9, Reaper +8, Batfang +9, Batfang +9 | 1600 |  | C0 B4 C0 C0 B4 |
| Wodopój | Ironbeak +7, Tuskovator +7, Defenix +8, Batfang +8, Assasinix +8 | 1600 | tak | C0 B4 C0 C0 C0 |
| Legowisko | Tuskovator +2, Ironbeak +3, Reaper +3, Ignitix +3, Batfang +3 | 1700 |  | 5 × C0 |
| Żebra olbrzyma | Hornix +6, Tuskovator +7, Ironbeak +7, Batfang +7, Poisonix +6 | 1800 |  | C1 C0 C1 C0 C0 |
| Wąwóz kłów | Tuskovator +1, Ironbeak +2, Kaisarix, Spiker +1, Ignitix | 1900 | tak | C1 C0 C1 C1 C1 |
| Paszcza wulkanu (boss) | Axin 2 +2, Tuskovator +3, Reaper +2, Ignitix, Batfang +3 | 2300 |  | C2 C1 C1 C1 C1, runy: 8 |

### Świat 5: Tower of time (13800 złota)

| Poziom | Przeciwnicy od frontu (jednostka i poziom siły) | Złoto | Żeton run | Skład odniesienia przed poziomem |
|---|---|---|---|---|
| Podnóże wieży | Xartix +5, Xartix +5, Cardinal +6, Cardinal +6, Polaris +6 | 2000 |  | C2 C1 C2 C2 C2 |
| Schody bez końca | Enigmatix +3, Xartix +3, Cardinal +4, Poisonix +4, Polaris +3 | 2100 | tak | C3 C2 C3 C2 C2 |
| Sala zegarów | Enigmatix +5, Xartix +2, Cardinal +5, Ultimus +4, Polaris +3 | 2200 |  | C3 C2 C3 C3 C3 |
| Wahadło | Kaisarix +2, Enigmatix +5, Hornix +2, Ultimus +4, Polaris +4 | 2300 |  | C4 C3 C4 C3 C3 |
| Komnata gwiazd | Enigmatix +3, Enigmatix +4, Xartix +1, Ultimus +3, Ultimus +1 | 2400 | tak | 5 × C4 |
| Szczyt wieży (boss) | Axin 3 +1, Enigmatix +4, Xartix +4, Ultimus +4, Polaris +3 | 2800 |  | 5 × C4, runy: 10 |

### Świat 6: Cytadela Akronix (22900 złota)

| Poziom | Przeciwnicy od frontu (jednostka i poziom siły) | Złoto | Żeton run | Skład odniesienia przed poziomem |
|---|---|---|---|---|
| Czaty zwiadowców | Katanix +21, Defenix +22, Bowix +22, Assasinix +21, Assasinix +22 | 3000 |  | 5 × C4, runy: 10 |
| Koszary | Defenix +15, Defenix +17, Katanix +16, Katanix +16, Poisonix +16 | 3400 | tak | 5 × C4, runy: 10 |
| Pracownia trucizn | Kaisarix +14, Hornix +12, Defenix +13, Poisonix +12, Poisonix +14 | 3700 |  | 5 × C4, runy: 11 |
| Stajnie bestii | Kaisarix +9, Kaisarix +10, Hornix +10, Hornix +10, Poisonix +10 | 4000 |  | 5 × C4, runy: 11 |
| Sala wojenna | Axin 1 +5, Axin 2 +4, Kaisarix +4, Hornix +5, Poisonix +5 | 4300 | tak | 5 × C4, runy: 11 |
| Tron Axinów (boss) | Axin 3 +1, Axin 2, Axin 1 +1, Kaisarix, Poisonix | 4500 |  | 5 × C4, runy: 12 |

Co warto wiedzieć:

- **Pierwsza nagroda jest na trzeciego bohatera.** Kto wyda ją na ulepszenia, na drugim poziomie przegra i będzie musiał powtarzać pierwszy; gra tego dziś nie podpowiada.
- **Drugi Łucznik zamiast bohatera innego szczepu** też nie wystarcza na drugi poziom, a drugi Miecznik wystarcza ledwo: ludzie są najsłabszym wyborem (§3).
- **Poziomy siły w Cytadeli są wysokie** (do +22), bo niskie stopnie Akronixów mają liczby dużo niższe niż rozwinięty skład gracza. Liczba maleje z poziomu na poziom, choć poziomy są coraz trudniejsze, bo stają na nich mocniejsze postacie.
- **Mother-tree nie stoi na żadnym poziomie:** z 10 000 życia jako przeciwnik kończy walkę limitem czasu.
- **Bossem Zamku jest Zbrojny**, nie Rycerz: forma końcowa jest za mocna na skład z form bazowych.
- **W Cytadeli odrzut jest mocniejszy niż plan odniesienia.** Poziom siły wroga skaluje życie i atak, ale nie odrzut, więc mocni wrogowie dają się odpychać jak słabi. Droga „najpierw odrzut” wygrywa pięć z sześciu poziomów Cytadeli z zapasem 12–41% życia (plan odniesienia: 8–9%) i przegrywa tylko finał.
- **Drzewko po równo jest słabe:** dalsze runy są mocniejsze, więc opłaca się iść w głąb kierunku.

## 8. Prezentacja

- Widok z boku, animacja wycinankowa (cutout). Grafika gładka, rysowana w 2× rozdzielczości logicznej 1280×720.
- **Scena jest płaska, bez perspektywy** (decyzja autora z 2026-10-02): wszystkie postacie stoją i chodzą dokładnie po linii podłogi, na jednej wysokości. Sloty w interfejsie leżą w jednym rzędzie.
- Interfejs to teatrzyk z wycinanek (ADR 0015): na każdym ekranie ta sama scena z linią podłogi, a przyciski, kafle mapy i karty to papierowe rekwizyty. Tło sceny to dekoracja świata: warstwy płaskich sylwetek, inne w każdym z sześciu światów (ADR 0022). Pięć kłów pod linią podłogi oznacza pięć slotów składu.
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
| Roster: sześć szczepów po siedem form | W grze. Liczby po balansie z 2026-10-07 (§3, „Balans bohaterów”, ADR 0024) do oceny autora: ludzie ok. 70% siły innych szczepów, ściśnięta skala szybkości, jedna zmiana liczby ze szkicu (leczenie Ice Ivy). Nazwy sześciu nowych form ludzi to nadal propozycja wykonawcy |
| Drzewko run | System i cztery kierunki od autora (2026-10-07, §5.3, ADR 0026). Do jego oceny: sześć run w kierunku przy dwunastu żetonach, wartości run, to, że wyboru nie da się cofnąć, i wygląd drzewka w sklepie. „Szybkość” jest odczytana jako szybkość ruchu, nie tempo ataków |
| Odrzut i szybkość jako kierunki | W obecnych regułach walki nie są zwykłą siłą: pomagają w jednych walkach, szkodzą w innych (§5.3). Odrzut jest przy tym bardzo mocny w Cytadeli (§7). Do decyzji, czy tak ma zostać, czy runy tych kierunków mają działać inaczej (np. sam opór przed odrzutem) |
| Siła run | Wartości płaskie ważą dużo, zwłaszcza u ludzi. Bossowie są strojeni tak, żeby run wymagać, a na zwykłych poziomach runy życia i ataku dają duży margines (skład odniesienia kończy wtedy zwykle z 20–35% życia zamiast z ok. 8%). Do decyzji, czy mają zostać tak mocne |
| Finałowy boss gry | Autor zaprojektuje go później; do tego czasu w „Tronie Axinów” stoją trzej Axiny z Kaisarixem i Poisonixem |
| Podpowiedź na początek gry | Pierwsza nagroda jest pomyślana na trzeciego bohatera; kto wyda ją na ulepszenia, utknie na drugim poziomie. Do rozwiązania przy wprowadzeniu do gry (M6) |
| Koszty ulepszeń i ewolucji | Reguły od autora (2026-10-07): stała cena ulepszenia, ewolucja droższa, ceny rosną ze stopniem. Liczby (50 / 200 / 800 i 400 / 1600) to propozycja wykonawcy, do oceny autora i do balansu (§5.2, ADR 0023) |
| Sześć światów: nazwy, tła, przeciwnicy | Światy i motyw od autora (2026-10-07); w grze jest sześć światów z tłami, szlakami i nazwami poziomów (§7). Do oceny autora: nazwy „Zamek” i „Cytadela Akronix”, nazwy 36 poziomów, wygląd teł, podgląd zablokowanych poziomów. Przeciwnicy i nagrody są zbalansowane od 2026-10-07 (§7, ADR 0025); rozkład nagród, składy wrogów i skład odniesienia do oceny autora |
| Ułamek za powtórki | 25% nagrody; przy bossach, które wymagają run albo powtórek, decyduje o tym, ile trzeba powtarzać. Nie był strojony |
| Czy gra może być osadzana na innych stronach (`frame-ancestors`) | Przed premierą |
| Hosting publiczny | Przed premierą (M6) |

Rozstrzygnięte 2026-10-02:

- Nowe cechy pasywne: `splash`, `lifesteal`, `enrage` (sekcja 6).
- Runy obejmują tylko `attack` i `maxHp`, w trzech wielkościach każdej statystyki. (Zmienione 2026-10-07: cztery kierunki drzewka run po sześć run, §5.3.)
- Wrogami na poziomach mogą być zwykłe postacie z gry (formy bohaterów) oraz jednostki specjalne, których gracz nie może zdobyć ani ewoluować.
