// Sześć światów na mapie: duże strzałki przełączają świat, a z nim tło sceny, szlak i nazwy
// poziomów. Świat, do którego gracz nie doszedł, da się obejrzeć, ale nie da się w nim walczyć.
import { expect, type Page, test } from '@playwright/test';
import { collectErrors, play, seedSave } from './helpers.ts';

const WORLDS = [
  ['Zamek', 'Podgrodzie', 'Sala tronowa'],
  ['Mechanus town', 'Złomowisko', 'Rdzeń'],
  ['Living swamps', 'Skraj bagien', 'Serce bagien'],
  ['Jungle of doom', 'Ścieżka łowców', 'Paszcza wulkanu'],
  ['Tower of time', 'Podnóże wieży', 'Szczyt wieży'],
  ['Cytadela Akronix', 'Czaty zwiadowców', 'Tron Axinów'],
] as const;

/** Zapis z przeszłymi pierwszymi `cleared` poziomami gry. */
function saveWith(cleared: number, lang = 'pl') {
  const order: string[] = [];
  for (let world = 1; world <= 6; world++) {
    for (let level = 1; level <= 6; level++) order.push(`w${world}_l${level}`);
  }
  return {
    saveVersion: 4,
    gameVersion: '0.1.0',
    gold: 500,
    heroes: [
      { id: 1, line: 'swordsman', form: 'swordsman_b2', upgrades: 4, runes: [null, null] },
      { id: 2, line: 'archer', form: 'archer_b2', upgrades: 4, runes: [null, null] },
    ],
    nextHeroId: 3,
    runes: [],
    levels: Object.fromEntries(
      order.slice(0, cleared).map((id) => [id, { cleared: true, bestTicks: 400 }]),
    ),
    squad: [1, 2, null, null, null],
    settings: { lang, battleSpeed: 1 },
  };
}

/** Kolor nieba: piksel canvasu sceny z lewego górnego rogu, gdzie nie sięga żadna sylwetka tła. */
async function skyColor(page: Page): Promise<string> {
  return page.locator('#game').evaluate((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) return '';
    const pixel = canvas.getContext('2d')?.getImageData(4, 4, 1, 1).data;
    return pixel === undefined ? '' : `${pixel[0]},${pixel[1]},${pixel[2]}`;
  });
}

