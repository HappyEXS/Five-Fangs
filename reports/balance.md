# Raport balansu poziomów

Wygenerowany przez `pnpm balance` (ADR 0025). Nie edytuj ręcznie.

Złoto z pierwszych przejść całej gry: 60000.

Skład odniesienia wydaje całe złoto zdobyte przed poziomem: najpierw kupuje brakujących bohaterów, potem rozwija wszystkich równo. Rangi w kolumnie „Skład” idą od frontu: litera to stopień formy na głównej drodze ewolucji (A forma bazowa, B pierwsza ewolucja, C druga), cyfra to liczba ulepszeń. Procent przy wyniku to życie, które zostało zwycięskiej stronie.

Ocena zwykłego poziomu: skład odniesienia bez run wygrywa, a skład sprzed poprzedniej nagrody przegrywa. Ocena bossa i poziomów po zamknięciu rozwoju składu: bez run przegrana, z runami zdobytymi wcześniej wygrana.

| Poziom | Złoto przed | Skład | Runy | Bez run | Z runami | Skład sprzed nagrody | Bez run wystarcza złoto od | Ocena |
|---|---|---|---|---|---|---|---|---|
| w1_l1 | 0 | 2 × A0 | 0 | wygrana 16 s, 11% | wygrana 16 s, 11% |  | w1_l1 | zgodny |
| w1_l2 | 200 | 3 × A0 | 0 | wygrana 19 s, 8% | wygrana 19 s, 8% | przegrana 10 s, 56% | w1_l2 | zgodny |
| w1_l3 | 400 | 4 × A0 | 0 | wygrana 22 s, 9% | wygrana 22 s, 9% | przegrana 14 s, 45% | w1_l3 | zgodny |
| w1_l4 | 600 | 5 × A0 | 1 | wygrana 25 s, 8% | wygrana 25 s, 12% | przegrana 14 s, 50% | w1_l4 | zgodny |
| w1_l5 | 850 | 5 × A1 | 1 | wygrana 27 s, 8% | wygrana 27 s, 6% | przegrana 20 s, 31% | w1_l5 | zgodny |
| w1_l6 (boss) | 1150 | A3 A2 A2 A2 A2 | 1 (wymagane) | przegrana 26 s, 7% | wygrana 25 s, 8% | przegrana 20 s, 23% | w2_l1 | zgodny |
| w2_l1 | 1600 | 5 × A4 | 2 | wygrana 17 s, 8% | wygrana 16 s, 31% | przegrana 14 s, 29% | w2_l1 | zgodny |
| w2_l2 | 2050 | B0 A4 A4 A4 A4 | 2 | wygrana 22 s, 8% | wygrana 18 s, 28% | przegrana 22 s, 9% | w2_l2 | zgodny |
| w2_l3 | 2550 | B0 A4 B0 A4 A4 | 2 | wygrana 16 s, 8% | wygrana 14 s, 24% | przegrana 16 s, 37% | w2_l3 | zgodny |
| w2_l4 | 3150 | B0 A4 B0 B0 A4 | 3 | wygrana 14 s, 8% | wygrana 13 s, 33% | przegrana 15 s, 4% | w2_l4 | zgodny |
| w2_l5 | 3850 | B1 B0 B0 B0 B0 | 3 | wygrana 24 s, 21% | wygrana 16 s, 45% | przegrana 31 s, 9% | w2_l5 | zgodny |
| w2_l6 (boss) | 4650 | 5 × B1 | 3 (wymagane) | przegrana 21 s, 8% | wygrana 21 s, 9% | przegrana 18 s, 22% | w3_l1 | zgodny |
| w3_l1 | 5600 | 5 × B2 | 4 | wygrana 33 s, 8% | wygrana 28 s, 34% | przegrana 27 s, 9% | w3_l1 | zgodny |
| w3_l2 | 6300 | B3 B2 B3 B3 B2 | 4 | wygrana 27 s, 8% | wygrana 27 s, 19% | przegrana 28 s, 2% | w3_l2 | zgodny |
| w3_l3 | 7050 | B4 B3 B4 B3 B3 | 4 | wygrana 27 s, 8% | wygrana 26 s, 19% | przegrana 25 s, 7% | w3_l3 | zgodny |
| w3_l4 | 7900 | 5 × B4 | 5 | wygrana 27 s, 11% | wygrana 19 s, 31% | przegrana 25 s, 16% | w3_l4 | zgodny |
| w3_l5 | 9200 | C0 B4 B4 B4 B4 | 5 | wygrana 25 s, 8% | wygrana 25 s, 16% | przegrana 25 s, 4% | w3_l5 | zgodny |
| w3_l6 (boss) | 10800 | C0 B4 C0 B4 B4 | 5 (wymagane) | przegrana 21 s, 6% | wygrana 26 s, 8% | przegrana 17 s, 21% | w4_l1 | zgodny |
| w4_l1 | 12400 | C0 B4 C0 C0 B4 | 6 | wygrana 23 s, 8% | wygrana 19 s, 30% | przegrana 14 s, 40% | w4_l1 | zgodny |
| w4_l2 | 14000 | C0 B4 C0 C0 C0 | 6 | wygrana 22 s, 8% | wygrana 17 s, 25% | przegrana 18 s, 6% | w4_l2 | zgodny |
| w4_l3 | 15600 | 5 × C0 | 6 | wygrana 20 s, 8% | wygrana 18 s, 23% | przegrana 17 s, 20% | w4_l3 | zgodny |
| w4_l4 | 17300 | C1 C0 C1 C0 C0 | 7 | wygrana 23 s, 8% | wygrana 18 s, 27% | przegrana 22 s, 3% | w4_l4 | zgodny |
| w4_l5 | 19100 | C1 C0 C1 C1 C1 | 7 | wygrana 22 s, 8% | wygrana 17 s, 29% | przegrana 23 s, 3% | w4_l5 | zgodny |
| w4_l6 (boss) | 21000 | C2 C1 C1 C1 C1 | 7 (wymagane) | przegrana 19 s, 19% | wygrana 21 s, 8% | przegrana 19 s, 19% | w5_l2 | zgodny |
| w5_l1 | 23300 | C2 C1 C2 C2 C2 | 8 | wygrana 28 s, 8% | wygrana 19 s, 37% | przegrana 23 s, 15% | w5_l1 | zgodny |
| w5_l2 | 25300 | C3 C2 C3 C2 C2 | 8 | wygrana 27 s, 8% | wygrana 19 s, 40% | przegrana 22 s, 10% | w5_l2 | zgodny |
| w5_l3 | 27400 | C3 C2 C3 C3 C3 | 8 | wygrana 30 s, 8% | wygrana 25 s, 26% | przegrana 25 s, 5% | w5_l3 | zgodny |
| w5_l4 | 29600 | C4 C3 C4 C3 C3 | 9 | wygrana 33 s, 8% | wygrana 26 s, 23% | przegrana 20 s, 36% | w5_l4 | zgodny |
| w5_l5 | 31900 | 5 × C4 | 9 | wygrana 26 s, 8% | wygrana 20 s, 32% | przegrana 24 s, 14% | w5_l5 | zgodny |
| w5_l6 (boss) | 34300 | 5 × C4 | 9 (wymagane) | przegrana 14 s, 40% | wygrana 26 s, 8% | przegrana 14 s, 40% | nigdy | zgodny |
| w6_l1 | 37100 | 5 × C4 | 10 (wymagane) | przegrana 13 s, 37% | wygrana 19 s, 8% | przegrana 13 s, 37% | nigdy | zgodny |
| w6_l2 | 40100 | 5 × C4 | 10 (wymagane) | przegrana 13 s, 34% | wygrana 19 s, 8% | przegrana 13 s, 34% | nigdy | zgodny |
| w6_l3 | 43500 | 5 × C4 | 10 (wymagane) | przegrana 15 s, 35% | wygrana 27 s, 8% | przegrana 15 s, 35% | nigdy | zgodny |
| w6_l4 | 47200 | 5 × C4 | 11 (wymagane) | przegrana 19 s, 16% | wygrana 27 s, 8% | przegrana 19 s, 16% | nigdy | zgodny |
| w6_l5 | 51200 | 5 × C4 | 11 (wymagane) | przegrana 14 s, 40% | wygrana 20 s, 8% | przegrana 14 s, 40% | nigdy | zgodny |
| w6_l6 (boss) | 55500 | 5 × C4 | 11 (wymagane) | przegrana 12 s, 46% | wygrana 16 s, 8% | przegrana 12 s, 46% | nigdy | zgodny |
