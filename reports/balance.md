# Raport balansu poziomów

Wygenerowany przez `pnpm balance` (ADR 0025). Nie edytuj ręcznie.

Złoto z pierwszych przejść całej gry: 60000.

Skład odniesienia wydaje całe złoto zdobyte przed poziomem: najpierw kupuje brakujących bohaterów, potem rozwija wszystkich równo. Rangi w kolumnie „Skład” idą od frontu: litera to stopień formy na głównej drodze ewolucji (A forma bazowa, B pierwsza ewolucja, C druga), cyfra to liczba ulepszeń. Procent przy wyniku to życie, które zostało zwycięskiej stronie.

Ocena zwykłego poziomu: skład odniesienia bez run wygrywa, a skład sprzed poprzedniej nagrody przegrywa. Ocena bossa i poziomów po zamknięciu rozwoju składu: bez run przegrana, z runami wygrana. Runy składu odniesienia to te, które odblokował w drzewku za żetony zdobyte wcześniej (ADR 0026); kolumna „Runy” podaje ich liczbę.

| Poziom | Złoto przed | Skład | Runy | Bez run | Z runami | Skład sprzed nagrody | Bez run wystarcza złoto od | Ocena |
|---|---|---|---|---|---|---|---|---|
| w1_l1 | 0 | 2 × A0 | 0 | wygrana 16 s, 11% | wygrana 16 s, 11% |  | w1_l1 | zgodny |
| w1_l2 | 200 | 3 × A0 | 0 | wygrana 19 s, 8% | wygrana 19 s, 8% | przegrana 10 s, 56% | w1_l2 | zgodny |
| w1_l3 | 400 | 4 × A0 | 1 | wygrana 22 s, 9% | wygrana 17 s, 24% | przegrana 14 s, 45% | w1_l3 | zgodny |
| w1_l4 | 600 | 5 × A0 | 1 | wygrana 24 s, 8% | przegrana 27 s, 1% | przegrana 12 s, 60% | w1_l4 | zgodny |
| w1_l5 | 850 | 5 × A1 | 1 | wygrana 27 s, 8% | wygrana 24 s, 31% | przegrana 21 s, 29% | w1_l5 | zgodny |
| w1_l6 (boss) | 1150 | A3 A2 A2 A2 A2 | 2 (wymagane) | przegrana 21 s, 29% | wygrana 21 s, 8% | przegrana 21 s, 26% | w2_l1 | zgodny |
| w2_l1 | 1600 | 5 × A4 | 2 | wygrana 17 s, 8% | wygrana 16 s, 32% | przegrana 14 s, 26% | w2_l1 | zgodny |
| w2_l2 | 2050 | B0 A4 A4 A4 A4 | 2 | wygrana 26 s, 8% | przegrana 27 s, 20% | przegrana 27 s, 24% | w2_l2 | zgodny |
| w2_l3 | 2550 | B0 A4 B0 A4 A4 | 3 | wygrana 25 s, 8% | wygrana 20 s, 24% | przegrana 18 s, 24% | w2_l3 | zgodny |
| w2_l4 | 3150 | B0 A4 B0 B0 A4 | 3 | wygrana 24 s, 8% | wygrana 21 s, 24% | przegrana 25 s, 10% | w2_l4 | zgodny |
| w2_l5 | 3850 | B1 B0 B0 B0 B0 | 3 | wygrana 24 s, 8% | wygrana 22 s, 21% | przegrana 16 s, 4% | w2_l5 | zgodny |
| w2_l6 (boss) | 4650 | 5 × B1 | 4 (wymagane) | przegrana 19 s, 16% | wygrana 20 s, 8% | przegrana 19 s, 17% | w3_l1 | zgodny |
| w3_l1 | 5600 | 5 × B2 | 4 | wygrana 33 s, 8% | wygrana 24 s, 34% | przegrana 25 s, 20% | w3_l1 | zgodny |
| w3_l2 | 6300 | B3 B2 B3 B3 B2 | 4 | wygrana 24 s, 8% | wygrana 23 s, 29% | przegrana 25 s, 5% | w3_l2 | zgodny |
| w3_l3 | 7050 | B4 B3 B4 B3 B3 | 5 | wygrana 28 s, 8% | wygrana 24 s, 29% | przegrana 23 s, 17% | w3_l3 | zgodny |
| w3_l4 | 7900 | 5 × B4 | 5 | wygrana 29 s, 8% | wygrana 25 s, 24% | przegrana 24 s, 10% | w3_l4 | zgodny |
| w3_l5 | 9200 | C0 B4 B4 B4 B4 | 5 | wygrana 29 s, 8% | wygrana 29 s, 11% | przegrana 24 s, 16% | w3_l5 | zgodny |
| w3_l6 (boss) | 10800 | C0 B4 C0 B4 B4 | 6 (wymagane) | przegrana 16 s, 24% | wygrana 20 s, 8% | przegrana 17 s, 25% | w4_l1 | zgodny |
| w4_l1 | 12400 | C0 B4 C0 C0 B4 | 6 | wygrana 23 s, 8% | wygrana 21 s, 28% | przegrana 15 s, 44% | w4_l1 | zgodny |
| w4_l2 | 14000 | C0 B4 C0 C0 C0 | 6 | wygrana 23 s, 8% | wygrana 18 s, 20% | przegrana 22 s, 2% | w4_l2 | zgodny |
| w4_l3 | 15600 | 5 × C0 | 7 | wygrana 22 s, 8% | wygrana 17 s, 31% | przegrana 18 s, 22% | w4_l3 | zgodny |
| w4_l4 | 17300 | C1 C0 C1 C0 C0 | 7 | wygrana 19 s, 8% | wygrana 18 s, 25% | przegrana 21 s, 1% | w4_l4 | zgodny |
| w4_l5 | 19100 | C1 C0 C1 C1 C1 | 7 | wygrana 17 s, 8% | wygrana 17 s, 14% | przegrana 18 s, 5% | w4_l5 | zgodny |
| w4_l6 (boss) | 21000 | C2 C1 C1 C1 C1 | 8 (wymagane) | przegrana 23 s, 7% | wygrana 21 s, 8% | przegrana 20 s, 18% | w5_l2 | zgodny |
| w5_l1 | 23300 | C2 C1 C2 C2 C2 | 8 | wygrana 17 s, 8% | wygrana 16 s, 19% | przegrana 19 s, 0% | w5_l1 | zgodny |
| w5_l2 | 25300 | C3 C2 C3 C2 C2 | 8 | wygrana 18 s, 8% | wygrana 17 s, 23% | przegrana 17 s, 7% | w5_l2 | zgodny |
| w5_l3 | 27400 | C3 C2 C3 C3 C3 | 9 | wygrana 19 s, 8% | wygrana 17 s, 20% | przegrana 19 s, 6% | w5_l3 | zgodny |
| w5_l4 | 29600 | C4 C3 C4 C3 C3 | 9 | wygrana 20 s, 8% | wygrana 17 s, 22% | przegrana 16 s, 21% | w5_l4 | zgodny |
| w5_l5 | 31900 | 5 × C4 | 9 | wygrana 16 s, 8% | wygrana 15 s, 33% | przegrana 18 s, 9% | w5_l5 | zgodny |
| w5_l6 (boss) | 34300 | 5 × C4 | 10 (wymagane) | przegrana 15 s, 12% | wygrana 17 s, 8% | przegrana 15 s, 12% | nigdy | zgodny |
| w6_l1 | 37100 | 5 × C4 | 10 (wymagane) | przegrana 13 s, 15% | wygrana 17 s, 8% | przegrana 13 s, 15% | nigdy | zgodny |
| w6_l2 | 40100 | 5 × C4 | 10 (wymagane) | przegrana 12 s, 31% | wygrana 17 s, 8% | przegrana 12 s, 31% | nigdy | zgodny |
| w6_l3 | 43500 | 5 × C4 | 11 (wymagane) | przegrana 17 s, 13% | wygrana 25 s, 8% | przegrana 17 s, 13% | nigdy | zgodny |
| w6_l4 | 47200 | 5 × C4 | 11 (wymagane) | przegrana 14 s, 27% | wygrana 22 s, 9% | przegrana 14 s, 27% | nigdy | zgodny |
| w6_l5 | 51200 | 5 × C4 | 11 (wymagane) | przegrana 15 s, 18% | wygrana 19 s, 8% | przegrana 15 s, 18% | nigdy | zgodny |
| w6_l6 (boss) | 55500 | 5 × C4 | 12 (wymagane) | przegrana 12 s, 33% | wygrana 15 s, 8% | przegrana 12 s, 33% | nigdy | zgodny |

