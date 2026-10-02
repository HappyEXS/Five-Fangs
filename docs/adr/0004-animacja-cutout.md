# ADR 0004: Animacja cutout zamiast spritesheetów

- Status: zaakceptowany
- Data: 2026-10-02

## Kontekst

Gra potrzebuje 12 form bohaterów oraz wrogów i bossów pięciu światów, każdy z animacjami idle, chodu, ataku i śmierci. Transfer jest ograniczony: pierwsze uruchomienie poniżej 2 MB, atlas świata poniżej 1 MB. Prototyp animacji wycinankowej (części ciała obracane w stawach według klatek kluczowych) został zaakceptowany wizualnie.

Spritesheet z klatkami wymagałby narysowania każdej klatki każdej animacji każdej postaci i zająłby wielokrotnie więcej miejsca.

## Decyzja

Postać składa się z ok. 11 części rysowanych z atlasu i obracanych w stawach. Jeden rig (`humanoid`) i jeden zestaw klipów obsługuje wiele postaci; postacie różnią się **skórką**, czyli zestawem części. Głowa i broń są slotami wymiennymi. Części rysowane są w 2× rozdzielczości logicznej, z włączonym wygładzaniem, jako gładka grafika (nie pixel art).

Symulacja jest źródłem prawdy o czasie ataku: klip ataku odtwarzany jest według postępu zamachu z sim.

## Konsekwencje

- Nowa postać to ok. 11 obrazków i wpis w danych, bez nowych animacji.
- Nowa animacja to jeden klip JSON działający dla wszystkich postaci na tym rigu. Edytor animacji (M3) jest narzędziem o najwyższym zwrocie.
- Postacie o innej budowie (np. boss czworonożny) wymagają osobnego rigu i klipów.
- Ruch wygląda „lalkowo”; to świadomy styl.
- Macierze kości liczymy ręcznie w prealokowanych tablicach; zakaz `DOMMatrix` i `ctx.filter` w gorącej pętli.
- Walidator treści pilnuje, by znacznik `hit` w klipie zgadzał się z `hitFraction` typu ataku.
