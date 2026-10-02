# ADR 0002: Determinizm symulacji: całkowite ticki, stan całkowitoliczbowy, brak losowości

- Status: zaakceptowany
- Data: 2026-10-02

## Kontekst

Wynik walki musi być identyczny bit w bit w każdej przeglądarce i w Node. Od tego zależą testy golden, skrypt balansu i odtwarzanie zgłoszonych walk w piaskownicy.

Brief startowy zakładał liczby zmiennoprzecinkowe z zakazem funkcji przestępnych oraz RNG z ziarnem. W planowaniu ustalono dwie rzeczy, które pozwalają pójść dalej:

- autor gry chce **zerowej losowości** w walce (ten sam skład zawsze daje ten sam wynik);
- pole walki jest jednowymiarowe, więc do liczenia odległości nie jest potrzebny `sqrt`.

## Decyzja

1. Stały krok 30 Hz. Czas w sim liczony wyłącznie w całkowitych tickach.
2. Cały stan sim to liczby całkowite w tablicach typowanych: pozycje, zasięgi i kroki ruchu w podjednostkach (1 jednostka świata = 256), HP i obrażenia jako inty.
3. Sim nie używa losowości. `createBattle` nie przyjmuje ziarna. RNG z `core` służy wyłącznie efektom kosmetycznym w `render`.
4. W sim obowiązuje zakaz `Math.random`, `Date.now`, `performance.now` oraz funkcji przestępnych. Dozwolone: `+ - * /` z jawnym zaokrągleniem, `abs`, `min`, `max`, `floor`, `ceil`, `round`, `trunc`, `Math.imul`.
5. Konwersja wartości „na sekundę” i jednostek świata na ticki i podjednostki odbywa się tylko w kompilacji treści.
6. Iteracja po `unitId` rosnąco; remisy rozstrzyga niższe id.
7. Testy golden przechowują hash stanu końcowego i hash logu zdarzeń dla ustalonych walk.

## Konsekwencje

- Hash stanu to prosty przebieg po tablicach całkowitych; znikają pułapki `-0`, NaN i kumulacji błędów zaokrągleń.
- Statystyki efektywne różnią się nieznacznie od wpisanych w danych (np. `attackSpeed` 1,3 daje odstęp 23 ticków, czyli 1,304 ataku/s). UI i raport balansu pokazują wartości efektywne.
- Skrypt balansu nie mierzy procentu wygranych, bo jedna walka daje pełną odpowiedź. Raportuje wynik, czas, zapas HP i najniższą wygrywającą rangę składu referencyjnego.
- Powtórka poziomu tym samym składem zawsze kończy się tak samo, co wpływa na projekt nagród za powtórki ([GAME_DESIGN.md §5.4](../GAME_DESIGN.md)).
- Wprowadzenie losowości w przyszłości (krytyki, rozrzut) wymaga nowego ADR, przywrócenia ziarna w API i wymiany wszystkich hashy golden.
- Maksymalna pozycja (1000 × 256) i iloczyny używane w sim mieszczą się z dużym zapasem w 32 bitach.
