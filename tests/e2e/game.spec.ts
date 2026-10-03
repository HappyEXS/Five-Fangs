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
  await expect(page.locator('.enemy-tag')).toContainText('Osiłek');
  await expect(page.locator('.hero-chip')).toHaveCount(0);

  await page.getByRole('button', { name: 'Walcz' }).click();
  await page.getByRole('button', { name: 'x4' }).click();
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

  // Bohaterowie: obie formy linii i koszt ewolucji; kupowania tu nie ma.
  await page.getByRole('button', { name: 'Bohaterowie' }).click();
  const info = page.locator('.heroes');
  await expect(info).toContainText('Miecznik');
  await expect(info).toContainText('Rycerz');
  await expect(info.locator('[data-evolve-cost="250"]')).toContainText('Ewolucja');
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
