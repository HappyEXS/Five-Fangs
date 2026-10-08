# ADR 0025: balans poziomów – złoto jako miara, skład odniesienia, reguły trudności

- Status: zaakceptowany (reguły od autora gry 2026-10-07; rozkład nagród, składy wrogów i skład odniesienia to propozycja wykonawcy, do jego oceny)
- Data: 2026-10-07

## Kontekst

Poziomy światów 2–6 miały przeciwników i nagrody ze wzoru (ADR 0022). Autor gry zgłosił, co jest nie tak:

- nagrody są zbyt wysokie;
- pierwsze poziomy nowego świata, zwłaszcza od trzeciego, są zbyt łatwe: gracz ma już kilka ewolucji w składzie;
- na każdym poziomie ma stać od 3 do 5 przeciwników, od świata 3 zwykle 5;
- w każdym świecie mają się pojawiać Akronix, raz na jakiś czas, wprowadzani w kolejności swojego pocztu; bossowie (Axiny) mogą kończyć wcześniejsze światy;
- finałowego bossa gry autor zaprojektuje później.

Pomiar potwierdził skalę: gra dawała 186 360 złota za pierwsze przejścia, a komplet pięciu maksymalnie rozwiniętych bohaterów kosztuje 31 600, więc skład był gotowy w połowie trzeciego świata.

Decyzje autora na pytania wykonawcy:

- **Złoto:** łącznie ok. 60 000, czyli na dziesięciu rozwiniętych bohaterów („więcej pola do popisu”); w pierwszych światach mniej, w dalszych więcej.
- **Start gry:** dwaj bohaterowie startowi nie pokonują trzech nawet najsłabszych wrogów, więc dwa pierwsze poziomy mają po dwóch przeciwników.
- **Akronix:** Axin 1 kończy świat 3, Axin 2 świat 4, Axin 3 świat 5, w świecie 6 wracają wszyscy trzej.
- **Trudność: wymagająco.** Zwykłe poziomy bez zapasu, a bossowie wymagają run albo powtórzenia wcześniejszych poziomów dla złota.

## Decyzja

### Miarą jest złoto

Dotąd raport balansu pytał, od której „rangi” dwuosobowy skład wygrywa poziom. Ranga nie mówiła, czy gracza na nią stać. Teraz pytanie brzmi: **co gracz może mieć za złoto zdobyte przed tym poziomem i czy to wystarcza**.

- **Skład odniesienia** (`balance/reference-squads.json`) to pięciu bohaterów w kolejności kupowania: Miecznik i Łucznik ze startu, potem Robots, Beasts (drogą Reaper → Tuskovator) i Immortals. Stoją w rozsądnym szyku: Miecznik z przodu, powolny strzelec Immortals tuż za nim.
- **Plan zakupów** (`scripts/lib/reference-plan.ts`): najpierw brakujący bohaterowie, bo nowy bohater za 200 daje więcej niż cztery ulepszenia za tę samą cenę, potem równy rozwój całej piątki: po jednym ulepszeniu każdemu, po komplecie ewolucja każdego. Skład wydaje całe złoto, jakie ma, i staje na pierwszym kroku, na który go nie stać.
- **Każda nagroda kupuje co najmniej jeden krok**, dopóki jest co kupować. Dlatego nagrody rosną skokami tam, gdzie zaczynają się ewolucje za 1600.

### Reguły trudności

- **Zwykły poziom bez zapasu:** skład odniesienia bez run wygrywa, a skład sprzed poprzedniej nagrody przegrywa. Poziom wymaga więc złota ze wszystkich wcześniejszych poziomów, ale nie więcej. Runy i lepsze ustawienie dają graczowi margines.
- **Boss wymaga run:** skład odniesienia bez run przegrywa, a z runami zdobytymi wcześniej wygrywa. Kto run nie włożył, musi powtarzać poziomy dla złota.
- **Cytadela:** skład odniesienia kończy rozwój w piątym świecie, więc na wszystkich poziomach szóstego obowiązuje reguła bossa. Złoto z Cytadeli (ponad 20 000) służy budowie drugiego składu przeciw Akronixom.
- Skład odniesienia kończy wygraną z kilkoma procentami życia i w czasie do 70 sekund, żeby wynik nie wisiał na limicie 90 sekund.

Poziomy siły wrogów dobrało wyszukiwanie: dla każdego poziomu najtrudniejsze ustawienie, które spełnia regułę, przy różnicy poziomów siły między wrogami najwyżej trzy.

### Nagrody

| Świat | Złoto | Razem od początku | Skład odniesienia na koniec świata |
|---|---|---|---|
| 1 Zamek | 1 600 | 1 600 | pięciu bohaterów, formy bazowe z kompletem ulepszeń |
| 2 Mechanus town | 4 000 | 5 600 | wszyscy po pierwszej ewolucji, po dwa ulepszenia |
| 3 Living swamps | 6 800 | 12 400 | trzech po drugiej ewolucji |
| 4 Jungle of doom | 10 900 | 23 300 | wszyscy po drugiej ewolucji, po jednym–dwóch ulepszeniach |
| 5 Tower of time | 13 800 | 37 100 | komplet (31 600) przed piątym poziomem świata |
| 6 Cytadela Akronix | 22 900 | 60 000 | złoto na drugi skład |

