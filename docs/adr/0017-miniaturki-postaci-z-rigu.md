# ADR 0017: miniaturki postaci rysowane z rigu i atlasu

- Status: zaakceptowany (zlecenie autora gry z 2026-10-05; wygląd miniaturek do jego oceny)
- Data: 2026-10-05

## Kontekst

Autor gry chce, żeby każda postać miała miniaturkę, mały obrazek „profilowy”. Miniaturki mają pokazywać bohaterów poza składem, pojawić się w zakładce „Bohaterowie” i w walce: żywe postacie gracza w lewym dolnym rogu ekranu, przeciwnika w prawym dolnym.

Postać w grze nie ma jednego obrazka: to rig z częściami skórki z atlasu (ADR 0004). Miniaturkę można dostać na trzy sposoby:

1. **Osobna grafika na jednostkę.** Każda forma i każdy wróg wymaga dodatkowego rysunku, który trzeba utrzymywać w zgodzie z postacią, a atlas rośnie (transfer na darmowym planie hostingu, ADR 0006). Dziś grafiki są zastępcze, więc i tak musiałby je składać generator.
2. **Składanie przy `pnpm atlas`.** Skrypt Node układałby części w pozę i dopisywał wynik do atlasu. To druga implementacja pozowania rigu obok renderera i znów większy atlas.
3. **Rysowanie w przeglądarce** z rigu i atlasu, które gra i tak ma wczytane.

## Decyzja

**Miniaturka to popiersie wycięte z prawdziwej postaci:** rig w pierwszej klatce klipu idle, części skórki z atlasu, postać patrzy w prawo. Rysuje je renderer raz, po wczytaniu atlasu.

- **Kadr jest w danych rigu.** Pole `portrait` rigu podaje kość (zwykle głowę), punkt względem jej pivota i bok kwadratu w jednostkach rigu. Kadr idzie za kością, ale się z nią nie obraca. Pole jest wymagane: każdy nowy rig musi powiedzieć, gdzie jest twarz. Walidator sprawdza, że kość istnieje, a test (`render/portrait.test.ts`), że głowa każdej jednostki z treści mieści się w kadrze.

  ```json
  "portrait": { "bone": "head", "center": [1, -7], "size": 32 }
  ```

- **Arkusz poza ekranem.** `render/portrait.ts` rysuje po jednej miniaturce na każdy wygląd (rig, skórka, postawa) tym samym kodem co postacie w walce (`drawRigParts`, `blit`) na wspólnym arkuszu 128 × 128 px na komórkę. Jednostki o tym samym wyglądzie dzielą komórkę. Skala jednostki (`scale`) nie ma znaczenia: miniaturka mówi, kto to jest, a nie jak jest duży.
- **Interfejs dostaje canvas, nie obrazek.** `StageControls.paintPortrait(canvas, unitId)` kopiuje komórkę arkusza na mały canvas komponentu `ui/Portrait.tsx`. Nie zamieniamy canvasu na obrazek (`toDataURL`, `toBlob`): przeglądarki z ochroną przed odciskiem palca zwracają wtedy pusty albo zaszumiony obraz, a kopiowanie z canvasu na canvas działa wszędzie i nie kosztuje kodowania PNG przy starcie.
- **Walka.** `StageControls.faces` to sygnał z listą postaci trwającej walki w kolejności ze sceny, z informacją, kto żyje (`game/battle-faces.ts`). Pętla klatek porównuje tylko maskę bitową żywych jednostek (liczba całkowita, bez alokacji); listę buduje na początku walki i gdy ktoś ginie.
- **Gdzie widać miniaturki:** bohaterowie poza składem na ekranie składu, formy w drzewie ewolucji i karta formy w zakładce „Bohaterowie”, żywe postacie w dolnych rogach ekranu walki. Wygląd okienka opisuje uzupełnienie ADR 0015.

## Konsekwencje

- **Bez kosztu transferu i bez nowych plików.** Miniaturka zawsze zgadza się z postacią na scenie; nowe grafiki postaci (M6) od razu dają nowe miniaturki.
- **Formy o tej samej skórce mają tę samą miniaturkę.** Dziś dotyczy to kopii testowych drzewa ewolucji (ADR 0016); docelowe formy mają własne skórki.
- **Do wczytania atlasu okienka są puste**, tak jak scena bez postaci. Po błędzie ładowania zostają puste, a gracz widzi ten sam komunikat co dotąd. Błąd samego rysowania miniaturek nie zatrzymuje sceny ani walki: trafia do raportu błędów (`game/portraits.ts`).
- **Ostrość ogranicza atlas.** Zastępczy atlas ma 3 piksele na jednostkę rigu, więc kadr 32 jednostek to 96 pikseli źródła. Bok komórki (`PORTRAIT_PIXELS`) wystarcza dla miniaturki 4,5 em na ekranie 1920 px; przy gęstszym atlasie warto go podnieść.
- **Pamięć:** arkusz 512 × 512 px dla 16 wyglądów (ok. 1 MB) i 64 KB na każdą miniaturkę widoczną w interfejsie (najwyżej kilkanaście naraz).
- **`drawImage` poza `blit`.** Kopiowanie komórek arkusza woła `drawImage` wprost, z całkowitymi współrzędnymi i poza pętlą klatek, tak jak budowanie wariantów atlasu. Zasada „tylko przez `blit`” dotyczy rysowania walki.
- **Ręcznie rysowane portrety są możliwe później** bez zmian w `game` i `ui`: wystarczy, żeby arkusz brał sprite `<skórka>/portrait` z atlasu, gdy taki istnieje, a popiersie z rigu rysował w pozostałych przypadkach. Tego nie robimy, dopóki nie ma takich grafik.
- **Miniaturki w walce nie pokazują życia.** Paski i liczby życia są nad postaciami; miniaturka mówi tylko, kto jeszcze stoi. Pasek życia pod miniaturką wymagałby sygnału zmienianego przy każdej zmianie życia i jest do decyzji autora gry.
