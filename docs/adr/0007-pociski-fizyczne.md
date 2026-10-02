# ADR 0007: Pociski fizyczne zamiast namierzonych

- Status: zaakceptowany (odstępstwo od briefu startowego, §4.5)
- Data: 2026-10-02

## Kontekst

Brief zakładał pocisk namierzony na cel, z czasem lotu ustalonym w chwili strzału (`ceil(dystans / prędkość)`), i zostawiał otwarte pytanie, co się dzieje, gdy cel zginie w locie.

W planowaniu autor gry poprosił o cechę „pociski przelatują przez wszystkie jednostki przeciwnika”. W modelu namierzonym przebijanie wymagałoby osobnej logiki opartej na pozycjach, a śmierć celu byłaby przypadkiem szczególnym z własną regułą.

## Decyzja

Pocisk jest punktem na osi pola walki, lecącym ze stałą prędkością w stronę przeciwnika aż do krawędzi pola. Nie ma przypisanego celu.

- Zwykły pocisk trafia pierwszego żywego wroga na drodze (remis pozycji → niższe `unitId`) i znika.
- Pocisk jednostki z cechą `pierce` trafia każdego wroga, którego minie, każdego najwyżej raz.
- Trafienie wykrywamy przez porównanie położenia względnego przed i po ticku: wróg był przed pociskiem na początku ticka i nie jest przed nim po ruchu obu.
- Obrażenia i odrzut pocisku to `attack` i `knockback` strzelca z chwili wystrzału. Pocisk żyje po śmierci strzelca.

Pełne reguły: [GAME_DESIGN.md §4.4](../GAME_DESIGN.md).

## Konsekwencje

- Śmierć celu w locie nie jest przypadkiem szczególnym: pocisk leci dalej i trafia następnego wroga.
- Przebijanie i zwykłe trafienie to ten sam mechanizm z jedną flagą.
- Czas lotu nie jest znany w chwili strzału; cel idący naprzeciw zostaje trafiony wcześniej.
- Pocisk może trafić wroga spoza zasięgu strzelca, jeśli bliżsi zginęli. To zamierzone.
- Liczba żywych pocisków jest ograniczona z góry przez szerokość pola, prędkość pocisku i odstęp ataków; walidator treści sprawdza, że mieści się w puli.
- Pocisk nie trafia sojuszników i nie zderza się z innymi pociskami.
- Ewentualny zasięg maksymalny pocisku (krótszy niż do krawędzi pola) można dodać jako parametr typu ataku, jeśli balans tego wymaga; będzie to zmiana hashy golden.
