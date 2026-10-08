# ADR 0026: drzewko run – żetony za poziomy, cztery kierunki, runy jako przedmioty

- Status: zaakceptowany (system i cztery kierunki od autora gry 2026-10-07; liczba run w kierunku, ich wartości, zasada niecofania wyboru i wygląd drzewka to propozycja wykonawcy, do jego oceny)
- Data: 2026-10-07

## Kontekst

Runy były nagrodami za poziomy: runa życia za trzeci poziom świata, runa ataku za bossa (ADR 0025), razem dwanaście sztuk o sześciu wartościach (życie +100, +200, +400; atak +10, +25, +50). Gracz nie miał na nie wpływu: dostawał to, co dawał poziom.

Autor gry poprosił o system, w którym gracz wybiera:

> chciałbym wprowadzić system runowy - po 2 i 5 poziomie z mapy gracz będzie dostawał token na runy. W sklepie będzie drzewko run i będzie można wybrać jaką się chce - im dalej w którymś kierunku tym lepsze statystyki

Jego decyzje na pytania wykonawcy:

- **Kierunki:** życie, atak, odrzut i szybkość.
- **Wartości:** płaskie, jak dotąd.
- **Wybór:** żeton odblokowuje następną runę w wybranym kierunku. Każda runa to osobny przedmiot, a słabsze zostają w grze.
- **Zakładanie:** jak dotąd, w dwóch gniazdach bohatera na ekranie składu, przekładane za darmo.

Założenia wykonawcy, podane autorowi razem z pytaniami: żeton wpada za pierwsze przejście drugiego i piątego poziomu **każdego** świata, czyli dwanaście w całej grze, a dawne runy za trzeci poziom i za bossa znikają. „Szybkość” jest odczytana jako szybkość ruchu, bo tak nazywa się ta statystyka na karcie bohatera; tempo ataków nazywa się w grze „Ataki na sekundę”.

## Decyzja

### Drzewko

`runes.json` opisuje drzewko: kierunki, a w każdym wartości kolejnych run jednej statystyki.

| Kierunek | Statystyka | Runy 1–6 |
|---|---|---|
| `hp` | życie | +60, +100, +160, +240, +340, +460 |
| `attack` | atak | +6, +10, +16, +24, +34, +46 |
| `knockback` | odrzut | +20, +40, +60, +90, +120, +160 |
| `speed` | szybkość ruchu | +15, +30, +45, +60, +75, +90 |

To wartości z chwili decyzji. Dzień później autor ustawił własne wartości życia, ataku i odrzutu: patrz uzupełnienie na końcu.

- Runa nie ma własnego id w danych: dostaje je z kierunku i miejsca w nim (`hp_3`). Kompilacja (`content/load-runes.ts`) przelicza premię na jednostki symulacji i odrzuca kierunek, w którym dalsza runa nie jest mocniejsza od poprzedniej, oraz drugi kierunek tej samej statystyki.
- **Sześć run w kierunku, dwanaście żetonów w grze.** Drzewko ma 24 runy, więc gracz weźmie połowę: dwa kierunki do końca, każdy do połowy albo coś pomiędzy. Gdyby żetonów starczało na wszystko, wybór byłby tylko kolejnością.
- **Kierunek odblokowuje się po kolei.** Następną runą kierunku jest pierwsza, której gracz nie ma. Wyboru nie da się cofnąć, dlatego sklep pyta o potwierdzenie.

### Żetony

- Poziom daje żeton flagą `runeToken` w nagrodach (`levels/world_N.json`); ma ją drugi i piąty poziom każdego świata. Żeton wpada tylko za pierwsze przejście.
- **Zapis nie przechowuje żetonów.** Każda posiadana runa kosztowała jeden, więc żetony do wydania to poziomy z żetonem, które gracz przeszedł, minus posiadane runy (`game/runes.ts`). Licznik nie może się rozjechać z postępem na mapie, a zmiana treści (inny poziom z żetonem) sama się rozlicza przy następnym wczytaniu.

### Runa jako przedmiot

