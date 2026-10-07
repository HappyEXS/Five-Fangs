# ADR 0019: „mroczna baśń” – styl postaci czterech szczepów

- Status: zaakceptowany (wybór autora gry z 2026-10-05; wygląd postaci do jego oceny)
- Data: 2026-10-05

## Kontekst

Po obejrzeniu szczepu Beasts (ADR 0018) autor gry przysłał szkice trzech kolejnych szczepów (Immortals, Plants, Robots) i poprosił, by grafika każdego bohatera była „mniej dziecinna, bardziej obskurna”. Pierwsza wersja bestii miała czyste, płaskie kolory, równy kontur i duże, okrągłe oczy z białkiem, czyli język rysunkowy bliski ludzikom z M2.

Autorowi przedstawiono trzy kierunki: mroczną baśń (brud i zniszczenie, bez dosłowności), groteskę z krwią i ranami oraz samo przygaszenie kolorów. Osobno zapytano o zakres: tylko nowe szczepy, cztery szczepy czy wszystkie postacie w grze.

## Decyzja

Autor wybrał **mroczną baśń** dla **czterech szczepów**. Bestie zostały przerysowane, trzy nowe szczepy powstały od razu w tym stylu. Ludzie z M2 (Miecznik, Łucznik, Tarczownik, Akolita i wrogowie świata 1) zostają bez zmian.

Styl to zestaw reguł wbudowanych w przybory generatora (`scripts/lib/skins/kit.ts`), więc każda część dostaje go z definicji, a nie z ręcznej poprawki:

- **Kolory przygaszone i brudne.** Każdy szczep ma jeden kolor ze szkicu autora, sprowadzony do tonu ziemi: brąz bestii, zmatowiałe złoto Immortals, bagienna zieleń Plants, stalowy błękit Robots. Żywy kolor zostaje tylko dla światła: oczu, żaru, hologramu.
- **Poszarpany atramentowy kontur.** Krawędź każdej bryły jest przesunięta szumem: mocno dla sierści, liści i tkaniny, lekko dla kości i blachy.
- **Ciężki cień własny** po stronie pleców i od spodu zamiast połysku.
- **Zniszczenie na każdej powierzchni:** plamy, zacieki, rdza, pleśń, mech, pęknięcia, szwy i blizny, wyszczerbione ostrza, brakujące płyty.
- **Małe świecące oczy w ciemnych oczodołach** zamiast oczu z białkiem; często jedno, często głęboko pod czołem, kapturem albo powieką.
- **Sylwetki groźne zamiast pociesznych:** garb, pochylenie, rogi, kolce, zęby na wierzchu.
- **Bez krwi i ran.** Zgnilizna roślin, ropa Toxic Ivy i żar w pęknięciach robotów to granica.

Skórki trzech nowych szczepów stoją na rigu `humanoid` tak jak bestie (ADR 0018). Postacie, których szkic nie ma ludzkiej sylwetki, korzystają z tego, że części mają własne rozmiary i pivoty:

- **Kula albo bryła zamiast ciała** (Orb, Bush, Bot, Holo-bot): „głowa” wisi pod stawem szyi i jest całym ciałem, tułów to to, co za nią albo pod nią (wieniec promieni, tylna warstwa liści, widełki, stojak), a ramię staje się częścią twarzy: powieką oka, gałązką, okiem hologramu.
- **Postacie stojące w miejscu** (pnącza, Mother-tree, Polaris) mają pień albo szatę narysowane w tułowiu aż do ziemi, a części nóg to drobiazgi, które chowają się w korpusie: ciernie, ćwieki.
- **Whirl-bot** sunie na wirującej tarczy narysowanej w tułowiu; jego „nogi” to pręty regulatora odśrodkowego z ciężarkami, które rozchylają się w biegu.

Rig dostał cztery klipy ataku: `cast` (rzut znad głowy), `flare` (uniesienie rąk), `summon` (przyzwanie) i `jab` (dziobnięcie całym ciałem, w którym ramiona prawie się nie ruszają, bo u Bota ramię jest powieką).

## Konsekwencje

- **Dwa style w jednej grze.** Bestie i nowe szczepy stoją w walce obok gładkich, kolorowych ludzi z M2. Różnica jest widoczna na pierwszym zrzucie z walki; jeśli autor uzna ją za wadę, ludzi trzeba przerysować tymi samymi przyborami albo wymienić przy docelowych grafikach (M6-1).
- **Atlas urósł z 129 KB do 543 KB** (203 części postaci, 12 pocisków): szum konturu i plam słabo się kompresuje bezstratnie. Pierwsze uruchomienie to 726 KB wobec budżetu 2 MB. Zapas wystarcza na dzisiejszą treść; podział atlasu bohaterów na szczepy ładowane leniwie i ewentualny stratny WebP należą do M6-2.
- **Generator pozostaje jedynym źródłem grafik** czterech szczepów (`scripts/lib/skins/<szczep>/<postać>.ts`); szum ma stałe ziarno wyprowadzone z granic części, więc wynik jest powtarzalny, a test potoku atlasów nadal porównuje pliki w repozytorium z generatorem.
- **Zmiana granic płótna części zmienia jej szum**, a więc drobne szczegóły konturu. Kto poprawia rozmiar części, powinien obejrzeć ją ponownie.
- Docelowe grafiki rysowane ręcznie mogą zastąpić części jedna po drugiej, jak w ADR 0018; reguły stylu z tej decyzji są wtedy wytycznymi dla rysownika.

## Uzupełnienie z 2026-10-07: szczep wrogów Akronix

Dziesięć skórek Akronixów (`scripts/lib/skins/akronix/`) jest narysowanych tymi samymi przyborami i w tym samym stylu; autor gry nie był o styl pytany osobno, bo wcześniej wybrał „mroczną baśń” dla wszystkich szczepów ze szkiców.

- **Znak szczepu to ciemnoczerwona przepaska na oczach** z węzłem i końcami powiewającymi za głową (na szkicu czarna opaska u każdej postaci z górnego rzędu). Przez sukno żarzy się oko. Czerwień jest brudna i ciemna, jak zetlałe sukno; reguła „bez krwi” zostaje.
- **Sylwetki są chude**, jak patyczaki ze szkicu: łysa, blada głowa, tułów i kończyny w sadzy. Postacie odróżnia broń, peleryna i fryzura (węzeł Katanixa, zaczesane włosy Poisonixa, kolce Hornixa, grzebień generała).
- **Hornix jedzie na rogatej bestii.** Bestia jest częścią tułowia (korpus, ogon, łeb), nogi rigu to jej nogi, a jeździec ma własne ręce i głowę; klip `gore` pochyla całość, więc cios wygląda jak szarża.
- **Axiny** (bossowie) mają nagą, bladą pierś jak skrzynię, kudły na oczach zamiast przepaski, wrzask i broń w obu rękach: topór w bliższej, a w dalszej szablę, skrzydlaty tasak albo czarny sierp.
- **Druga ręka.** Tarcza Defenixa i druga broń Axinów wymagały nowej, opcjonalnej kości `offhand` w rigu `humanoid` (ARCHITECTURE.md §5.3). Pozostałe skórki jej nie mają i rysują się jak dotąd.
- **Znak szczepu ze szkicu** (koło przekreślone krzyżem) jest na pawęży Defenixa, proporcu i napierśniku generała.
- Atlas urósł z 585 KB do 704 KB (454 sprite'y); pierwsze uruchomienie to 893 KB wobec budżetu 2 MB. Wrogowie świata, w którym wystąpi Akronix, powinni docelowo trafić do leniwie ładowanego atlasu tego świata (M6-2).
