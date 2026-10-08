# Raport balansu poziomów

Wygenerowany przez `pnpm balance` (ADR 0025). Nie edytuj ręcznie.

Złoto z pierwszych przejść całej gry: 60000.

Skład odniesienia wydaje całe złoto zdobyte przed poziomem: najpierw kupuje brakujących bohaterów, potem rozwija wszystkich równo. Rangi w kolumnie „Skład” idą od frontu: litera to stopień formy na głównej drodze ewolucji (A forma bazowa, B pierwsza ewolucja, C druga), cyfra to liczba ulepszeń. Procent przy wyniku to życie, które zostało zwycięskiej stronie.

Ocena zwykłego poziomu: skład odniesienia bez run wygrywa, a skład sprzed poprzedniej nagrody przegrywa. Ocena bossa i poziomów po zamknięciu rozwoju składu: bez run przegrana, z runami wygrana. Runy składu odniesienia to te, które odblokował w drzewku za żetony zdobyte wcześniej (ADR 0026); kolumna „Runy” podaje ich liczbę.

| Poziom | Złoto przed | Skład | Runy | Bez run | Z runami | Skład sprzed nagrody | Bez run wystarcza złoto od | Ocena |
|---|---|---|---|---|---|---|---|---|
| w1_l1 | 0 | 2 × A0 | 0 | wygrana 16 s, 11% | wygrana 16 s, 11% |  | w1_l1 | zgodny |
| w1_l2 | 200 | 3 × A0 | 0 | wygrana 19 s, 8% | wygrana 19 s, 8% | przegrana 10 s, 56% | w1_l2 | zgodny |
| w1_l3 | 400 | 4 × A0 | 1 | wygrana 22 s, 9% | wygrana 18 s, 28% | przegrana 14 s, 45% | w1_l3 | zgodny |
| w1_l4 | 600 | 5 × A0 | 1 | wygrana 25 s, 8% | wygrana 25 s, 10% | przegrana 14 s, 50% | w1_l4 | zgodny |
| w1_l5 | 850 | 5 × A1 | 1 | wygrana 27 s, 8% | wygrana 25 s, 20% | przegrana 20 s, 31% | w1_l5 | zgodny |
| w1_l6 (boss) | 1150 | A3 A2 A2 A2 A2 | 2 (wymagane) | przegrana 26 s, 5% | wygrana 24 s, 8% | przegrana 21 s, 24% | w2_l1 | zgodny |
| w2_l1 | 1600 | 5 × A4 | 2 | wygrana 17 s, 8% | wygrana 16 s, 31% | przegrana 14 s, 29% | w2_l1 | zgodny |
| w2_l2 | 2050 | B0 A4 A4 A4 A4 | 2 | wygrana 22 s, 8% | wygrana 21 s, 9% | przegrana 22 s, 9% | w2_l2 | zgodny |
| w2_l3 | 2550 | B0 A4 B0 A4 A4 | 3 | wygrana 16 s, 8% | wygrana 14 s, 26% | przegrana 16 s, 37% | w2_l3 | zgodny |
| w2_l4 | 3150 | B0 A4 B0 B0 A4 | 3 | wygrana 14 s, 8% | wygrana 14 s, 23% | przegrana 15 s, 4% | w2_l4 | zgodny |
| w2_l5 | 3850 | B1 B0 B0 B0 B0 | 3 | wygrana 24 s, 21% | wygrana 16 s, 44% | przegrana 31 s, 9% | w2_l5 | zgodny |
| w2_l6 (boss) | 4650 | 5 × B1 | 4 (wymagane) | przegrana 21 s, 12% | wygrana 21 s, 8% | przegrana 18 s, 24% | w3_l2 | zgodny |
| w3_l1 | 5600 | 5 × B2 | 4 | wygrana 33 s, 8% | wygrana 28 s, 33% | przegrana 27 s, 9% | w3_l1 | zgodny |
| w3_l2 | 6300 | B3 B2 B3 B3 B2 | 4 | wygrana 27 s, 8% | wygrana 27 s, 18% | przegrana 28 s, 2% | w3_l2 | zgodny |
| w3_l3 | 7050 | B4 B3 B4 B3 B3 | 5 | wygrana 27 s, 8% | wygrana 26 s, 29% | przegrana 25 s, 7% | w3_l3 | zgodny |
| w3_l4 | 7900 | 5 × B4 | 5 | wygrana 27 s, 11% | wygrana 21 s, 27% | przegrana 25 s, 16% | w3_l4 | zgodny |
| w3_l5 | 9200 | C0 B4 B4 B4 B4 | 5 | wygrana 25 s, 8% | wygrana 25 s, 13% | przegrana 25 s, 4% | w3_l5 | zgodny |
| w3_l6 (boss) | 10800 | C0 B4 C0 B4 B4 | 6 (wymagane) | przegrana 19 s, 8% | wygrana 21 s, 8% | przegrana 17 s, 21% | w4_l1 | zgodny |
| w4_l1 | 12400 | C0 B4 C0 C0 B4 | 6 | wygrana 23 s, 8% | wygrana 21 s, 26% | przegrana 14 s, 40% | w4_l1 | zgodny |
| w4_l2 | 14000 | C0 B4 C0 C0 C0 | 6 | wygrana 22 s, 8% | wygrana 16 s, 23% | przegrana 18 s, 6% | w4_l2 | zgodny |
| w4_l3 | 15600 | 5 × C0 | 7 | wygrana 20 s, 8% | wygrana 18 s, 25% | przegrana 17 s, 20% | w4_l3 | zgodny |
| w4_l4 | 17300 | C1 C0 C1 C0 C0 | 7 | wygrana 23 s, 8% | wygrana 18 s, 26% | przegrana 22 s, 3% | w4_l4 | zgodny |
| w4_l5 | 19100 | C1 C0 C1 C1 C1 | 7 | wygrana 22 s, 8% | wygrana 17 s, 30% | przegrana 23 s, 3% | w4_l5 | zgodny |
| w4_l6 (boss) | 21000 | C2 C1 C1 C1 C1 | 8 (wymagane) | przegrana 22 s, 14% | wygrana 22 s, 9% | przegrana 21 s, 18% | w5_l2 | zgodny |
| w5_l1 | 23300 | C2 C1 C2 C2 C2 | 8 | wygrana 28 s, 8% | wygrana 19 s, 34% | przegrana 23 s, 15% | w5_l1 | zgodny |
| w5_l2 | 25300 | C3 C2 C3 C2 C2 | 8 | wygrana 27 s, 8% | wygrana 20 s, 37% | przegrana 22 s, 10% | w5_l2 | zgodny |
| w5_l3 | 27400 | C3 C2 C3 C3 C3 | 9 | wygrana 30 s, 8% | wygrana 26 s, 26% | przegrana 25 s, 5% | w5_l3 | zgodny |
| w5_l4 | 29600 | C4 C3 C4 C3 C3 | 9 | wygrana 33 s, 8% | wygrana 27 s, 21% | przegrana 20 s, 36% | w5_l4 | zgodny |
| w5_l5 | 31900 | 5 × C4 | 9 | wygrana 26 s, 8% | wygrana 20 s, 33% | przegrana 24 s, 14% | w5_l5 | zgodny |
| w5_l6 (boss) | 34300 | 5 × C4 | 10 (wymagane) | przegrana 16 s, 38% | wygrana 25 s, 8% | przegrana 16 s, 38% | nigdy | zgodny |
| w6_l1 | 37100 | 5 × C4 | 10 (wymagane) | przegrana 13 s, 34% | wygrana 20 s, 9% | przegrana 13 s, 34% | nigdy | zgodny |
| w6_l2 | 40100 | 5 × C4 | 10 (wymagane) | przegrana 14 s, 30% | wygrana 19 s, 8% | przegrana 14 s, 30% | nigdy | zgodny |
| w6_l3 | 43500 | 5 × C4 | 11 (wymagane) | przegrana 15 s, 40% | wygrana 26 s, 8% | przegrana 15 s, 40% | nigdy | zgodny |
| w6_l4 | 47200 | 5 × C4 | 11 (wymagane) | przegrana 16 s, 31% | wygrana 25 s, 8% | przegrana 16 s, 31% | nigdy | zgodny |
| w6_l5 | 51200 | 5 × C4 | 11 (wymagane) | przegrana 14 s, 39% | wygrana 21 s, 8% | przegrana 14 s, 39% | nigdy | zgodny |
| w6_l6 (boss) | 55500 | 5 × C4 | 12 (wymagane) | przegrana 12 s, 47% | wygrana 16 s, 8% | przegrana 12 s, 47% | nigdy | zgodny |

