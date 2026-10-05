// Testy end-to-end pętli gry na buildzie produkcyjnym (M4-11): gra startuje, walka dochodzi
// do końca, postęp się zapisuje, a konsola przeglądarki nie zawiera błędów.
import { expect, type Page, test } from '@playwright/test';

const SAVE_KEY = 'five-fangs.save';

/** Zbiera błędy konsoli i nieobsłużone wyjątki strony. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  return errors;
}

async function readSave(page: Page): Promise<Record<string, unknown>> {
  const text = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  expect(text).not.toBeNull();
  return JSON.parse(text ?? '{}') as Record<string, unknown>;
}

/** Wstawia zapis przed startem gry, o ile przeglądarka nie ma jeszcze żadnego. */
async function seedSave(page: Page, save: unknown): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    [SAVE_KEY, JSON.stringify(save)] as const,
  );
}

/** Otwiera grę i przechodzi z ekranu startowego na mapę. */
async function play(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Graj' }).click();
  await expect(page.locator('.map')).toBeVisible();
}

/** Liczba miniaturek pod selektorem (canvasy `.portrait-face`), na których coś narysowano. */
async function paintedPortraits(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluateAll(
    (nodes) =>
      nodes.filter((node) => {
        if (!(node instanceof HTMLCanvasElement)) return false;
        const pixels = node.getContext('2d')?.getImageData(0, 0, node.width, node.height).data;
        return pixels?.some((value, index) => index % 4 === 3 && value > 0) ?? false;
      }).length,
  );
}

const hero = (id: number, line: string) => ({
  id,
  line,
  form: 0,
  upgrades: 0,
  runes: [null, null],
});

test('nowa gra: walka dochodzi do końca, nagroda trafia do zapisu, konsola bez błędów', async ({
  page,
}) => {
  const errors = collectErrors(page);
  // Gra otwiera się ekranem startowym z jednym przyciskiem.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Five Fangs' })).toBeVisible();
  await expect(page.getByRole('button')).toHaveCount(1);
  await page.getByRole('button', { name: 'Graj' }).click();

  // Ekranem głównym jest mapa z wybranym pierwszym poziomem; składu nie da się tu zmienić.
  await expect(page.locator('[data-level="w1_l1"]')).toBeEnabled();
  await expect(page.locator('[data-level="w1_l2"]')).toBeDisabled();
  await expect(page.locator('.plaque')).toContainText('Skraj lasu');
  await expect(page.locator('.unit-tag-enemy')).toContainText('Osiłek');
  // Pod bohaterami gracza podpisy jak pod przeciwnikami, bez oznaczenia przy zerze ulepszeń.
  await expect(page.locator('.unit-tag-hero')).toHaveCount(2);
  await expect(page.locator('.unit-tag-hero', { hasText: 'Miecznik' })).toHaveCount(1);
  await expect(page.locator('.unit-tag-hero .unit-level')).toHaveCount(0);
  await expect(page.locator('.hero-chip')).toHaveCount(0);

  await page.getByRole('button', { name: 'Walcz' }).click();
  // W dolnych rogach miniaturki żywych postaci: dwóch bohaterów z lewej, przeciwnik z prawej.
  const allies = page.locator('.hud-faces-player .hud-face');
  const foes = page.locator('.hud-faces-enemy .hud-face');
  await expect(allies).toHaveCount(2);
  await expect(foes).toHaveCount(1);
  await expect(foes).toHaveAttribute('data-unit', 'brute');
  await expect(page.locator('.hud-face[data-alive="true"]')).toHaveCount(3);
  await expect.poll(() => paintedPortraits(page, '.hud-face .portrait-face')).toBe(3);
  await page.getByRole('button', { name: 'x4' }).click();
  // Pokonany przeciwnik traci miniaturkę, zanim brama zamknie pole walki.
  await expect
    .poll(() => page.locator('.hud-faces-enemy .hud-face[data-alive="false"]').count(), {
      intervals: [100],
      timeout: 90_000,
    })
    .toBe(1);
  const result = page.locator('.result-sheet');
  await expect(result).toHaveAttribute('data-outcome', 'win', { timeout: 90_000 });
  await expect(result).toContainText('Zwycięstwo');
  await expect(result.locator('.rewards')).toContainText('+100 złota');
  // Po walce jest tylko informacja o nagrodach i jeden przycisk.
  await expect(result.getByRole('button')).toHaveCount(1);

  const save = await readSave(page);
  expect(save.gold).toBe(100);
  expect(save.levels).toMatchObject({ w1_l1: { cleared: true } });

  // OK wraca na mapę, która wybiera następny poziom.
  await result.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('.plaque')).toContainText('Zasadzka');
  await expect(page.locator('.purse')).toHaveAttribute('data-gold', '100');

  // Po przeładowaniu strony postęp zostaje.
  await page.reload();
  await page.getByRole('button', { name: 'Graj' }).click();
  await expect(page.locator('.purse')).toHaveAttribute('data-gold', '100');
  await expect(page.locator('[data-level="w1_l1"]')).toHaveClass(/tile-cleared/);
  await expect(page.locator('[data-level="w1_l2"]')).toBeEnabled();
  await expect(page.locator('.plaque')).toContainText('Zasadzka');

  expect(errors).toEqual([]);
});

