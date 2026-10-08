// Drzewko run (ADR 0026): żeton run jest nagrodą za poziom, w sklepie odblokowuje następną runę
// wybranego kierunku, a runę wkłada się bohaterowi na ekranie składu.
import { expect, type Locator, type Page, test } from '@playwright/test';
import { collectErrors, play, readSave, seedSave } from './helpers.ts';

const cleared = (ids: readonly string[]) =>
  Object.fromEntries(ids.map((id) => [id, { cleared: true, bestTicks: 500 }]));

/** Pięć poziomów Zamku przeszłych: dwa żetony run, jeden wydany na runę życia u Miecznika. */
const SAVE = {
  saveVersion: 5,
  gameVersion: '0.2.0',
  gold: 100,
  heroes: [
    { id: 1, line: 'swordsman', form: 'swordsman_a', upgrades: 4, runes: ['hp_1', null] },
    { id: 2, line: 'archer', form: 'archer_a', upgrades: 4, runes: [null, null] },
    { id: 3, line: 'plants', form: 'bush', upgrades: 0, runes: [null, null] },
  ],
  nextHeroId: 4,
  runes: ['hp_1'],
  levels: cleared(['w1_l1', 'w1_l2', 'w1_l3', 'w1_l4', 'w1_l5']),
  squad: [1, 2, 3, null, null],
  settings: { lang: 'pl', battleSpeed: 1 },
};

/** Element leży w całości na scenie gry. */
async function expectInsideStage(page: Page, element: Locator): Promise<void> {
  const box = await element.boundingBox();
  const stage = await page.locator('#stage').boundingBox();
  if (box === null || stage === null) throw new Error('no element or stage box');
  expect(box.x).toBeGreaterThanOrEqual(stage.x);
  expect(box.y).toBeGreaterThanOrEqual(stage.y);
  expect(box.x + box.width).toBeLessThanOrEqual(stage.x + stage.width);
  expect(box.y + box.height).toBeLessThanOrEqual(stage.y + stage.height);
}