test('mapa sześciu światów: strzałki zmieniają tło, szlak i nazwy poziomów', async ({ page }) => {
  const errors = collectErrors(page);
  // Pierwszy świat odbity, w drugim przeszły dwa poziomy.
  await seedSave(page, saveWith(8));
  await play(page);

  const previous = page.getByRole('button', { name: /^Poprzedni świat/ });
  const next = page.getByRole('button', { name: /^Następny świat/ });
  const pips = page.locator('.world-pip');
  const tiles = page.locator('.tile');

  // Mapa otwiera się na świecie, do którego gracz doszedł, na pierwszym nieprzeszłym poziomie.
  await expect(page.locator('.world-name')).toHaveText('Mechanus town');
  await expect(page.locator('.plaque')).toContainText('Hala montażowa');
  await expect(pips).toHaveCount(6);
  await expect(pips.nth(0)).toHaveAttribute('data-state', 'cleared');
  await expect(pips.nth(1)).toHaveAttribute('data-state', 'open');
  await expect(pips.nth(2)).toHaveAttribute('data-state', 'locked');
  await expect(pips.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(pips.nth(1)).toHaveAccessibleName('Świat 2 z 6: Mechanus town (w toku)');

  // W lewo do pierwszego świata: odbity świat otwiera się na swoim bossie, strzałka w lewo gaśnie.
  await previous.click();
  await expect(page.locator('.world-name')).toHaveText('Zamek');
  await expect(page.locator('.plaque')).toContainText('Sala tronowa');
  await expect(previous).toBeDisabled();
  await expect(tiles.locator('.icon-stamp')).toHaveCount(6);

  // W prawo przez wszystkie światy: każdy ma własną nazwę, sześć poziomów i inne tło.
  const skies = new Set<string>();
  for (const [index, [world, first, boss]] of WORLDS.entries()) {
    await expect(page.locator('.world-name')).toHaveText(world);
    await expect(tiles).toHaveCount(6);
    await expect(tiles.first().locator('.tile-name')).toHaveText(first);
    await expect(tiles.last().locator('.tile-name')).toHaveText(boss);
    await expect(pips.nth(index)).toHaveAttribute('aria-pressed', 'true');
    // Tło rysuje canvas: po zmianie świata kolor nieba musi być nowy.
    await expect.poll(async () => skies.has(await skyColor(page))).toBe(false);
    skies.add(await skyColor(page));
    if (index < WORLDS.length - 1) await next.click();
  }
  expect(skies.size).toBe(6);
  await expect(next).toBeDisabled();
  await expect(next).toHaveAccessibleName('Następny świat');

  // Ostatni świat jest zablokowany: widać przeciwników i nagrodę, ale walki nie ma.
  await expect(page.locator('.plaque')).toContainText('Czaty zwiadowców');
  await expect(tiles.first()).toHaveAttribute('data-state', 'locked');
  await expect(page.locator('.unit-tag-enemy .unit-name')).toHaveText([
    'Bowix',
    'Assasinix',
    'Bowix',
  ]);
  const fight = page.getByRole('button', { name: 'Walcz' });
  await expect(fight).toBeDisabled();
  await expect(page.locator('.fight-note')).toHaveText(
    'Zablokowany. Najpierw przejdź „Szczyt wieży”.',
  );
  // Także dalszy zablokowany poziom da się obejrzeć: finał gry z trzema Axinami.
  await tiles.last().click();
  await expect(page.locator('.plaque')).toContainText('Tron Axinów');
  await expect(page.locator('.unit-tag-enemy .unit-name')).toHaveText([
    'Axin 1',
    'Axin 2',
    'Axin 3',
  ]);
  await expect(page.locator('.fight-note')).toHaveText(
    'Zablokowany. Najpierw przejdź „Sala wojenna”.',
  );
  await expect(fight).toBeDisabled();

  // Kieł świata nad mapą prowadzi wprost do niego; poziom w toku da się zacząć.
  await pips.nth(1).click();
  await expect(page.locator('.world-name')).toHaveText('Mechanus town');
  await expect(page.locator('.plaque')).toContainText('Hala montażowa');
  await expect(fight).toBeEnabled();
  await expect(page.locator('.fight-note')).toHaveCount(0);

  // Skład i sklep zostają na tle świata, z którego gracz przyszedł.
  const mechanus = await skyColor(page);
  await page.getByRole('button', { name: 'Skład' }).click();
  await expect(page.locator('.screen.squad')).toBeVisible();
  expect(await skyColor(page)).toBe(mechanus);
  await page.getByRole('button', { name: 'Wróć' }).click();
  await expect(page.locator('.world-name')).toHaveText('Mechanus town');
  expect(errors).toEqual([]);
});

test('walka toczy się na tle swojego świata, a wygrana z bossem otwiera następny świat', async ({
  page,
}) => {
  const errors = collectErrors(page);
  // Pięć poziomów Zamku za graczem; został boss, na którego ten skład wystarcza z zapasem.
  await seedSave(page, saveWith(5));
  await play(page);
  await expect(page.locator('.world-name')).toHaveText('Zamek');
  await expect(page.locator('.plaque')).toContainText('Sala tronowa');
  const castle = await skyColor(page);

  await page.getByRole('button', { name: 'Walcz' }).click();
  await expect(page.locator('.hud-faces-enemy .hud-face')).toHaveCount(3);
  expect(await skyColor(page)).toBe(castle);
  await page.getByRole('button', { name: 'x4' }).click();
  const result = page.locator('.result-sheet');
  await expect(result).toHaveAttribute('data-outcome', 'win', { timeout: 90_000 });
  await result.getByRole('button', { name: 'OK' }).click();

  // Zamek odbity: mapa przechodzi do drugiego świata i jego tła.
  await expect(page.locator('.world-name')).toHaveText('Mechanus town');
  await expect(page.locator('.plaque')).toContainText('Złomowisko');
  await expect(page.locator('.world-pip').nth(0)).toHaveAttribute('data-state', 'cleared');
  await expect(page.locator('.world-pip').nth(1)).toHaveAttribute('data-state', 'open');
  await expect.poll(() => skyColor(page)).not.toBe(castle);
  expect(errors).toEqual([]);
});

test('mapa światów mieści się w scenie w małym oknie i po angielsku', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 760, height: 560 });
  await seedSave(page, saveWith(0, 'en'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.locator('.world-name')).toHaveText('The Castle');

  const stage = await page.locator('#stage').boundingBox();
  if (stage === null) throw new Error('no stage box');
  const next = page.getByRole('button', { name: /^Next world/ });
  for (const world of ['Mechanus town', 'Living swamps', 'Jungle of doom', 'Tower of time']) {
    await next.click();
    await expect(page.locator('.world-name')).toHaveText(world);
    // Każdy kafel i obie strzałki leżą w scenie, także przy innym kształcie szlaku.
    for (const selector of ['.tile', '.world-arrow', '.world-head']) {
      for (const box of await page.locator(selector).evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return { x: rect.left, y: rect.top, right: rect.right, bottom: rect.bottom };
        }),
      )) {
        expect(box.x, `${world} ${selector}`).toBeGreaterThanOrEqual(stage.x);
        expect(box.y, `${world} ${selector}`).toBeGreaterThanOrEqual(stage.y);
        expect(box.right, `${world} ${selector}`).toBeLessThanOrEqual(stage.x + stage.width);
        expect(box.bottom, `${world} ${selector}`).toBeLessThanOrEqual(stage.y + stage.height);
      }
    }
  }
  await next.click();
  await expect(page.locator('.world-name')).toHaveText('Akronix citadel');
  await expect(page.locator('.fight-note')).toHaveText('Locked. Clear "Top of the tower" first.');
  expect(errors).toEqual([]);
});
