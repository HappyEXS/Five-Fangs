# ADR 0016: drzewo ewolucji zamiast dwóch form na linię

- Status: zaakceptowany (zlecenie autora gry z 2026-10-03; kształt drzewa i koszty do jego oceny)
- Data: 2026-10-03

## Kontekst

Do tej pory linia bohatera miała dokładnie dwie formy: bazową i jedną po ewolucji (`forms: [A, B]`), a zapis trzymał formę bohatera jako indeks 0 albo 1. Autor gry chce, żeby ewolucje się rozgałęziały: z jednego bohatera gracz wybiera jedną z dwóch różnych ewolucji, a potem jest jeszcze jeden krok ewolucji. Nowych bohaterów na razie nie ma; do testów drzewa mają służyć kopie obecnych.

## Decyzja

**Linia to drzewo form.** W `lines.json` linia ma listę form; każda forma poza bazową wskazuje formę, z której powstaje (`from`), i koszt ewolucji w nią (`evolveCost`). Każda forma ma własne koszty ulepszeń. (Od 2026-10-07 koszty nie stoją przy formie: wynikają z jej stopnia, ADR 0023.)

```json
{ "id": "swordsman", "price": 200, "starter": true, "forms": [
  { "unit": "swordsman_a", "upgradeCosts": [50, 80, 120, 180] },
  { "unit": "swordsman_b", "from": "swordsman_a", "evolveCost": 250, "upgradeCosts": [300, 400, 550, 750] },
  { "unit": "swordsman_c", "from": "swordsman_a", "evolveCost": 250, "upgradeCosts": [300, 400, 550, 750] },
  { "unit": "swordsman_b2", "from": "swordsman_b", "evolveCost": 1200, "upgradeCosts": [1000, 1300, 1700, 2200] },
  { "unit": "swordsman_c2", "from": "swordsman_c", "evolveCost": 1200, "upgradeCosts": [1000, 1300, 1700, 2200] }
] }
```

- Kształt drzewa jest dowolny: forma może mieć jedną następną (zwykła ewolucja), kilka (wybór drogi) albo żadnej (koniec drogi). Kompilacja (`content/load-lines.ts`) sprawdza: dokładnie jedna forma bazowa, każda forma osiągalna z niej jedną drogą (bez cykli), `from` w tej samej linii, `from` i `evolveCost` podane razem, znane jednostki, każda jednostka w jednej linii, komplet kosztów ulepszeń.
- **Reguła ewolucji:** po komplecie ulepszeń bieżącej formy bohater może ewoluować w jedną z jej następnych form; płaci koszt tej formy, dostaje ją bez ulepszeń, runy zostają (`game/evolution.ts`). Ewolucja jest nieodwracalna, więc wybór drogi jest wyborem na stałe.
- **Zapis v3:** forma bohatera to id jednostki zamiast indeksu. Migracja v2 → v3 zamienia 0 na `<linia>_a`, a 1 na `<linia>_b`, bo tak nazywały się jedyne formy w treści z czasów zapisu v2. Forma, której nie ma w bieżącym drzewie linii, wraca przy wczytaniu do formy bazowej bez ulepszeń (`reconcileSave`).
- **Skład:** gdy z formy wychodzi jedna droga, przycisk „Ewolucja” w polu bohatera kupuje ją od razu. Gdy kilka, otwiera okienko z drogami obok siebie: nazwa, najważniejsze statystyki po ewolucji względem obecnych, cechy i zakup każdej drogi.
- **Bohaterowie:** zakładka pokazuje drzewo linii jako siatkę (kolumna to stopień, rozwidlenie zajmuje wiersze swoich gałęzi) z kosztami ewolucji, postacie drogi przez wybraną formę na scenie i kartę formy: skąd powstaje, w co może ewoluować, statystyki względem formy, z której powstaje, koszty ulepszeń.
- **Balans:** rangi składu referencyjnego idą główną drogą, czyli na każdym stopniu pierwszą formą z treści: A0–A4, B0–B4, C0–C4.
- **Treść testowa:** każda z czterech linii ma drzewo: forma bazowa → dotychczasowa forma po ewolucji albo kopia formy po ewolucji innej linii → po jednym dalszym stopniu każdej drogi (kopia poprzedniego stopnia z życiem i atakiem ×1,35 i postacią o 10% większą). Nazwy kopii mają dopisek „(kopia)”. Koszty: ewolucja 250 i 1200, ulepszenia trzeciego stopnia 1000–2200; to liczby robocze, a nie balans.