test('skład, sklep i bohaterowie: ulepszenie, runa, zakup, przeciąganie postaci, język', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await seedSave(page, {
    saveVersion: 2,
    gameVersion: '0.1.0',
    gold: 600,
    heroes: [hero(1, 'swordsman'), hero(2, 'archer')],
    nextHeroId: 3,
    runes: ['rune_hp_100'],
    levels: { w1_l1: { cleared: true, bestTicks: 420 } },
    squad: [1, 2, null, null, null],
    settings: { lang: 'pl', battleSpeed: 1 },
  });
  await play(page);
  // Pola bohaterów (runy, ulepszenia, zakup) są tylko na ekranie składu.
  await expect(page.locator('.rune-socket')).toHaveCount(0);

  // Skład: ulepszenie przyciskiem „Kup” w polu Miecznika; karta z prawej tylko pokazuje statystyki.
  await page.getByRole('button', { name: 'Skład' }).click();
  const field = page.locator('[data-drop="slot:0"]');
  const sheet = page.locator('.hero-sheet');
  await expect(sheet).toContainText('Miecznik');
  await expect(sheet.getByRole('button')).toHaveCount(0);
  await expect(field.locator('.upgrade-bar')).toHaveAttribute('data-upgrades', '0');
  await field.getByRole('button', { name: 'Kup ulepszenie za 50 złota' }).click();
  await expect(field.locator('.upgrade-bar')).toHaveAttribute('data-upgrades', '1');
  await expect(sheet).toContainText('Ulepszenia 1 z 4');
  await expect(page.locator('.purse')).toHaveAttribute('data-gold', '550');

  // Runa: gniazdo nad bohaterem otwiera wybór, wybrany żeton trafia do gniazda.
  await field.locator('[data-socket="0"]').click();
  await page.locator('.rune-picker [data-rune="rune_hp_100"]').click();
  await expect(page.locator('.rune-picker')).toHaveCount(0);
  await expect(field.locator('[data-socket="0"] .rune-token')).toHaveText('+100');
  const runes = ((await readSave(page)).heroes as { runes: unknown }[])[0]?.runes;
  expect(runes).toEqual(['rune_hp_100', null]);

  // Ze składu wychodzi się tylko na mapę: nie ma skrótu do sklepu.
  await expect(page.getByRole('button', { name: 'Sklep' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Wróć' }).click();

  // Bohaterowie: drzewo ewolucji linii z kosztami; kupowania tu nie ma.
  await page.getByRole('button', { name: 'Bohaterowie' }).click();
  const info = page.locator('.heroes');
  await expect(info).toContainText('Miecznik');
  await expect(info).toContainText('Rycerz');
  await expect(info.locator('.tree-cost').first()).toContainText('250');
  await info.getByRole('button', { name: 'Akolita' }).click();
  await expect(info).toContainText('Kapłan');
  await expect(info.locator('[data-action="buy"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Wróć' }).click();

  // Sklep: nowy typ bohatera i drugi egzemplarz posiadanego.
  await page.getByRole('button', { name: 'Sklep' }).click();
  await page.locator('[data-line="guard"] [data-action="buy"]').click();
  await page.locator('[data-line="swordsman"] [data-action="buy"]').click();
  await expect(page.locator('.purse')).toHaveAttribute('data-gold', '50');
  await expect(page.locator('[data-line="swordsman"]')).toContainText('Masz: 2');
  await expect(page.locator('[data-line="cleric"] [data-action="buy"]')).toBeDisabled();
  let save = await readSave(page);
  expect(save.squad).toEqual([1, 2, 3, 4, null]);

  // Skład: Tarczownik (id 3) złapany na scenie i przeniesiony na front; zamienia się miejscami
  // z Miecznikiem.
  await page.getByRole('button', { name: 'Wróć' }).click();
  await page.getByRole('button', { name: 'Skład' }).click();
  await page.locator('.stage-hero[data-hero="3"]').dragTo(page.locator('[data-drop="slot:0"]'));
  await expect(page.locator('[data-drop="slot:0"] .field-name')).toHaveText('Tarczownik');
  save = await readSave(page);
  expect(save.squad).toEqual([3, 2, 1, 4, null]);

  // Język: zmiana od razu widoczna i zapisana.
  await page.getByRole('button', { name: 'Wróć' }).click();
  await page.getByRole('button', { name: 'Ustawienia' }).click();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect((await readSave(page)).settings).toMatchObject({ lang: 'en' });

  expect(errors).toEqual([]);
});

test('ewolucja z wyborem drogi i drzewo ewolucji w zakładce Bohaterowie', async ({ page }) => {
  const errors = collectErrors(page);
  await seedSave(page, {
    saveVersion: 3,
    gameVersion: '0.1.0',
    gold: 2000,
    heroes: [
      { id: 1, line: 'swordsman', form: 'swordsman_a', upgrades: 4, runes: [null, null] },
      { id: 2, line: 'archer', form: 'archer_a', upgrades: 0, runes: [null, null] },
    ],
    nextHeroId: 3,
    runes: [],
    levels: { w1_l1: { cleared: true, bestTicks: 420 } },
    squad: [1, 2, null, null, null],
    settings: { lang: 'pl', battleSpeed: 1 },
  });
  await play(page);

  // Z formy bazowej wychodzą dwie drogi: przycisk otwiera wybór, każda droga ma własny zakup.
  await page.getByRole('button', { name: 'Skład' }).click();
  await page
    .locator('[data-drop="slot:0"]')
    .getByRole('button', { name: 'Wybierz drogę ewolucji' })
    .click();
  const picker = page.locator('.evolve-picker');
  await expect(picker.locator('.evolve-option')).toHaveCount(2);
  await expect(picker).toContainText('Rycerz');
  await expect(picker).toContainText('Strażnik (kopia)');
  await picker
    .getByRole('button', { name: 'Kup ewolucję w formę Strażnik (kopia) za 250 złota' })
    .click();
  await expect(picker).toHaveCount(0);
  await expect(page.locator('[data-drop="slot:0"] .field-name')).toHaveText('Strażnik (kopia)');
  const heroes = (await readSave(page)).heroes as { form: unknown; upgrades: unknown }[];
  expect(heroes[0]).toMatchObject({ form: 'swordsman_c', upgrades: 0 });

  // Bohaterowie: drzewo linii, wybrana forma na karcie i jej droga na scenie.
  await page.getByRole('button', { name: 'Wróć' }).click();
  await page.getByRole('button', { name: 'Bohaterowie' }).click();
  const tree = page.locator('.tree');
  await expect(tree.locator('.tree-node')).toHaveCount(5);
  await tree.getByRole('button', { name: 'Strażnik II (kopia)' }).click();
  await expect(page.locator('.form-card')).toContainText('Ewolucja 2. stopnia');
  await expect(page.locator('.form-card')).toContainText('Ostatni stopień tej drogi');
  await expect(page.locator('.path-name')).toHaveText([
    'Miecznik',
    'Strażnik (kopia)',
    'Strażnik II (kopia)',
  ]);
  expect(errors).toEqual([]);
});

test('miniaturki: bohater poza składem i formy w drzewie ewolucji', async ({ page }) => {
  const errors = collectErrors(page);
  await seedSave(page, {
    saveVersion: 3,
    gameVersion: '0.1.0',
    gold: 0,
    heroes: [
      { id: 1, line: 'swordsman', form: 'swordsman_a', upgrades: 0, runes: [null, null] },
      { id: 2, line: 'archer', form: 'archer_b', upgrades: 3, runes: [null, null] },
    ],
    nextHeroId: 3,
    runes: [],
    levels: {},
    squad: [1, null, null, null, null],
    settings: { lang: 'pl', battleSpeed: 1 },
  });
  await play(page);

  // Skład: bohater spoza składu to miniaturka z nazwą formy i liczbą ulepszeń.
  await page.getByRole('button', { name: 'Skład' }).click();
  const chip = page.locator('.hero-chip');
  await expect(chip).toHaveCount(1);
  await expect(chip.locator('.chip-name')).toHaveText('Strzelec wyborowy');
  await expect(chip.locator('.chip-level')).toHaveText('+3');
  await expect.poll(() => paintedPortraits(page, '.hero-chip .portrait-face')).toBe(1);
  // Miniaturkę łapie się jak postać: upuszczona na slocie wchodzi do składu.
  await chip.dragTo(page.locator('[data-drop="slot:1"]'));
  await expect(page.locator('[data-drop="slot:1"] .field-name')).toHaveText('Strzelec wyborowy +3');
  await expect(page.locator('.hero-chip')).toHaveCount(0);
  expect((await readSave(page)).squad).toEqual([1, 2, null, null, null]);

  // Bohaterowie: każda forma w drzewie i karta wybranej formy mają miniaturkę.
  await page.getByRole('button', { name: 'Wróć' }).click();
  await page.getByRole('button', { name: 'Bohaterowie' }).click();
  await expect(page.locator('.tree-node')).toHaveCount(5);
  await expect.poll(() => paintedPortraits(page, '.tree-node .portrait-face')).toBe(5);
  await expect.poll(() => paintedPortraits(page, '.form-head .portrait-face')).toBe(1);
  expect(errors).toEqual([]);
});

test('zapis w wersji 1 wczytuje się przez migrację', async ({ page }) => {
  const errors = collectErrors(page);
  await seedSave(page, {
    saveVersion: 1,
    gameVersion: '0.1.0',
    gold: 135,
    lines: {
      swordsman: { form: 0, upgrades: 3, runes: [null, null] },
      archer: { form: 1, upgrades: 1, runes: [null, null] },
    },
    runes: [],
    levels: { w1_l1: { cleared: true, bestTicks: 412 } },
    squad: ['swordsman', 'archer', null, null, null],
    settings: { lang: 'pl', battleSpeed: 2 },
  });
  await play(page);
  await expect(page.locator('.purse')).toHaveAttribute('data-gold', '135');
  await page.getByRole('button', { name: 'Skład' }).click();
  await expect(page.locator('[data-drop="slot:0"] .field-name')).toHaveText('Miecznik +3');
  await expect(page.locator('[data-drop="slot:1"] .field-name')).toHaveText('Strzelec wyborowy +1');
  expect(errors).toEqual([]);
});

test('uszkodzony zapis nie zatrzymuje gry', async ({ page }) => {
  const errors = collectErrors(page);
  await page.addInitScript((key) => localStorage.setItem(key, '{ zepsuty zapis'), SAVE_KEY);
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Zapis gry był uszkodzony');
  await page.getByRole('alert').getByRole('button', { name: 'OK' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Graj' }).click();
  await expect(page.locator('[data-level="w1_l1"]')).toBeEnabled();
  expect(errors).toEqual([]);
});