Odblokowana runa trafia do zapasu gracza i zachowuje się jak dotąd: dwa gniazda na bohatera, wkładanie, wyjmowanie i przekładanie bez kosztu. Każda runa drzewka istnieje raz.

`resolveUnitSpec` dodaje premie po przeliczeniu ulepszeń:

- **Życie i atak:** punkty, jak dotąd.
- **Odrzut:** do statystyki odrzutu, która w symulacji jest zarazem siłą odrzutu i oporem przed nim. Runa daje więc jedno i drugie.
- **Szybkość:** do kroku ruchu. **Nie działa na bohatera, który stoi w miejscu** (krok 0): taka postać ma zasięg na całe pole i jest zaprojektowana jako nieruchoma, a jej szyk na to liczy.
- Jednostki przyzwanej runy przyzywacza nie dotyczą, jak dotąd.

Dwie reguły treści wynikają z symulacji:

- **Runa szybkości musi dawać pełny krok na tick**, czyli jej wartość jest wielokrotnością 15. Krok bohatera i krok runy zaokrąglają się osobno, więc inaczej karta bohatera mogłaby pokazać „49,9” zamiast „50”.
- Najszybszy bohater z najmocniejszymi runami szybkości we wszystkich gniazdach nie może mieć kroku większego niż najkrótszy zasięg w grze, bo jednostki mogłyby się minąć. Sprawdza to `pnpm validate-content`.

Symulacja się nie zmienia: dostaje gotową specyfikację jednostki. Hashe golden zostają.

### Zapis: wersja 5

Kształt zapisu jest ten sam, ale `runes` to teraz odblokowane runy drzewka. Dawnych run nie ma już w treści gry, więc migracja `v4 → v5` usuwa je z zapasu i z gniazd bohaterów. Gracz nic nie traci: po wczytaniu ma do wydania po żetonie za każdy przeszły poziom, który dziś daje żeton, i sam wybiera runy.

### Wartości z pomiaru

Wartości życia i ataku rosną razem z bohaterami, żeby runa ważyła podobnie na początku i na końcu gry: pierwsza runa życia to +60 przy Mieczniku ze 160 życia, szósta +460 przy Rycerzu z 980 (po czterech ulepszeniach). Dawna pierwsza runa życia (+100) ważyła na starcie wyraźnie więcej.

Odrzut i szybkość wymagały pomiaru, bo nie są zwykłą siłą. Skład odniesienia przeszedł wszystkie poziomy, na których ma już żeton, z runami samego jednego kierunku; wynik to procent życia, który został zwycięzcy (z minusem, gdy wygrał wróg). „Najlepsze rozdanie” to lepszy wynik z kilku sposobów rozdania run albo walka bez nich, jeśli runy tylko szkodzą. Pomiar zrobiono przed przestrojeniem bossów:

| Runy | Średni wynik | Wygrane z 34 |
|---|---|---|
| bez run | −3 | 23 |
| samo życie albo sam atak | +19 | 28 |
| odrzut +5…+40, runy od frontu | −8 | 16 |
| odrzut +5…+40, najlepsze rozdanie | +1 | 23 |
| odrzut +20…+160, najlepsze rozdanie | +14 | 29 |
| odrzut +40…+320, najlepsze rozdanie | +22 | 31 |
| szybkość +15…+90, najlepsze rozdanie | +13 | 26 |

- **Mały odrzut szkodzi.** Bohater, który odrzuca wroga, musi za nim iść, a bohater odporny na odrzut nie odskakuje spod ciosów. Runy +5…+40 wkładane po prostu frontowi dawały wynik gorszy niż brak run.
- **Odrzut zaczyna pomagać dopiero przy dużych wartościach i dobrym rozdaniu.** Przeciw walczącym wręcz (Mechanus town, Cytadela) trzyma wroga z dala od strzelców; przeciw stojącym strzelcom (Living swamps) odpycha cel poza zasięg własnych bohaterów i przegrywa walki wygrane bez run.
- Wybrane +20…+160 stawia odrzut tuż pod życiem i atakiem. Skala +40…+320 wygrywała więcej niż one.
- **Szybkość** pomaga głównie bohaterom walczącym wręcz, którzy startują z tyłu szyku: do wroga mają ok. 300 jednostek, czyli 6 sekund przy szybkości 50. Większe wartości niż +15…+90 prawie nic nie zmieniały (skala trzy razy większa: średni wynik +16 zamiast +13).