Runy: życia na trzecim poziomie każdego świata (przed bossem), ataku za bossa; wartości rosną ze światem (+100, +100, +200, +200, +400, +400 życia; +10, +10, +25, +25, +50, +50 ataku). Razem 12 run na 10 gniazd piątki bohaterów.

### Przeciwnicy

- Dwa pierwsze poziomy gry mają po dwóch wrogów, reszta Zamku trzech albo czterech, świat 2 od trzech do pięciu, światy 3–6 zawsze pięciu.
- Każdy świat wystawia swój szczep; Akronix stoi przy bossie każdego świata i na jednym do trzech zwykłych poziomów. Kolejność pierwszych pojawień: Bowix i Assasinix w Zamku, Katanix i Defenix w Mechanus town, Poisonix, Hornix, Kaisarix i Axin 1 na bagnach, Axin 2 kończy dżunglę, Axin 3 wieżę.
- Cytadela to sami Akronix; w finale stoją trzej Axiny z Kaisarixem i Poisonixem, do czasu aż autor zaprojektuje własnego bossa.
- Pełne tabele: GAME_DESIGN.md §7.

### Miernik i testy

`pnpm balance` zapisuje w `reports/balance.md` dla każdego poziomu: złoto przed nim, skład odniesienia, wynik bez run i z runami, wynik składu sprzed nagrody i ocenę („zgodny”, „za łatwy”, „za trudny”). Test `scripts/lib/level-rules.test.ts` pilnuje reguł autora, nie liczb: suma złota, rosnące nagrody, liczba wrogów, kolejność i obecność Akronixów, Axiny jako bossowie, runy, oraz to, że każdy poziom ma ocenę „zgodny”.

## Konsekwencje

- **Trzech pierwszych nagród starcza dokładnie na trzech bohaterów**, więc gracz ma pełną piątkę przed czwartym poziomem gry. Kto pierwszą nagrodę wyda na ulepszenia zamiast na bohatera, na drugim poziomie przegra i musi powtarzać pierwszy. Gra tego dziś nie podpowiada; to sprawa dla wprowadzenia do gry (M6).
- **Poziomy są strojone do jednego składu odniesienia.** Gracz z innym składem trafi na poziomy łatwiejsze i trudniejsze; lepszy skład (same szczepy ze szkiców zamiast ludzi) daje zapas, i o to chodziło w „polu do popisu”.
- **Runy są mocne.** Mają wartości płaskie, więc na zwykłych poziomach skład z runami kończy zwykle z kilkunastoma albo kilkudziesięcioma procentami życia zamiast z ok. 8%. To jest margines, o którym mowa w regule; jeśli okaże się za duży, trzeba zmniejszyć wartości run, nie poziomy.
- **Poziomy siły w Cytadeli są wysokie** (do +23 u zwiadowców), bo niskie stopnie Akronixów mają liczby ze szkicu dużo niższe niż rozwinięty skład gracza. Liczba przy wrogu maleje wtedy z poziomu na poziom, choć poziomy są coraz trudniejsze, bo stają na nich mocniejsze postacie.
- **Mother-tree nie stoi na żadnym poziomie**: z 10 000 życia jako przeciwnik kończy walkę limitem czasu.
- **Boss Zamku to Zbrojny**, nie Rycerz: forma końcowa jest za mocna na skład z form bazowych.
- Bush → Trunk i Orb → Cardinal bywają pogorszeniem: forma bazowa strzela przez całe pole albo jest wytrzymalsza, a jej ewolucja musi podejść. Dlatego skład odniesienia nie idzie drogą Plants. To uwaga do balansu bohaterów, nie poziomów.
- Zapis się nie zmienia. Gracz, który przeszedł poziomy po starych nagrodach, ma więcej złota, niż przewiduje nowy rozkład.
- Zmiana kosztów, liczb bohaterów albo nagród przesuwa skład odniesienia na każdym poziomie, więc po każdej takiej zmianie trzeba uruchomić `pnpm balance` i dostroić poziomy, które przestały być „zgodne”.

## Odrzucone warianty

- **Ranga wspólna dla całego składu** (dotychczasowy raport): między stopniami kosztuje tysiące złota naraz, więc nie da się jej powiązać z nagrodą za jeden poziom.
- **Skład odniesienia z dwóch bohaterów albo rosnący powoli:** gracz, który kupuje bohaterów od razu, miałby wtedy wszystkie poziomy za łatwe.
- **Strojenie zwykłych poziomów z runami:** bossowie nie mieliby czym się wyróżniać poza powtarzaniem poziomów; autor wybrał runy jako to, czego boss wymaga.
- **Osłabieni wrogowie na początek** (ujemny poziom siły) albo trzeci bohater na start: autor wolał wyjątek dla dwóch pierwszych poziomów.

## Uzupełnienie z 2026-10-07: runy z drzewka

Runy nie są już nagrodami za trzeci poziom i za bossa. Gracz dostaje żeton run za drugi i piąty poziom każdego świata i sam wybiera runy w drzewku (ADR 0026). Reguły trudności zostają, zmienia się to, skąd skład odniesienia ma runy: wydaje żetony na zmianę na runę życia i runę ataku, więc przed bossem świata N ma ich po N. Bossowie i poziomy Cytadeli dostali nowe poziomy siły wrogów z tego samego wyszukiwania; zwykłe poziomy, nagrody w złocie i składy wrogów zostały. Raport `pnpm balance` pokazuje dodatkowo, jak ten sam skład radzi sobie na poziomach wymagających run przy innych wyborach w drzewku.
