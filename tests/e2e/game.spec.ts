// Test end-to-end pętli gry na buildzie produkcyjnym (M4-11): gra startuje, walka dochodzi
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

test('nowa gra: walka dochodzi do końca, nagroda trafia do zapisu, konsola bez błędów', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Five Fangs' })).toBeVisible();

  await page.getByRole('button', { name: 'Graj' }).click();
  // Na starcie dostępny jest tylko pierwszy poziom.
  await expect(page.locator('[data-level="w1_l1"]')).toBeEnabled();
  await expect(page.locator('[data-level="w1_l2"]')).toBeDisabled();

  await page.locator('[data-level="w1_l1"]').click();
  await expect(page.locator('[data-drop="slot:0"] .hero-chip')).toHaveText('Miecznik');
  await page.getByRole('button', { name: 'Walcz' }).click();

  await page.getByRole('button', { name: 'x4' }).click();
  const result = page.locator('.result-panel');
  await expect(result).toHaveAttribute('data-outcome', 'win', { timeout: 90_000 });
  await expect(result).toContainText('Zwycięstwo');
  await expect(result.locator('.rewards')).toContainText('+260 złota');

  const save = await readSave(page);
  expect(save.gold).toBe(260);
  expect(save.levels).toMatchObject({ w1_l1: { cleared: true } });

  // Po przeładowaniu strony postęp zostaje, a drugi poziom jest odblokowany.
  await page.reload();
  await page.getByRole('button', { name: 'Graj' }).click();
  await expect(page.locator('[data-level="w1_l1"]')).toHaveClass(/level-cleared/);
  await expect(page.locator('[data-level="w1_l2"]')).toBeEnabled();
  await expect(page.locator('.gold')).toHaveText('Złoto: 260');

  expect(errors).toEqual([]);
});

test('ulepszenie bohatera, zmiana składu przeciągnięciem i zmiana języka', async ({ page }) => {
  const errors = collectErrors(page);
  // Zapis z 260 złota: wystarcza na ulepszenia za 50 i 80.
  await page.addInitScript(
    ([key, value]) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    [
      SAVE_KEY,
      JSON.stringify({
        saveVersion: 1,
        gameVersion: '0.1.0',
        gold: 260,
        lines: {
          swordsman: { form: 0, upgrades: 0, runes: [null, null] },
          archer: { form: 0, upgrades: 0, runes: [null, null] },
        },
        runes: [],
        levels: { w1_l1: { cleared: true, bestTicks: 420 } },
        squad: ['swordsman', 'archer', null, null, null],
        settings: { lang: 'pl', battleSpeed: 1 },
      }),
    ] as const,
  );
  await page.goto('/');

  await page.getByRole('button', { name: 'Bohaterowie' }).click();
  const card = page.locator('[data-line="swordsman"]');
  await expect(card).toContainText('ulepszenia 0/4');
  await card.locator('[data-action="upgrade"]').click();
  await expect(card).toContainText('ulepszenia 1/4');
  await expect(page.locator('.gold')).toHaveText('Złoto: 210');
  await page.getByRole('button', { name: 'Wróć' }).click();

  // Łucznik ze slotu 2 na slot 4, przeciągnięciem.
  await page.getByRole('button', { name: 'Graj' }).click();
  await page.locator('[data-level="w1_l2"]').click();
  await page
    .locator('[data-drop="slot:1"] .hero-chip')
    .dragTo(page.locator('[data-drop="slot:3"]'));
  await expect(page.locator('[data-drop="slot:3"] .hero-chip')).toHaveText('Łucznik');
  expect((await readSave(page)).squad).toEqual(['swordsman', null, null, 'archer', null]);

  // Język: zmiana od razu widoczna i zapisana.
  await page.getByRole('button', { name: 'Wróć' }).click();
  await page.getByRole('button', { name: 'Wróć' }).click();
  await page.getByRole('button', { name: 'Ustawienia' }).click();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect((await readSave(page)).settings).toMatchObject({ lang: 'en' });

  expect(errors).toEqual([]);
});

test('uszkodzony zapis nie zatrzymuje gry', async ({ page }) => {
  const errors = collectErrors(page);
  await page.addInitScript((key) => localStorage.setItem(key, '{ zepsuty zapis'), SAVE_KEY);
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Zapis gry był uszkodzony');
  await page.getByRole('button', { name: 'OK' }).click();
  await page.getByRole('button', { name: 'Graj' }).click();
  await expect(page.locator('[data-level="w1_l1"]')).toBeEnabled();
  expect(errors).toEqual([]);
});