### Miernik balansu

- Skład odniesienia ma **plan run** w `balance/reference-squads.json`: `"runes": ["hp", "attack"]`, czyli żetony idą na zmianę w życie i atak. Przed bossem świata N ma więc N run życia i N run ataku; runy życia dostaje front, runy ataku tył.
- Reguły trudności z ADR 0025 zostają: boss i poziomy po zamknięciu rozwoju składu są przegrane bez run i wygrane z runami planu odniesienia.
- Raport `pnpm balance` dostał tabelę **„Inne drogi przez drzewko run”**: ten sam skład na poziomach wymagających run, gdy żetony pójdą najpierw w jeden kierunek do końca (potem plan odniesienia) albo we wszystkie po równo. Runy odrzutu i szybkości dostają najlepsze z czterech rozdań (od frontu, od tyłu, walczącym wręcz, strzelcom), bo gracz przekłada je za darmo.
- Test reguł (`scripts/lib/level-rules.test.ts`) pilnuje: żeton na drugim i piątym poziomie każdego świata, cztery kierunki po sześć run, plan odniesienia wygrywa wszystkie poziomy wymagające run, a każdy kierunek brany najpierw wygrywa co najmniej trzy z nich.

Bossowie i sześć poziomów Cytadeli (11 poziomów) dostali nowe poziomy siły wrogów z tego samego wyszukiwania co w ADR 0025, do nowych run; składy wrogów zostały. Zwykłe poziomy nie zależą od run, więc się nie zmieniły.

Wynik po przestrojeniu, na 11 poziomach wymagających run:

| Droga | Wygrane |
|---|---|
| plan odniesienia (życie i atak na zmianę) | 11 |
| najpierw życie | 10 |
| najpierw odrzut | 7 |
| najpierw atak | 6 |
| najpierw szybkość | 4 |
| wszystkie kierunki po równo | 2 |

### Interfejs

- **Sklep** ma u góry mały arkusz „Drzewko run” (ok. jednej trzeciej szerokości sceny; większy autor uznał za przytłaczający): z lewej zapas żetonów, z niego pień, z pnia cztery kierunki, w każdym sześć run coraz większych. Runy posiadane są w kolorze; następna w kierunku ma nagietkową obwódkę, gdy gracz ma żeton; dalsze są bezbarwnymi wycinankami. Kliknięcie runy otwiera pod nią potwierdzenie z przyciskiem „Weź”. Zasady są pod przyciskiem „i” przy tytule arkusza.
- **Mapa** pokazuje żeton do wydania plakietką z liczbą na zakładce sklepu, a nagrodę poziomu („Żeton run”) na jego tabliczce. **Ekran wyniku** wymienia żeton obok złota.
- **Kolory run:** zielony życie, czerwony atak, ciemnopomarańczowy odrzut (na prośbę autora, zamiast granatu), błękitny szybkość. Nazwa kierunku w drzewku ma kolor jego run.
- Wybór runy w gnieździe bohatera pokazuje runy w kolejności drzewka; licznik takich samych run zniknął, bo każda istnieje raz.

## Konsekwencje

