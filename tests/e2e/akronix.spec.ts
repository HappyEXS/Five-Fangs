// Szczep wrogów Akronix w zakładce Bohaterowie: poczet zamiast drzewa ewolucji, karta bez cen
// i kosztów, postacie stopnia na scenie. Akronixów nie ma w sklepie.
import { expect, test } from '@playwright/test';
import { collectErrors, paintedPortraits, play, seedSave } from './helpers.ts';

const SAVE = {
  saveVersion: 4,
  gameVersion: '0.1.0',
  gold: 5000,
  heroes: [{ id: 1, line: 'swordsman', form: 'swordsman_a', upgrades: 0, runes: [null, null] }],
  nextHeroId: 2,
  runes: [],
  levels: {},
  squad: [1, null, null, null, null],
  settings: { lang: 'pl', battleSpeed: 1 },
};

const NAMES = [
  'Bowix',
  'Assasinix',
  'Katanix',
  'Defenix',
  'Poisonix',
  'Hornix',
  'Kaisarix',
  'Axin 1',
  'Axin 2',
  'Axin 3',
];

test('Akronix w Bohaterach: poczet dziesięciu wrogów, karty ze zdolnościami, brak w sklepie', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await seedSave(page, SAVE);
  await play(page);

  await page.getByRole('button', { name: 'Bohaterowie' }).click();
  const heroes = page.locator('.screen.heroes');
  // Zakładka szczepu wrogów stoi za szczepami bohaterów.
  await expect(heroes.locator('.line-tabs button')).toHaveText([
    'Miecznicy',
    'Łucznicy',
    'Beasts',
    'Immortals',
    'Plants',
    'Robots',
    'Akronix',
  ]);
  await heroes.getByRole('button', { name: 'Akronix' }).click();

  // Poczet zamiast drzewa: pięć stopni, dziesięć postaci w kolejności siły, każda z miniaturką.
  await expect(heroes.locator('.tree')).toHaveCount(0);
  const roster = heroes.getByRole('list', { name: 'Poczet szczepu' });
  await expect(roster.locator('.roster-title')).toHaveText([
    'Zwiadowca',
    'Żołnierz',
    'Wojownik',
    'Generał',
    'Boss',
  ]);
  await expect(roster.locator('.tree-name')).toHaveText(NAMES);
  await expect.poll(() => paintedPortraits(page, '.roster .portrait-face')).toBe(10);

  // Pierwsza postać jest wybrana; na scenie stoi jej stopień, a karta nie ma cen ani kosztów.
  const card = heroes.locator('.form-card');
  await expect(card.locator('.hero-name')).toHaveText('Bowix');
  await expect(card.locator('.hero-form')).toHaveText(/Akronix\s*Zwiadowca/);
  await expect(heroes.locator('.path-name')).toHaveText(['Bowix', 'Assasinix']);
  await expect(card.locator('.gold-amount')).toHaveCount(0);
  await expect(card.locator('.stat-next')).toHaveCount(0);
  await expect(card.locator('.info-btn')).toHaveCount(0);
  await expect(heroes.locator('.path-arrow')).toHaveCount(0);
  await expect(heroes.locator('[data-action="buy"]')).toHaveCount(0);

  // Zdolności ze szkicu autora na kartach.
  await roster.getByRole('button', { name: 'Axin 2' }).click();
  await expect(card.locator('.hero-form')).toHaveText(/Akronix\s*Boss/);
  await expect(card).toContainText(
    'Krwawienie: trafiony traci 30 życia co 1 s przez 10 s. Kolejne trafienie odnawia czas.',
  );
  await expect(heroes.locator('.path-name')).toHaveText(['Axin 1', 'Axin 2', 'Axin 3']);
  // Nazwa pod postacią na scenie też ją wybiera.
  await heroes.locator('.path-name[data-form="axin_3"]').click();
  await expect(card.locator('.hero-name')).toHaveText('Axin 3');
  await expect(card).toContainText('Tarcza: otrzymuje o 10% mniej obrażeń.');
  await roster.getByRole('button', { name: 'Poisonix' }).click();
  await expect(card).toContainText('Trucizna: trafiony traci 20 życia co 1 s przez 5 s.');
  await roster.getByRole('button', { name: 'Hornix' }).click();
  await expect(card).toContainText('Szarża: pierwszy cios w walce zadaje obrażenia razy 3.');
  await expect(heroes.locator('.path-name')).toHaveText(['Poisonix', 'Hornix']);
  await roster.getByRole('button', { name: 'Kaisarix' }).click();
  await expect(heroes.locator('.path-name')).toHaveText(['Kaisarix']);

  // Okienko „i” przy tytule mówi, że to wrogowie.
  await page.getByRole('button', { name: 'Informacje: Bohaterowie' }).click();
  const popup = page.locator('.info-popup');
  await expect(popup).toContainText(
    'To szczep wrogów: jego postaci nie da się kupić ani rozwijać.',
  );
  await page.keyboard.press('Escape');

  // Powrót do szczepu bohaterów przywraca drzewo i zasady ulepszeń.
  await heroes.getByRole('button', { name: 'Miecznicy' }).click();
  await expect(heroes.locator('.tree .tree-node')).toHaveCount(7);
  await expect(heroes.locator('.roster')).toHaveCount(0);

  // Sklep sprzedaje tylko szczepy bohaterów.
  await page.getByRole('button', { name: 'Wróć' }).click();
  await page.getByRole('button', { name: 'Sklep' }).click();
  await expect(page.locator('.shop-tag')).toHaveCount(6);
  await expect(page.locator('.shop-tag[data-line="akronix"]')).toHaveCount(0);
  await expect(page.locator('.screen.shop')).not.toContainText('Bowix');
  expect(errors).toEqual([]);
});

test('poczet Akronixów mieści się w scenie w małym oknie i po angielsku', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 760, height: 560 });
  await seedSave(page, { ...SAVE, settings: { lang: 'en', battleSpeed: 1 } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.locator('.map')).toBeVisible();
  await page.getByRole('button', { name: 'Heroes' }).click();
  await page.locator('.line-tabs [data-line="akronix"]').click();
  await page.locator('.roster [data-form="axin_2"]').click();

  await expect(page.locator('.roster-title')).toHaveText([
    'Scout',
    'Soldier',
    'Warrior',
    'General',
    'Boss',
  ]);
  await expect(page.locator('.form-card')).toContainText(
    'Bleeding: the target loses 30 health every 1 s for 10 s.',
  );
  const stage = await page.locator('#stage').boundingBox();
  if (stage === null) throw new Error('no stage box');
  for (const selector of ['.tree-sheet', '.form-card', '.line-tabs']) {
    const box = await page.locator(selector).boundingBox();
    if (box === null) throw new Error(`no box for ${selector}`);
    expect(box.x, selector).toBeGreaterThanOrEqual(stage.x);
    expect(box.x + box.width, selector).toBeLessThanOrEqual(stage.x + stage.width);
    expect(box.y + box.height, selector).toBeLessThanOrEqual(stage.y + stage.height);
  }
  // Poczet kończy się nad linią podłogi, na której stoją postacie.
  const roster = await page.locator('.tree-sheet').boundingBox();
  const names = await page.locator('.path-name').first().boundingBox();
  if (roster === null || names === null) throw new Error('no roster or names box');
  expect(roster.y + roster.height).toBeLessThan(names.y);
  expect(errors).toEqual([]);
});