## Inne drogi przez drzewko run

Ten sam skład na poziomach, które wymagają run, gdy żetony wyda inaczej niż plan odniesienia. „Najpierw” znaczy: cały kierunek do końca, potem plan odniesienia. Poziomy są strojone tylko do planu odniesienia; pozostałe kolumny pokazują, ile warte są inne wybory. Runy odrzutu i szybkości jednym bohaterom pomagają, innym szkodzą, a przekłada się je za darmo, więc te kolumny podają najlepsze z czterech rozdań i w nawiasie, komu runy poszły.

| Poziom | Żetony | Plan odniesienia (życie, atak na zmianę) | Najpierw życie | Najpierw atak | Najpierw odrzut | Najpierw szybkość | Wszystkie kierunki po równo |
|---|---|---|---|---|---|---|---|
| w1_l6 | 2 | wygrana 24 s, 8% | wygrana 24 s, 17% | wygrana 26 s, 3% | przegrana 25 s, 21% (od tyłu) | wygrana 20 s, 19% (od tyłu) | wygrana 24 s, 8% |
| w2_l6 | 4 | wygrana 21 s, 8% | wygrana 22 s, 10% | wygrana 17 s, 19% | przegrana 27 s, 1% (strzelcom) | wygrana 20 s, 4% (od tyłu) | przegrana 20 s, 5% |
| w3_l6 | 6 | wygrana 21 s, 8% | wygrana 25 s, 17% | wygrana 17 s, 19% | przegrana 18 s, 9% (od tyłu) | wygrana 24 s, 2% (strzelcom) | przegrana 22 s, 5% |
| w4_l6 | 8 | wygrana 22 s, 9% | wygrana 24 s, 14% | wygrana 18 s, 22% | wygrana 22 s, 7% (od frontu) | wygrana 16 s, 14% (walczącym wręcz) | wygrana 21 s, 3% |
| w5_l6 | 10 | wygrana 25 s, 8% | wygrana 26 s, 2% | przegrana 21 s, 11% | wygrana 36 s, 3% (strzelcom) | przegrana 16 s, 33% (strzelcom) | przegrana 20 s, 15% |
| w6_l1 | 10 | wygrana 20 s, 9% | przegrana 21 s, 4% | przegrana 16 s, 16% | wygrana 21 s, 14% (od frontu) | przegrana 19 s, 12% (od tyłu) | przegrana 16 s, 16% |
| w6_l2 | 10 | wygrana 19 s, 8% | wygrana 23 s, 3% | wygrana 18 s, 3% | wygrana 24 s, 41% (strzelcom) | przegrana 16 s, 21% (od frontu) | przegrana 12 s, 32% |
| w6_l3 | 11 | wygrana 26 s, 8% | wygrana 26 s, 8% | przegrana 23 s, 12% | wygrana 29 s, 28% (od tyłu) | przegrana 13 s, 39% (walczącym wręcz) | przegrana 17 s, 30% |
| w6_l4 | 11 | wygrana 25 s, 8% | wygrana 25 s, 8% | przegrana 22 s, 7% | wygrana 24 s, 34% (strzelcom) | przegrana 15 s, 25% (od tyłu) | przegrana 14 s, 38% |
| w6_l5 | 11 | wygrana 21 s, 8% | wygrana 21 s, 8% | przegrana 17 s, 14% | wygrana 22 s, 12% (od frontu) | przegrana 15 s, 8% (strzelcom) | przegrana 16 s, 10% |
| w6_l6 | 12 | wygrana 16 s, 8% | wygrana 16 s, 8% | wygrana 16 s, 8% | przegrana 13 s, 24% (walczącym wręcz) | przegrana 12 s, 22% (od frontu) | przegrana 13 s, 28% |