- **Odrzut i szybkość to narzędzia, nie siła.** Pomagają w jednych walkach i szkodzą w innych; kto włoży runę odrzutu nie temu bohaterowi albo nie na ten poziom, może przegrać walkę, którą wygrałby bez niej. Gra tego nie tłumaczy poza jednym zdaniem pod „i”.
- **W Cytadeli odrzut jest mocniejszy niż plan odniesienia.** Poziom siły wroga skaluje życie i atak, ale nie odrzut, więc wrogowie z poziomem do +22 dają się odpychać jak na początku gry. Droga „najpierw odrzut” wygrywa tam pięć z sześciu poziomów z zapasem 12–41% życia, gdy plan odniesienia kończy z 8–9%; przegrywa tylko finał.
- **Specjalizacja się opłaca.** Dalsze runy są mocniejsze, więc drzewko po równo (trzy runy w każdym kierunku) wygrywa 2 z 11 poziomów wymagających run.
- **Wyboru nie da się cofnąć**, a żetonów jest dwanaście. Kto wyda je źle, ma słabsze runy do końca gry; zostaje mu powtarzanie poziomów dla złota i drugi skład.
- Runy nadal dają duży margines na zwykłych poziomach: skład odniesienia kończy je z runami zwykle z 20–35% życia zamiast z ok. 8%.
- Gracze ze starszym zapisem tracą dawne runy z gniazd i muszą wybrać nowe w sklepie.
- Reguła wielokrotności 15 ogranicza wartości run szybkości.
- Finałowy boss, którego autor zaprojektuje później, może dać dodatkowy żeton albo runę spoza drzewka; wtedy liczenie żetonów z postępu trzeba będzie rozszerzyć.

## Odrzucone warianty

- **Licznik żetonów w zapisie:** drugi stan obok postępu na mapie, który trzeba by migrować i uzgadniać przy każdej zmianie treści.
- **Bez podniesienia wersji zapisu:** dopasowanie zapisu do treści i tak usunęłoby nieznane runy, ale po cichu; migracja mówi wprost, co się stało z dawnymi runami, i ma test z plikiem v4.
- **Mały odrzut (+5…+40):** w pomiarze był gorszy niż brak run.
- **Runa szybkości działająca na stojących:** ruszyłaby rośliny i wieżyczki, które mają stać, i złamała regułę treści „jednostka bez ruchu ma zasięg na całe pole” w drugą stronę.
- **Zaokrąglanie szybkości na karcie bohatera** zamiast reguły wielokrotności 15: karta pokazuje wartości efektywne z symulacji (GAME_DESIGN §3) i tak ma zostać.
- **Osobny ekran albo zakładki w sklepie:** drzewko mieści się nad bohaterami na sprzedaż, a sklep zostaje jednym ekranem do wydawania tego, co gracz zdobył.
- **Branie runy jednym kliknięciem:** wybór jest nieodwracalny, a żetonów mało.

## Uzupełnienie z 2026-10-08: wartości run od autora

Autor gry ustawił w `runes.json` własne wartości, w równych krokach:

| Kierunek | Runy 1–6 |
|---|---|
| `hp` | +50, +100, +150, +200, +250, +300 |
| `attack` | +5, +10, +15, +20, +25, +30 |
| `knockback` | +20, +40, +60, +80, +100, +120 |
| `speed` | bez zmian |

Tego samego dnia zmienił liczby jedenastu bohaterów (ADR 0024, uzupełnienie). Runy życia i ataku są teraz słabsze na końcu kierunku (+300 zamiast +460, +30 zamiast +46), więc skład odniesienia ma mniej z run, a wszystkie 36 poziomów przeszło wyszukiwanie od nowa. Wynik na 11 poziomach wymagających run:

| Droga | Wygrane |
|---|---|
| plan odniesienia (życie i atak na zmianę) | 11 |
| najpierw życie | 10 |
| najpierw atak | 10 |
| najpierw odrzut | 7 |
| najpierw szybkość | 4 |
| wszystkie kierunki po równo | 4 |

Wnioski z decyzji zostają: odrzut i szybkość są narzędziami na konkretne walki, a w Cytadeli odrzut jest mocniejszy od planu odniesienia (pięć z sześciu poziomów z zapasem 28–57% życia, przy poziomach siły wrogów do +25). Sam atak wygrywa teraz tyle co samo życie, bo bossowie są strojeni do słabszych run.

Wyszukiwanie poziomów dostało przy okazji ostrzejszy warunek: zwykły poziom musi przegrać każdy wcześniejszy skład odniesienia, nie tylko ten sprzed poprzedniej nagrody. Walka nie jest monotoniczna i na jednym poziomie skład o dwa zakupy słabszy wygrywał tam, gdzie skład o jeden zakup słabszy przegrywał.
