# ADR 0001: Canvas 2D za interfejsem `Renderer`

- Status: zaakceptowany
- Data: 2026-10-02

## Kontekst

Walka pokazuje najwyżej 10 postaci po ok. 11 części, kilkadziesiąt pocisków i liczb obrażeń. Budżet paczki JS to 150 KB gzip, a każda zależność runtime wymaga uzasadnienia. Silniki takie jak PixiJS czy Phaser dają WebGL i gotowe narzędzia, ale ważą więcej niż cały budżet lub jego znaczną część.

## Decyzja

Renderujemy walkę własnym kodem na Canvas 2D. Reszta gry zna wyłącznie interfejs `Renderer` opisany w [ARCHITECTURE.md §5.1](../ARCHITECTURE.md). Renderer czyta stan symulacji i zdarzenia, nigdy ich nie zmienia.

## Konsekwencje

- Brak zależności runtime dla renderowania; pełna kontrola nad alokacjami.
- Rig, klipy, atlas i pule piszemy sami (M2).
- Jeśli Canvas 2D przestanie mieścić się w budżecie czasu klatki, drugą implementację `Renderer` (WebGL) da się dodać bez zmian w `sim`, `game` i `ui`. Taka zmiana wymaga nowego ADR.
- Efekty niedostępne w Canvas 2D (shadery, blendowanie addytywne na dużą skalę) są poza zakresem.