test('żeton run: plakietka na mapie, wybór runy w drzewku, runa w gnieździe bohatera', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await seedSave(page, SAVE);
  await play(page);

  // Mapa: żeton do wydania widać na zakładce sklepu; nagrodę poziomu na jego tabliczce.
  const shopTab = page.getByRole('button', { name: 'Sklep' });
  await expect(shopTab.locator('.rail-badge')).toHaveText('1');
  await expect(shopTab).toHaveAccessibleName('Sklep: Żetony run: 1');
  // Boss Zamku nie daje żetonu; przeszły już poziom drugi dał go za pierwszym razem.
  await expect(page.locator('.plaque')).toContainText('Sala tronowa');
  await expect(page.locator('.plaque .token-reward')).toHaveCount(0);
  await page.locator('[data-level="w1_l2"]').click();
  await expect(page.locator('.plaque')).toContainText('Za powtórkę');
  await expect(page.locator('.plaque .token-reward')).toHaveCount(0);
  // Drugi poziom następnego świata jeszcze czeka: jego tabliczka zapowiada żeton.
  await page.getByRole('button', { name: /^Następny świat/ }).click();
  await page.locator('[data-level="w2_l2"]').click();
  await expect(page.locator('.plaque .token-reward')).toHaveText('Żeton run');

  // Sklep: drzewko z czterema kierunkami; w każdym po kolei coraz mocniejsze runy.
  await shopTab.click();
  const tree = page.locator('.rune-tree');
  await expectInsideStage(page, tree);
  // Arkusz drzewka jest mały, żeby nie przytłaczał sceny z bohaterami (uwaga autora).
  const sheetBox = await tree.boundingBox();
  const stageBox = await page.locator('#stage').boundingBox();
  if (sheetBox === null || stageBox === null) throw new Error('no tree or stage box');
  expect(sheetBox.width / stageBox.width).toBeLessThan(0.36);
  expect(sheetBox.height / stageBox.height).toBeLessThan(0.32);
  await expect(tree.locator('.rune-branch-name')).toHaveText([
    'Życie',
    'Atak',
    'Odrzut',
    'Szybkość',
  ]);
  await expect(tree.locator('.rune-root .rune-tokens')).toHaveAttribute('data-tokens', '1');
  await expect(tree.locator('[data-branch="hp"] .rune-node')).toHaveText([
    '+60',
    '+100',
    '+160',
    '+240',
    '+340',
    '+460',
  ]);
  const node = (rune: string) => tree.locator(`[data-rune="${rune}"]`);
  await expect(node('hp_1')).toHaveAttribute('data-state', 'owned');
  await expect(node('hp_1')).toBeDisabled();
  await expect(node('hp_2')).toHaveAttribute('data-state', 'next');
  await expect(node('hp_2')).toBeEnabled();
  await expect(node('hp_3')).toHaveAttribute('data-state', 'locked');
  await expect(node('hp_3')).toBeDisabled();
  await expect(node('knockback_1')).toBeEnabled();
  await expect(node('knockback_1')).toHaveAccessibleName('Odrzut +20: następna runa kierunku');
  await expect(tree.locator('.rune-node:enabled')).toHaveCount(4);

  // Kliknięcie runy niczego jeszcze nie wydaje: pod runą pojawia się potwierdzenie.
  const take = page.locator('.rune-take');
  await node('knockback_1').click();
  await expect(take).toContainText('Odrzut +20');
  await expectInsideStage(page, take);
  await expect(node('knockback_1')).toHaveAttribute('aria-expanded', 'true');
  expect((await readSave(page)).runes).toEqual(['hp_1']);
  // Escape zamyka potwierdzenie; kliknięcie innej runy przenosi je do niej.
  await page.keyboard.press('Escape');
  await expect(take).toHaveCount(0);
  await node('speed_1').click();
  await expect(take).toContainText('Szybkość +15');
  await node('knockback_1').click();
  await expect(take).toHaveCount(1);
  await expect(take).toContainText('Odrzut +20');
  await take.getByRole('button', { name: 'Weź runę Odrzut +20 za żeton run' }).click();

  // Żeton wydany: runa jest w drzewku, następna w kierunku czeka na kolejny żeton.
  await expect(take).toHaveCount(0);
  await expect(node('knockback_1')).toHaveAttribute('data-state', 'owned');
  await expect(node('knockback_2')).toHaveAttribute('data-state', 'next');
  await expect(tree.locator('.rune-root .rune-tokens')).toHaveAttribute('data-tokens', '0');
  await expect(tree.locator('.rune-node:enabled')).toHaveCount(0);
  expect((await readSave(page)).runes).toEqual(['hp_1', 'knockback_1']);

  // Zasady drzewka są pod jego przyciskiem „i”.
  await tree.getByRole('button', { name: 'Informacje: Drzewko run' }).click();
  const info = page.locator('.info-popup');
  await expect(info).toContainText(
    'Żeton run dostajesz za pierwsze przejście niektórych poziomów.',
  );
  await expect(info).toContainText('Runy wkładasz bohaterom w gniazda na ekranie składu.');
  await expectInsideStage(page, info);
  await page.keyboard.press('Escape');

  // Mapa: nie ma już czego wydać, plakietka znika.
  await page.getByRole('button', { name: 'Wróć' }).click();
  await expect(page.getByRole('button', { name: 'Sklep' }).locator('.rail-badge')).toHaveCount(0);

  // Skład: nowa runa czeka w wyborze gniazda; po włożeniu zmienia statystykę bohatera.
  await page.getByRole('button', { name: 'Skład' }).click();
  const field = page.locator('[data-drop="slot:0"]');
  const sheet = page.locator('.hero-sheet');
  await expect(field.locator('[data-socket="0"] .rune-token')).toHaveText('+60');
  await expect(sheet.locator('.stat', { hasText: 'Odrzut' })).toHaveText(/^Odrzut\s*15$/);
  await field.locator('[data-socket="1"]').click();
  const picker = page.locator('.rune-picker');
  await expect(picker.locator('[data-rune]')).toHaveCount(1);
  await expect(picker.locator('[data-rune="knockback_1"]')).toContainText('Odrzut');
  await picker.locator('[data-rune="knockback_1"]').click();
  await expect(field.locator('[data-socket="1"] .rune-token')).toHaveText('+20');
  await expect(field.locator('[data-socket="1"] .rune-token')).toHaveClass(/rune-knockback/);
  await expect(sheet.locator('.stat', { hasText: 'Odrzut' })).toHaveText(/^Odrzut\s*35$/);
  const heroes = (await readSave(page)).heroes as { runes: unknown }[];
  expect(heroes[0]?.runes).toEqual(['hp_1', 'knockback_1']);

  expect(errors).toEqual([]);
});