## Inne drogi przez drzewko run

Ten sam skład na poziomach, które wymagają run, gdy żetony wyda inaczej niż plan odniesienia. „Najpierw” znaczy: cały kierunek do końca, potem plan odniesienia. Poziomy są strojone tylko do planu odniesienia; pozostałe kolumny pokazują, ile warte są inne wybory. Runy odrzutu i szybkości jednym bohaterom pomagają, innym szkodzą, a przekłada się je za darmo, więc te kolumny podają najlepsze z czterech rozdań i w nawiasie, komu runy poszły.

| Poziom | Żetony | Plan odniesienia (życie, atak na zmianę) | Najpierw życie | Najpierw atak | Najpierw odrzut | Najpierw szybkość | Wszystkie kierunki po równo |
|---|---|---|---|---|---|---|---|
| w1_l6 | 2 | wygrana 21 s, 8% | wygrana 21 s, 14% | wygrana 21 s, 6% | wygrana 23 s, 7% (walczącym wręcz) | wygrana 20 s, 15% (od frontu) | wygrana 21 s, 8% |
| w2_l6 | 4 | wygrana 20 s, 8% | wygrana 20 s, 14% | wygrana 16 s, 16% | przegrana 32 s, 1% (strzelcom) | przegrana 21 s, 1% (od tyłu) | przegrana 19 s, 7% |
| w3_l6 | 6 | wygrana 20 s, 8% | wygrana 24 s, 6% | wygrana 17 s, 13% | przegrana 19 s, 5% (od tyłu) | przegrana 24 s, 5% (strzelcom) | przegrana 21 s, 2% |
| w4_l6 | 8 | wygrana 21 s, 8% | wygrana 21 s, 9% | wygrana 20 s, 3% | przegrana 22 s, 5% (od frontu) | wygrana 19 s, 9% (od frontu) | przegrana 19 s, 10% |
| w5_l6 | 10 | wygrana 17 s, 8% | przegrana 20 s, 2% | wygrana 17 s, 4% | wygrana 23 s, 9% (strzelcom) | przegrana 17 s, 2% (walczącym wręcz) | przegrana 19 s, 3% |
| w6_l1 | 10 | wygrana 17 s, 8% | wygrana 17 s, 3% | wygrana 17 s, 3% | wygrana 15 s, 28% (strzelcom) | przegrana 15 s, 6% (od frontu) | wygrana 20 s, 2% |
| w6_l2 | 10 | wygrana 17 s, 8% | wygrana 19 s, 6% | przegrana 15 s, 8% | wygrana 21 s, 57% (strzelcom) | przegrana 14 s, 17% (strzelcom) | przegrana 18 s, 9% |
| w6_l3 | 11 | wygrana 25 s, 8% | wygrana 25 s, 8% | wygrana 19 s, 20% | wygrana 20 s, 55% (strzelcom) | wygrana 17 s, 29% (od tyłu) | wygrana 16 s, 28% |
| w6_l4 | 11 | wygrana 22 s, 9% | wygrana 22 s, 9% | wygrana 22 s, 9% | wygrana 20 s, 39% (strzelcom) | przegrana 15 s, 16% (od tyłu) | przegrana 14 s, 26% |
| w6_l5 | 11 | wygrana 19 s, 8% | wygrana 19 s, 8% | wygrana 22 s, 1% | wygrana 14 s, 33% (od frontu) | wygrana 13 s, 27% (walczącym wręcz) | wygrana 13 s, 35% |
| w6_l6 | 12 | wygrana 15 s, 8% | wygrana 15 s, 8% | wygrana 15 s, 8% | przegrana 15 s, 2% (walczącym wręcz) | przegrana 13 s, 10% (od frontu) | przegrana 12 s, 31% |
