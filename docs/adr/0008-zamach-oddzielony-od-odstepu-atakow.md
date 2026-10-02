# ADR 0008: Czas zamachu oddzielony od odstępu między atakami

- Status: zaakceptowany (odstępstwo od briefu startowego, §4.3)
- Data: 2026-10-02

## Kontekst

Brief wyprowadzał długość całego ataku z `attackSpeed`: atak trwał `1 / attackSpeed`, a animacja była rozciągana na cały cykl. Symulacja jest źródłem prawdy o czasie, więc animacja musi podążać za nią. Skutek: bohater z `attackSpeed` 0,5 machałby mieczem przez 2 sekundy, a z `attackSpeed` 3 nienaturalnie szybko.

## Decyzja

Typ ataku ma własny, stały czas zamachu (`swingDuration`) i `hitFraction`. `attackSpeed` jednostki wyznacza wyłącznie odstęp między początkami kolejnych ataków.

```
tick T                    początek ataku (AttackStarted), cel zablokowany
tick T + hitTick          trafienie melee albo wystrzał pocisku
tick T + swingTicks       koniec zamachu, jednostka wolna
tick T + attackInterval   najwcześniejszy początek następnego ataku
```

W trakcie zamachu jednostka nie rusza się i nie zmienia celu. Między końcem zamachu a następnym atakiem może iść albo stać. Walidator treści wymaga `attackInterval ≥ swingTicks`.

## Konsekwencje

- Animacja ataku ma zawsze tę samą, dobrze wyglądającą długość, niezależnie od `attackSpeed`.
- `attackSpeed` jest ograniczony z góry przez czas zamachu typu ataku (np. zamach 0,4 s daje najwyżej 2,5 ataku/s).
- Bohater o wolnym ataku ma długie okno, w którym może się przemieścić; szybki jest prawie cały czas zablokowany w zamachach. To element taktyki, nie błąd.
- Ulepszenia i runy przyspieszające atak, jeśli kiedyś powstaną, muszą respektować to ograniczenie; sposób (przycięcie albo odrzucenie przez walidator) do ustalenia razem z nimi.
- Dane mają jedno pole więcej na typ ataku, nie na jednostkę.