test('wygrana na poziomie z żetonem: nagroda na ekranie wyniku i plakietka na mapie', async ({
  page,
}) => {
  const errors = collectErrors(page);
  // Mocny skład, żeby drugi poziom gry skończył się szybko i na pewno wygraną.
  await seedSave(page, {
    ...SAVE,
    heroes: [
      { id: 1, line: 'swordsman', form: 'swordsman_b2', upgrades: 4, runes: [null, null] },
      { id: 2, line: 'archer', form: 'archer_b2', upgrades: 4, runes: [null, null] },
    ],
    nextHeroId: 3,
    runes: [],
    levels: cleared(['w1_l1']),
    squad: [1, 2, null, null, null],
  });
  await play(page);
  await expect(page.locator('.rail-badge')).toHaveCount(0);
  await expect(page.locator('.plaque')).toContainText('Most zwodzony');
  await expect(page.locator('.plaque .token-reward')).toHaveText('Żeton run');

  await page.getByRole('button', { name: 'Walcz' }).click();
  await page.getByRole('button', { name: 'x4' }).click();
  const result = page.locator('.result-sheet');
  await expect(result).toHaveAttribute('data-outcome', 'win', { timeout: 90_000 });
  await expect(result.locator('[data-reward="rune-token"]')).toHaveText('Żeton run');
  await expect(result.getByRole('button')).toHaveCount(1);
  // Żeton nie jest polem zapisu: wynika z przeszłego poziomu.
  const save = await readSave(page);
  expect(save.levels).toMatchObject({ w1_l2: { cleared: true } });
  expect(save.runes).toEqual([]);

  await result.getByRole('button', { name: 'OK' }).click();
  await expect(page.getByRole('button', { name: 'Sklep' }).locator('.rail-badge')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('drzewko run mieści się w scenie w małym oknie i po angielsku', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 700, height: 620 });
  await seedSave(page, { ...SAVE, settings: { lang: 'en', battleSpeed: 1 } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.locator('.map')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Shop' })).toHaveAccessibleName(
    'Shop: Rune tokens: 1',
  );

  await page.getByRole('button', { name: 'Shop' }).click();
  const tree = page.locator('.rune-tree');
  await expectInsideStage(page, tree);
  await expect(tree.locator('.rune-branch-name')).toHaveText([
    'Health',
    'Attack',
    'Knockback',
    'Speed',
  ]);
  // Ostatnia runa najniższego kierunku: potwierdzenie pod nią musi zmieścić się w scenie.
  await tree.locator('[data-rune="speed_1"]').click();
  const take = page.locator('.rune-take');
  await expect(take).toContainText('Speed +15');
  await expect(
    take.getByRole('button', { name: 'Take the rune Speed +15 for a rune token' }),
  ).toBeVisible();
  await expectInsideStage(page, take);
  // Kliknięcie obok zamyka potwierdzenie bez wydania żetonu.
  await page.locator('.purse').click();
  await expect(take).toHaveCount(0);
  expect((await readSave(page)).runes).toEqual(['hp_1']);
  expect(errors).toEqual([]);
});
