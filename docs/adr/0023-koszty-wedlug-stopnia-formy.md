# ADR 0023: koszty ulepszeń i ewolucji według stopnia formy

- Status: zaakceptowany (reguły od autora gry 2026-10-07; liczby to propozycja wykonawcy, do jego oceny i do balansu)
- Data: 2026-10-07

## Kontekst

Dotąd każda forma w `lines.json` miała własną listę czterech rosnących kosztów ulepszeń i własny koszt ewolucji (ADR 0016). W praktyce wszystkie linie miały te same liczby: ulepszenia formy bazowej 50, 80, 120, 180, ewolucja 250, potem 300–750, ewolucja 1200, potem 1000–2200. Gracz przy każdym zakupie widział inną kwotę, a ewolucja bywała tańsza od ulepszeń formy, w którą prowadziła (250 wobec 300, 1200 wobec 1300).

Autor gry chce uprościć zakupy:

- każde ulepszenie kosztuje tyle samo, cena nie rośnie z kolejnym ulepszeniem;
- ewolucje są droższe niż ulepszenia;
- im wyższy stopień postaci, tym wyższe ceny ulepszeń i ewolucji;
- liczby ma zaproponować wykonawca, bez oglądania się na balans, który jest osobnym tematem na później.

## Decyzja

**Cena zależy tylko od stopnia formy.** Jedna tabela w `progression.json` zastępuje koszty przy każdej z 42 form:

```json
"tiers": [
  { "upgradeCost": 50 },
  { "evolveCost": 400, "upgradeCost": 200 },
  { "evolveCost": 1600, "upgradeCost": 800 }
]
```

| Stopień formy | Ewolucja w tę formę | Każde z 4 ulepszeń | Komplet ulepszeń |
|---|---|---|---|
| bazowa (ze sklepu za 200) | — | 50 | 200 |
| po pierwszej ewolucji | 400 | 200 | 800 |
| po drugiej ewolucji | 1600 | 800 | 3200 |

Liczby mają jedną regułę, którą łatwo zapamiętać: **każdy stopień jest cztery razy droższy od poprzedniego, a ewolucja kosztuje tyle co dwa ulepszenia nowej formy**. Bohater doprowadzony od zakupu do końca drogi kosztuje 6400 złota (dawniej 10 280).

Dlaczego te wartości:

- Pierwsze ulepszenie nadal kosztuje 50, więc nagroda za pierwszy poziom gry (100) wystarcza na ulepszenie obu bohaterów startowych, jak dotąd.
- Nagrody pierwszego świata nadal wystarczają na rangi, których wymagają kolejne poziomy (dwóch bohaterów: 100, 300, 1200, 2000, 2800 złota narastająco wobec 100, 500, 1360, 2760, 5360 zdobytych), więc nowa gra nie utyka. Zostaje nadwyżka, której dawniej nie było.

**Reguły pilnuje walidator treści** (`checkTierCosts` w `content/load-lines.ts`), więc zmiana liczb nie może ich po cichu złamać:

- forma bazowa nie ma kosztu ewolucji, każdy wyższy stopień go ma;
- ulepszenie i ewolucja drożeją z każdym stopniem;
- ewolucja kosztuje więcej niż ulepszenie formy, z której się ewoluuje, i formy, w którą się ewoluuje;
- tabela opisuje każdy stopień, na którym stoi jakaś forma.

W `lines.json` forma to już tylko jednostka i forma, z której powstaje; schemat odrzuca koszty wpisane przy formie. Skompilowana forma (`CompiledForm`) nadal niesie `evolveCost` i jedno `upgradeCost`, więc reguły gry i interfejs czytają cenę tak jak dotąd.

**Interfejs:** karta formy w Bohaterach pokazuje „Ulepszenia 4 × cena” zamiast czterech kwot; przycisk „Kup” w składzie pokazuje stałą cenę ulepszenia; okienko „i” w Bohaterach mówi, że każde ulepszenie kosztuje tyle samo i że ceny rosną ze stopniem.

## Konsekwencje

- Zapis się nie zmienia: bohater zapisuje formę i liczbę ulepszeń, nie wydane złoto. Kto kupił ulepszenia po starych cenach, nie dostaje zwrotu ani dopłaty.
- Raport balansu się nie zmienia: mierzy rangi (liczbę ulepszeń), nie złoto.
- Gra jest dziś tańsza: komplet dla jednego bohatera to 62% dawnej ceny, a nagrody światów 2–6 idą w tysiące. Ceny i nagrody ustawi balans; do zmiany jest pięć liczb w jednym miejscu.
- Wszystkie szczepy płacą tak samo. Gdyby któryś miał być droższy, tabela musiałaby dostać wariant per linia; dziś nie ma takiej potrzeby.
- Zdanie z dokumentu projektu, że nagroda za poziom wystarcza **dokładnie** na rangę oczekiwaną na następnym, przestało być prawdziwe: wystarcza z zapasem.

## Odrzucone warianty

- **Jedna cena ulepszenia wpisana przy każdej formie** (`upgradeCost` zamiast listy): 78 liczb do utrzymania zamiast pięciu i nic nie pilnuje, że formy tego samego stopnia kosztują tyle samo.
- **Okrągłe 100 / 500 / 1500 z ewolucjami 600 / 2500:** bliższe dawnym sumom, ale nagroda za pierwszy poziom (100) wystarcza wtedy na ulepszenie tylko jednego z dwóch bohaterów startowych, a nagrody pierwszego świata nie pokrywają rang, których wymagają kolejne poziomy (przed czwartym poziomem potrzeba 2000 złota wobec 1360 zdobytych). Wymagałoby to zmiany nagród, czyli balansu.
