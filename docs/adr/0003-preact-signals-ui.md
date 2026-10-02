# ADR 0003: Preact i `@preact/signals` jako nakładka UI

- Status: zaakceptowany
- Data: 2026-10-02

## Kontekst

Poza walką gra to zwykłe ekrany: menu, mapa poziomów, budowanie składu z przeciąganiem, ulepszenia, runy, wynik. Rysowanie ich na canvasie oznaczałoby pisanie własnego układu, tekstu, przewijania i obsługi dotyku. DOM daje to za darmo, razem z dostępnością i skalowaniem tekstu.

## Decyzja

UI poza walką i HUD w walce to komponenty Preact w nakładce DOM nad canvasem. Stan aplikacji trzymamy w sygnałach (`@preact/signals`). Nie dodajemy osobnego frameworka do zarządzania stanem ani routera.

## Konsekwencje

- Dwie zależności runtime, łącznie kilka KB gzip, mieszczą się w budżecie 150 KB.
- W trakcie walki Preact nie może być aktualizowany co klatkę. HUD reaguje na zdarzenia (pauza, zmiana prędkości, koniec walki); wszystko, co zmienia się co klatkę, rysuje renderer.
- Logika gry nie trafia do komponentów: `ui` importuje z `game`, nie odwrotnie.
- Sceny są stanem aplikacji, nie ścieżkami URL, co jest zgodne z wymaganiem braku routingu po ścieżkach ([DEPLOY.md](../DEPLOY.md)).
- CSP bez `unsafe-inline`: style komponentów muszą pochodzić z plików CSS albo być ustawiane przez właściwości DOM, nie przez wstrzykiwane znaczniki `<style>`.
