# ADR 0024: reguły balansu bohaterów i ich miernik

- Status: zaakceptowany (reguły od autora gry 2026-10-07; liczby to propozycja wykonawcy, do jego oceny)
- Data: 2026-10-07

## Kontekst

Liczby Mieczników i Łuczników pochodziły z pierwszych miesięcy projektu, liczby czterech pozostałych szczepów ze szkiców autora. Nikt ich ze sobą nie zestawiał. Autor zauważył, że ludzie mają statystyki wyższe od pozostałych szczepów, a chce odwrotnie: ludzie słabsi i mniej opłacalni. Zauważył też, że część postaci jest nieproporcjonalnie wolna.

Pomiar symulacją to potwierdził:

- Miecznik (600 życia) wygrywał pojedynek z każdą inną formą bazową (200–400 życia), a Zbrojny, Tarczownik i Strzelec zajmowali trzy pierwsze miejsca wśród dwunastu form pierwszej ewolucji.
- Drużyna Mieczników wygrywała walkę 5 na 5 z każdym innym szczepem, mieszana drużyna ludzi też; drużyna Beasts przegrywała ze wszystkimi.
- Chodzące postacie miały szybkość od 5 do 175. Postacie walczące wręcz o szybkości 25–30 po każdym odrzucie długo wracały do celu.
- Formy końcowe ze szkiców były nierówne między sobą: Enigmatix wygrywał 22 z 23 pojedynków, Tuskovator przegrywał 20.

## Decyzja

### Reguły (autor gry)

1. **Ludzie są wyraźnie słabsi** od szczepów ze szkiców: forma ludzi ma ok. 70% siły form innych szczepów na tym samym stopniu, a drużyna ludzi przegrywa równą walkę z drużyną każdego innego szczepu, ale wystarcza na początek gry.
2. **Szkice zostają punktem wyjścia.** Życie, atak, odrzut i zdolności postaci ze szkiców zmienia się tylko tam, gdzie postać wyraźnie odstaje, i każdą taką zmianę się wypisuje.
3. **Skala szybkości jest ściśnięta**, ale tylko tam, gdzie wolna postać nie mogła dojść do celu, czyli u walczących wręcz. Postacie stojące i strzelcy, którzy nie muszą wiele chodzić, zostają.

### Jak te reguły zamieniłem na liczby

- **Ludzie:** życie i atak wszystkich 14 form w dół, tak żeby iloczyn życia i obrażeń na sekundę był ok. połową tego, co mają formy innych szczepów o tej samej roli na tym samym stopniu (pierwiastek z połowy to 0,7). Leczenie Strażnika, Akolity i Kapłana proporcjonalnie niżej. Szybkość, tempo ataków, odrzut i zdolności bez zmian. Skoki między stopniami są teraz takie jak u szczepów ze szkiców (ok. dwa razy więcej życia co stopień).
- **Szybkość postaci walczących wręcz** mieści się w skali 40–130: Monstrosity 25 → 40, Reaper 30 → 50, Tuskovator 30 → 50, Guardian of hell 30 → 45, Oak warrior 40 → 45, Titan-bot 40 → 45, Xartix 75 → 80, Whirl-bot 175 → 130. Kolejność ze szkiców zostaje: kto był wolny, jest wolny, kto szybki, jest szybki.
- **Powolni strzelcy** (Batfang, Spiker, Trunk) zachowują szybkość ze szkicu i dostają dłuższy zasięg, żeby sięgali frontu ze swojego miejsca. Zasięg strzelca to wartość robocza, nie liczba ze szkicu.
- **Postacie odstające** najpierw poprawiam wartościami roboczymi, czyli tempem ataków wręcz i zasięgiem strzelców: Enigmatix bije raz na 2,5 s zamiast co 1,25 s, Whirl-bot 0,8 zamiast 1,5 razy na sekundę, Xartix 1,0 zamiast 1,2; szybciej biją Monstrosity, Bot, Reaper, Tuskovator, Ironbeak, Ax-bot i Titan-bot; krótszy zasięg mają Cardinal, Ultimus i Thermobot.
- **Jedna liczba ze szkiców zmieniona poza szybkością:** Ice Ivy leczy drużynę o 25 na sekundę zamiast 50. Przy 50 leczyła w jednej walce próbnej łącznie 16 000 punktów życia i drużyna Plants była nie do przebicia.

Pełne tabele i lista zmian: GAME_DESIGN.md §3.

### Miernik