## Konsekwencje

- Docelowy roster autor gry poda jako drzewa w tym samym formacie; kopie testowe znikną razem ze swoimi wpisami w `heroes.json` i słownikach. Zapisy z kopiami wrócą wtedy do formy bazowej (bez migracji, przez `reconcileSave`).
- **Uzupełnienie (2026-10-06, M5j):** kopie testowe znikły, gdy cztery linie ludzi stały się dwoma szczepami po siedem form. Wbrew zapowiedzi wyżej dostały migrację zapisu (v3 → v4): gra działa już u testerów, a bez migracji bohaterowie linii Tarczowników i Akolitów przepadliby, a formy-kopie wróciły do formy bazowej bez ulepszeń. Każda kopia wskazuje w migracji prawdziwą formę tej samej postaci.
- Dłuższe drogi mieszczą się w danych i w UI: siatka drzewa ma tyle kolumn, ile stopni, a scena zakładki pokazuje do pięciu form jednej drogi.
- Wybór drogi jest nieodwracalny. Gracz, który chce drugiej drogi, kupuje kolejny egzemplarz tej samej linii w sklepie (egzemplarze są niezależne od M5b).
- Raport balansu ma kolumny C0–C4. Świat „Las” kończy się na B4, więc jego oczekiwane rangi się nie zmieniły.

## Uzupełnienie z 2026-10-07: szczepy wrogów w zakładce Bohaterowie

Autor gry dodał szczep Akronix, który jest wyłącznie przeciwnikiem, i poprosił, żeby informacja o nim była w zakładce Bohaterowie. Szczep wrogów nie ma drzewa ewolucji, cen ani ulepszeń, więc dostał osobny widok w tej samej zakładce.

- **Treść:** plik `enemy-tribes.json` wymienia stopnie szczepu i jednostki z `units/enemies.json` w kolejności siły. Id szczepu wrogów nie może pokrywać się z id linii bohaterów, bo zakładki rozróżniają je po samym id; scena `heroes` niesie to id w polu `line`, a wybraną postać w polu `form`.
- **Zakładka** stoi za szczepami bohaterów, odsunięta i ciemniejsza; wybrana jest czerwona (kolor przeciwnika z pasków życia), nie nagietkowa.
- **Poczet zamiast drzewa:** kolumna to stopień (zwiadowca, żołnierz, wojownik, generał, boss), pod jego nazwą postacie od najsłabszej. Te same przyciski z miniaturką co w drzewie, bez kosztów.
- **Scena** pokazuje cały stopień wybranej postaci (jedną do trzech), po stronie przeciwnika: patrzą w lewo i mają czerwone paski życia, tak jak gracz zobaczy je w walce. Trzej Axiny obok siebie pokazują różnicę wielkości.
- **Karta:** miniaturka, nazwa, szczep i stopień, statystyki bez wzmocnień i cechy. Bez ceny, kosztów ulepszeń, strzałek i przycisku „i” (nie ma czego porównywać).
- **Okienko „i” przy tytule** zmienia treść na: to szczep wrogów, nie da się go kupić ani rozwijać; na poziomach wróg bywa wzmocniony („+N”).
- Dotychczasowe jednostki specjalne świata „Las” (Osiłek, Łupieżca, Szaman, Herszt) nie należą do żadnego szczepu i nie mają zakładki; mogą ją dostać, gdy autor nazwie ich szczep.
- Akronix nie stoi na razie na żadnym poziomie. Gdy poziomy powstaną, poczet można odsłaniać stopniowo (postać pojawia się po pierwszym spotkaniu); dziś pokazuje wszystkich od razu.
