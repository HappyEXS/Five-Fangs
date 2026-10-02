# Propozycja do M5-1: roster, cechy i światy

Status: **propozycja do decyzji autora gry**. Nic z tego dokumentu nie jest jeszcze w danych ani w kodzie. Po akceptacji (w całości albo z poprawkami) treść trafia do [GAME_DESIGN.md](../GAME_DESIGN.md), a ten plik znika.

Liczby poniżej to punkt wyjścia względem obecnych jednostek testowych (miecznik: 600 HP, 40 ataku; łucznik: 350 HP, 30 ataku). Ostateczne wartości ustala balans w M5-6 i M5-7.

## 1. Co już jest ustalone

- 6 linii bohaterów po 2 formy; 3 linie na start, linie 4–6 po bossach światów 1–3.
- 5 światów po 6 poziomów, szósty to boss z unikalną cechą albo kombinacją cech.
- Skład to najwyżej 5 różnych linii, więc przy sześciu liniach jedna zawsze zostaje poza składem.
- Cechy są pasywne; dziś istnieją `periodicHeal` (siebie albo drużynę) i `pierce`.
- Runy: płaskie premie do `attack` i `maxHp`, ok. 15 w całej grze.

## 2. Linie bohaterów

Każda linia ma inną odpowiedź na pytanie „po co ją brać”, a forma B dodaje coś więcej niż liczby.

| # | Linia | Forma A → forma B | Rola | Typ | Cechy A → B | Dostępna |
|---|---|---|---|---|---|---|
| 1 | `swordsman` | Miecznik → Rycerz | Uniwersalny front: średnie HP, atak i odrzut | melee, zasięg 30 | brak → brak; B ma więcej HP i odrzutu | start |
| 2 | `archer` | Łucznik → Strzelec wyborowy | Stałe obrażenia z daleka | ranged, zasięg 220 → 240 | brak → `pierce` | start |
| 3 | `cleric` | Akolita → Kapłan | Leczenie drużyny; sam bije słabo | ranged, zasięg 150 | `periodicHeal` drużyny, mało → więcej i częściej | start |
| 4 | `guard` | Tarczownik → Strażnik | Czołg: najwięcej HP i najwyższy odrzut, wolny, słaby atak | melee, zasięg 30 | brak → `periodicHeal` siebie | po bossie świata 1 |
| 5 | `spearman` | Włócznik → Halabardnik | Bije zza pleców frontu; szybki atak, mało HP | melee, zasięg 70 | brak → `splash` (nowa cecha) | po bossie świata 2 |
| 6 | `crossbow` | Kusznik → Balistyk | Wolne, ciężkie bełty z dużym odrzutem: trzyma wroga na dystans | ranged, zasięg 200 | brak → `pierce` | po bossie świata 3 |

Dlaczego tak:

- Trzy linie startowe dają komplet ról (front, obrażenia, leczenie), więc pierwszy świat da się przejść bez dokupowania.
- Tarczownik i Kusznik wykorzystują odrzut jako narzędzie, a nie dodatek: jeden trzyma linię, drugi ją przesuwa.
- Włócznik jest jedyną jednostką wręcz, która nie musi stać na froncie, więc ustawienie slotów zaczyna mieć znaczenie.
- Przy pięciu slotach i sześciu liniach gracz zawsze z czegoś rezygnuje.

## 3. Nowe cechy pasywne

Każda nowa cecha to osobne zadanie w M5-2 (schemat, symulacja, testy, nowe hashe golden), ok. 1–2 dni.

| Cecha | Parametry | Działanie | Kto by jej używał |
|---|---|---|---|
| `splash` | `radius` | Cios wręcz zadaje pełne obrażenia także każdemu innemu wrogowi w promieniu `radius` od celu. Odrzut dostaje tylko cel. | Halabardnik, boss świata 3 |
| `lifesteal` | `percent` | Po każdym trafieniu jednostka leczy się o `percent` zadanych obrażeń (w tym samym rozstrzygnięciu ticka). | Wrogowie świata 4 i ich boss |
| `enrage` | `threshold`, `percent` | Poniżej `threshold` procent HP ataki zadają o `percent` procent więcej. | Bossowie światów 4 i 5 |

Wszystkie trzy są deterministyczne i nie wymagają nowych faz ticka: `splash` dopisuje trafienia do kolejki w fazie ataków, `lifesteal` dopisuje leczenie, `enrage` zmienia wartość obrażeń w chwili trafienia.

Świadomie nie proponuję efektów czasowych (spowolnienie, ogłuszenie, trucizna): wymagałyby stanu efektów na jednostce i nowej fazy ticka, a ustalenie brzmiało „proste unikalne umiejętności”.

## 4. Światy, wrogowie, bossowie

Wszyscy wrogowie używają rigu humanoidalnego i grafik placeholder. Każdy świat wprowadza jedną nową rzecz, którą gracz musi umieć obejść.

| Świat | Motyw | Zwykli wrogowie | Czego uczy | Boss (poziom 6) |
|---|---|---|---|---|
| 1 | Las, bandyci | Osiłek (melee, odrzut), Zbój (ranged) | Front i tył, podstawy ustawienia | Herszt: duży osiłek z wysokim odrzutem i `periodicHeal` siebie |
| 2 | Bagna | Topielec (melee, `periodicHeal` siebie), Szaman (ranged, `periodicHeal` drużyny) | Trzeba zabijać szybciej, niż wróg się leczy; kolejność celów | Wiedźma: ranged z `pierce` i leczeniem drużyny, z obstawą topielców |
| 3 | Twierdza | Pancerny (melee, bardzo dużo HP i odrzutu), Kusznik (ranged, `pierce`) | Odrzut rozbija szyk; pociski przebijające karzą ustawienie w linii | Kapitan: melee ze `splash` |
| 4 | Pustkowia | Łupieżca (szybki melee, `lifesteal`), Miotacz (ranged, wysoki odrzut) | Wymiana ciosów nie wystarcza, potrzebne skupione obrażenia | Wódz: `lifesteal` i `enrage` |
| 5 | Cytadela | Elitarne wersje wrogów z poprzednich światów | Wszystko naraz | Pięciu przeciwników naraz, każdy z inną cechą |

Nazwy są robocze.

## 5. Runy

Propozycja: zostać przy `attack` i `maxHp`, dodać trzy wielkości każdej (np. atak +10, +25, +50; życie +100, +200, +400). Powody: obie statystyki są liczbami całkowitymi dodawanymi wprost; runy do szybkości ataku, ruchu albo zasięgu zmieniają odstępy w tickach i zasięgi, czyli wymagają przeglądu walidacji symulacji (np. reguły „krok nie większy niż zasięg”).

## 6. Pytania do autora gry

1. Czy sześć linii z sekcji 2 zostaje, czy coś zamienić (np. inna szósta linia)?
2. Które nowe cechy z sekcji 3 wchodzą?
3. Czy motywy światów i bossowie z sekcji 4 pasują do wyobrażenia o grze?
4. Runy: tylko `attack` i `maxHp`, czy także inne statystyki?