`pnpm balance:heroes` (`scripts/lib/hero-balance.ts`) liczy symulacją, bez ulepszeń i run:

- **pojedynki** każdej formy z każdą inną formą tego samego stopnia, z obu stron pola (formy tego samego stopnia kosztują tyle samo, ADR 0023);
- **wartość w drużynie:** forma staje między tarczownikiem a strzelcem ludzi swojego stopnia przeciw trójce ludzi tego stopnia; wynik to różnica pozostałego życia. Pojedynek nie pokazuje wartości leczenia ani strzelania zza pleców, a ten pomiar tak;
- **walki drużyn szczepów** 5 na 5 (cztery formy końcowe i jedna forma pierwszej ewolucji), bez ulepszeń i z kompletem.

Raport trafia do `reports/heroes.md`, bez daty. Test obok biblioteki pilnuje reguł, nie liczb:

- każda forma ludzi przegrywa więcej pojedynków swojego stopnia, niż wygrywa, a średni bilans obu szczepów ludzi jest na każdym stopniu niższy niż każdego szczepu ze szkiców;
- drużyny ludzi przegrywają z drużyną każdego szczepu ze szkiców, z obu stron pola, ale zadają im obrażenia (nie są bezużyteczne);
- żaden szczep ze szkiców nie wygrywa i żaden nie przegrywa ze wszystkimi pozostałymi; żadna forma powyżej bazowej nie wygrywa wszystkich pojedynków;
- postać walcząca wręcz ma szybkość 40–130, a powolny strzelec zasięg co najmniej 240.

### Zamek

Startowi bohaterowie i wrogowie pierwszego świata to ludzie, więc Zamek trzeba było dostroić: wrogowie „Bramy” mają poziom siły 1, „Zbrojowni” 0, 0 i 1, a bossem „Sali tronowej” jest Zbrojny +5 zamiast Rycerza. Rangi oczekiwane składu startowego zostały te same (A0, A1, A3, B0, B2, B4).

## Konsekwencje

- Zapis się nie zmienia. Bohaterowie graczy mają po wczytaniu nowe liczby.
- Symulacja się nie zmienia; hashe golden też nie, bo walki golden mają własne jednostki.
- **Boss Zamku nie jest już formą końcową.** Skoki między stopniami ludzi są teraz dwukrotne, więc dwóch bohaterów po pierwszej ewolucji nie pokonuje żadnej formy końcowej walczącej wręcz. Wróci przy balansie poziomów.
- **Runy ważą więcej.** Mają wartości płaskie (życie +100 do +400, atak +10 do +50); runa +100 przy Mieczniku o 160 życia to 62%. Do osobnej decyzji.
- **Dwuosobowy skład startowy ludzi przegrywa w światach 2–6 częściej** niż przedtem (17 z 30 poziomów poza zasięgiem). To zamierzony skutek reguły 1; rangi tych poziomów w składach referencyjnych to nadal pomiar stanu, a przeciwnicy pochodzą ze wzoru.
- **Znane nierówności zostawione świadomie** (reguła 2): Orb wygrywa z każdą inną formą bazową; Ignitix, Ultimus i Enigmatix wygrywają po 21 z 23 pojedynków form końcowych; Toxic Ivy nie wygrywa żadnego pojedynku, bo jej pocisk bije wszystkich po trochu; Mother-tree z 10 000 życia praktycznie nie da się zabić w 90 sekund, więc walki z nią kończą się limitem czasu. Szczepy jako całość są wyrównane.
- Wartość w drużynie jest wrażliwa na progi (jeden punkt ataku potrafi zmienić liczbę strzałów potrzebnych do zabicia), więc służy do porównań zgrubnych, a nie do strojenia co do punktu.

## Odrzucone warianty

- **Wzmocnić szczepy ze szkiców zamiast osłabiać ludzi:** zmieniłoby wszystkie liczby autora zamiast liczb wykonawcy.
- **Ścisnąć także szybkości strzelców:** autor chciał zostawić postacie, które nie muszą wiele chodzić; wystarczył dłuższy zasięg.
- **Osłabić Ignitixa, Ultimusa i Enigmatixa liczbami ze szkiców:** szczepy są już wyrównane jako całość, a reguła 2 każe ruszać szkice tylko tam, gdzie trzeba.
- **Podnieść atak Toxic Ivy z 10 do 20:** drużyna Plants wygrywała wtedy ze wszystkimi szczepami poza Robots.
