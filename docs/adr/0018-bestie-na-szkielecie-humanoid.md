# ADR 0018: szczep Beasts na szkielecie humanoid

- Status: zaakceptowany (wybór autora gry z 2026-10-05; wygląd postaci do jego oceny)
- Data: 2026-10-05

## Kontekst

Autor gry przygotował szkice pierwszego z czterech szczepów: siedem bestii w drzewie ewolucji (Monstrosity → Batfang albo Reaper → Spiker, Ironbeak, Tuskovator, Ignitix). Szkice pokazują głównie łby i sylwetki zwierzęce: ptaka na długiej szyi, gada z długą paszczą, stwora z kolcami na grzbiecie. Dotychczasowe postacie to ludzie na jednym rigu `humanoid` (ADR 0004) z grafikami zastępczymi z generatora.

Były trzy drogi:

1. **Własne szkielety bestii** (czworonóg, ptak, wąż) z własnymi klipami chodu i ataków. Najbliżej szkiców; kilka nowych rigów i kompletów animacji do napisania i dopracowania.
2. **Bestie dwunożne na szkielecie ludzi**: zwierzęce głowy, rogi, pazury i kolory na tych samych stawach i klipach.
3. Najpierw sama plansza projektów do akceptacji, bez wprowadzania do gry.

## Decyzja

Autor wybrał drogę 2. Bestie stoją na dwóch nogach i używają rigu `humanoid`.

- **Każda bestia to skórka z własnymi częściami.** Części mają inne rozmiary i pivoty niż u ludzi (pivot każdego sprite'a jest w atlasie), więc na tych samych stawach mieszczą się wielki łeb z rogami, łeb na długiej szyi, skrzydło, ogon, grzywa i kolce. Tułów niesie to, co nie ma własnej kości (skrzydło Batfanga, ogony, kolce Spikera), a slot broni małe pazury albo długie kosy Reapera.
- **Jeden kolor szczepu, siedem odcieni.** Szkic podaje brąz. Każda postać ma własny odcień i jeden akcent: Monstrosity ciepły brąz i kościane rogi, Batfang ciemna umbra i bordowa błona skrzydła, Reaper lisia rdza z kremowym pyskiem, Spiker oliwkowy brąz i kościane kolce, Ironbeak pióra i żelazny dziób, Tuskovator czekolada z piaskową grzywą, Ignitix czerwonobrązowe łuski i żar.
- **Cztery nowe klipy na tym samym rigu** zamiast miecza i łuku: `peck` (dziobnięcie Ironbeaka), `gore` (cios kłem Tuskovatora z dołu w górę), `spit` (plucie Batfanga i Ignitixa) i `volley` (skłon Spikera, który wystawia kolce w stronę wroga), z postawą `beast`. Monstrosity i Reaper tną pazurami klipem `slash`: pazury leżą w slocie broni tak jak klinga.
- **Pociski wychodzą stamtąd, skąd powinny:** typ ataku podaje wysokość lotu (kieł z paszczy, kolec z grzbietu, kula ognia z wysoko uniesionego łba).
- **Części rysuje generator** (`scripts/lib/beasts/`), tym samym rasteryzatorem co ludzi, rozszerzonym o elipsę, wielokąt, odcinek zwężany i różnicę kształtów. Grafiki pozostają zastępcze w tym sensie, że powstają z kodu; ich projekt (sylwetki, kolory, cechy rozpoznawcze ze szkiców) jest propozycją docelowego wyglądu.

## Konsekwencje

- **Sylwetki są dwunożne.** Ironbeak to ptak stojący jak człowiek, ze skrzydłami w miejscu rąk; Ignitix to gad na dwóch nogach z ogonem, a nie wąż. Jeśli autor zechce bestii czworonożnych albo pełzających, potrzebne będą nowe rigi; dane jednostek już dziś wskazują rig po nazwie.
- **Stawy i proporcje kończyn są wspólne z ludźmi.** Różnice wielkości robi skala jednostki (0,9 dla Monstrosity, 1,25 dla Tuskovatora) i kształt części.
- **Renderer przestał zakładać ludzki wzrost:** pasek życia wisi nad zmierzonym czubkiem wysokich postaci (ARCHITECTURE.md §5.5), a miniaturka może mieć własny kadr (ADR 0017, uzupełnienie).
- **Atlas urósł** z 54 KB do 128 KB (49 części bestii i trzy pociski); pierwsze uruchomienie to 308 KB wobec budżetu 2 MB. Trzy kolejne szczepy w tym samym stylu dodadzą po ok. 70 KB; podział atlasu na światy (M6-2) pozostaje w planie.
- **Kolejne szczepy** powstają tak samo: plik na postać w `scripts/lib/beasts/` (albo w katalogu szczepu), wpisy w `heroes.json` i `lines.json`, nazwy w słownikach, ewentualnie nowy klip ataku w rigu.
- Docelowe grafiki rysowane ręcznie mogą zastąpić części jedna po drugiej: wystarczy zachować nazwy sprite'ów i podać pivoty w manifeście atlasu.

## Uzupełnienie (2026-10-05, M5i)

Generator przeniósł się do `scripts/lib/skins/` (katalog na szczep), a bestie zostały przerysowane w stylu „mroczna baśń” razem z trzema kolejnymi szczepami (ADR 0019). Szacunek „po ok. 70 KB na szczep” nie przetrwał zmiany stylu: atlas ma 543 KB, liczby i wnioski są w ADR 0019.
