# ADR 0013: Budżet alokacji renderera: zero w kodzie, mierzony limit przydziałów silnika

- Status: proponowany (odstępstwo od budżetu „0 alokacji w gorącej pętli” z `CLAUDE.md`; czeka na akceptację)
- Data: 2026-10-02

## Kontekst

`CLAUDE.md` wymaga zera alokacji w gorącej pętli i wylicza, czego nie wolno robić co klatkę: `new`, literały obiektów i tablic, domknięcia, `map/filter`, spread, `DOMMatrix`, template stringi. Renderer spełnia to od M2-3.

Pomiar z M2-10 ([ARCHITECTURE.md §5.7](../ARCHITECTURE.md)) pokazał, że mimo to silnik V8 alokował ok. 2350 B na klatkę. Sam silnik tworzy na stercie 12-bajtowe obiekty dla liczb, których nie może przekazać w rejestrze:

1. ułamkowych argumentów części metod Canvas 2D (`drawImage`; `setTransform` ich nie pakuje);
2. liczb zmiennoprzecinkowych i całkowitych powyżej 2³⁰ przekazywanych do funkcji albo z niej zwracanych, jeśli kompilator JIT nie wbudował tej funkcji w miejscu wywołania.

Pierwsze źródło (ok. 2100 B na klatkę) zostało usunięte: `blit` przekazuje do `drawImage` wyłącznie liczby całkowite. Po poprawce zostaje ok. 260–285 B na klatkę, z czego 50 B to pomiary czasu obecne tylko w dev. Reszta wygląda na drugie źródło.

Drugie źródło zależy od decyzji kompilatora JIT, których kod nie kontroluje: zmieniają się między wersjami przeglądarki, między kodem deweloperskim a paczką produkcyjną i wraz z rozmiarem funkcji. Dotyczy tylko V8; SpiderMonkey i JavaScriptCore trzymają liczby zmiennoprzecinkowe bezpośrednio w wartości i nie alokują ich wcale. Symulacja uruchamiana w Node (`pnpm bench`) alokuje 0,07 B na tick, czyli nic.

Budżet istnieje po to, żeby odśmiecanie nie zacinało obrazu. 285 B na klatkę to ok. 17 KB/s; młoda generacja V8 ma co najmniej 1 MB, więc zapełnia się nie częściej niż raz na minutę, a jej opróżnienie przy braku żywych obiektów trwa ułamek milisekundy.

Możliwości:

1. Zejść do zera: przekazywać pozycje, fazy animacji i hashe przez tablice typowane zamiast argumentów i wartości zwracanych (`updateUnitPose`, `sampleClip`, `hashInt32`, `spawnNumber`).
2. Zostawić resztę i pilnować jej pomiarem.

## Decyzja

Wariant 2.

- „Zero alokacji” oznacza: kod gorącej pętli nie tworzy obiektów, tablic, domknięć ani napisów (lista z `CLAUDE.md` bez zmian).
- Wywołania Canvas 2D, które pakują ułamkowe argumenty, dostają liczby całkowite. `drawImage` jest wołane tylko w `blit`.
- Przydziały samego silnika są mierzone narzędziem `/tools.html?view=perf`. Limit: 512 B na klatkę przy 10 jednostkach. Przekroczenie wymaga znalezienia przyczyny profilerem (metoda w ARCHITECTURE.md §5.7), a nie zgadywania.
- Symulacja zostaje przy twardym zerze, sprawdzanym przez `pnpm bench --check`.

## Konsekwencje

- Sygnatury funkcji renderera zostają naturalne (`sampleClip(clip, t, …)`), co ma znaczenie dla edytora animacji w M3.
- Budżet przestaje być sprawdzalny samym przeglądem kodu; po zmianach w `render` trzeba uruchomić pomiar.
- Wynik zależy od wersji przeglądarki. Jeśli po aktualizacji V8 wzrośnie powyżej limitu, wracamy do wariantu 1 dla funkcji wskazanych przez profiler.
- Pomiar alokacji działa tylko w Chromium uruchomionym z flagami diagnostycznymi, więc nie wchodzi do CI.
- Jeśli wariant 2 nie zostanie zaakceptowany, do zrobienia zostaje wariant 1 (szacunkowo 1 dzień razem z testami).
