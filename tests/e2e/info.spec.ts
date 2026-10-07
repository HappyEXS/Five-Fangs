// Przyciski „i”: zasady ekranów i wyjaśnienia kart nie stoją na scenie, tylko czekają w okienku
// pod okrągłym przyciskiem. Okienko musi mieścić się w scenie i dawać się zamknąć na trzy sposoby.
import { expect, type Locator, type Page, test } from '@playwright/test';
import { collectErrors, play, seedSave } from './helpers.ts';

const SAVE = {
  saveVersion: 4,
  gameVersion: '0.1.0',
  gold: 500,
  heroes: [
    { id: 1, line: 'archer', form: 'archer_b2', upgrades: 2, runes: [null, null] },
    { id: 2, line: 'swordsman', form: 'swordsman_a', upgrades: 4, runes: [null, null] },
    { id: 3, line: 'swordsman', form: 'pavise_guard', upgrades: 4, runes: [null, null] },
    { id: 4, line: 'beasts', form: 'monstrosity', upgrades: 0, runes: [null, null] },
  ],
  nextHeroId: 5,
  runes: [],
  levels: {},
  squad: [1, 2, 3, null, null],
  settings: { lang: 'pl', battleSpeed: 1 },
};

/** Otwiera okienko przyciskiem i sprawdza, że całe leży w scenie. */
async function openInfo(page: Page, button: Locator): Promise<Locator> {
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  const popup = page.locator('.info-popup');
  await expect(popup).toHaveCount(1);
  const box = await popup.boundingBox();
  const stage = await page.locator('#stage').boundingBox();
  if (box === null || stage === null) throw new Error('no popup or stage box');
  expect(box.x).toBeGreaterThanOrEqual(stage.x);
  expect(box.y).toBeGreaterThanOrEqual(stage.y);
  expect(box.x + box.width).toBeLessThanOrEqual(stage.x + stage.width);
  expect(box.y + box.height).toBeLessThanOrEqual(stage.y + stage.height);
  return popup;
}

test('przyciski „i”: zasady ekranów i kart są w okienkach, nie na scenie', async ({ page }) => {
  const errors = collectErrors(page);
  await seedSave(page, SAVE);
  await play(page);
  const popup = page.locator('.info-popup');

  // Skład: zasady ekranu pod przyciskiem przy tytule.
  await page.getByRole('button', { name: 'Skład' }).click();
  const squad = page.locator('.screen.squad');
  await expect(squad).not.toContainText('Złap bohatera');
  await expect(squad).not.toContainText('Wartości po strzałkach');
  const squadInfo = page.getByRole('button', { name: 'Informacje: Skład' });
  await expect(await openInfo(page, squadInfo)).toContainText(
    'Złap bohatera i przesuń go na inny slot albo na „Poza składem”.',
  );
  await expect(popup.locator('p')).toHaveCount(3);
  await expect(popup).toContainText('Slot 1 to front');

  // Zamknięcie: ten sam przycisk, Escape, kliknięcie gdziekolwiek indziej.
  await squadInfo.click();
  await expect(popup).toHaveCount(0);
  await openInfo(page, squadInfo);
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  await expect(squadInfo).toHaveAttribute('aria-expanded', 'false');
  await openInfo(page, squadInfo);
  await page.locator('.purse').click();
  await expect(popup).toHaveCount(0);

  // Karta bohatera: co znaczą wartości po strzałkach. Okienko przy prawej krawędzi sceny.
  const card = page.locator('.hero-card');
  await expect(card.locator('.hero-name')).toHaveText('Strzelec wyborowy');
  const cardInfo = card.getByRole('button', { name: 'Informacje: Strzelec wyborowy' });
  await expect(await openInfo(page, cardInfo)).toHaveText(
    'Wartości po strzałkach: statystyki po następnym ulepszeniu.',
  );
  // Drugi przycisk zamyka pierwsze okienko i otwiera swoje: naraz jest jedno.
  await squadInfo.click();
  await expect(popup).toHaveCount(1);
  await expect(popup).toContainText('Złap bohatera');
  await expect(cardInfo).toHaveAttribute('aria-expanded', 'false');
  // Wybór innego bohatera zamyka okienko; jego karta ma własne wyjaśnienie.
  await cardInfo.click();
  await expect(popup).toContainText('Wartości po strzałkach');
  await page.locator('.stage-hero[data-hero="2"]').click();
  await expect(popup).toHaveCount(0);
  await expect(card.locator('.hero-name')).toHaveText('Miecznik');
  await expect(await openInfo(page, card.locator('.info-btn'))).toHaveText(
    'Bohater może ewoluować kilkoma drogami. Porównanie znajdziesz po kliknięciu „Ewolucja”.',
  );
  await page.keyboard.press('Escape');
  // Forma końcowa z kompletem ulepszeń nie ma już czego porównywać, więc nie ma przycisku.
  await page.locator('.stage-hero[data-hero="3"]').click();
  await expect(card.locator('.hero-name')).toHaveText('Pawężnik');
  await expect(card.locator('.info-btn')).toHaveCount(0);

  // Otwarte okienko znika razem z ekranem.
  await openInfo(page, squadInfo);
  await page.getByRole('button', { name: 'Wróć' }).click();
  await expect(page.locator('.map')).toBeVisible();
  await expect(popup).toHaveCount(0);

  // Bohaterowie: zasady ulepszeń i ewolucji przy tytule, cena formy bazowej na jej karcie.
  await page.getByRole('button', { name: 'Bohaterowie' }).click();
  const heroes = page.locator('.screen.heroes');
  await expect(heroes).not.toContainText('Każde ulepszenie dodaje');
  const formCard = page.locator('.form-card');
  await expect(formCard.locator('.form-origin')).toHaveText(/^W sklepie\s*200$/);
  await expect(formCard.locator('.info-btn')).toHaveCount(0);
  const heroesInfo = page.getByRole('button', { name: 'Informacje: Bohaterowie' });
  await expect(await openInfo(page, heroesInfo)).toContainText(
    'Każde ulepszenie dodaje 10% życia i ataku formy i kosztuje tyle samo.',
  );
  await expect(popup).toContainText('Po 4 ulepszeniach bohater może ewoluować');
  await expect(popup).toContainText('Ulepszenia i ewolucję kupujesz na ekranie składu.');
  // Wybór formy w drzewie zamyka okienko; karta formy po ewolucji wyjaśnia swoje strzałki.
  await page.locator('.tree-node[data-form="guard_a"]').click();
  await expect(popup).toHaveCount(0);
  await expect(formCard.locator('.form-origin')).toContainText('Miecznik');
  await expect(
    await openInfo(page, formCard.getByRole('button', { name: 'Informacje: Tarczownik' })),
  ).toHaveText('Wartości po strzałkach: ta forma względem formy, z której powstaje.');
  await page.getByRole('button', { name: 'Wróć' }).click();

  // Sklep: jedno okienko zamiast tekstu pod nagłówkiem.
  await page.getByRole('button', { name: 'Sklep' }).click();
  const shop = page.locator('.screen.shop');
  await expect(shop).not.toContainText('Każdy kupiony bohater');
  const shopInfo = page.getByRole('button', { name: 'Informacje: Sklep' });
  await expect(await openInfo(page, shopInfo)).toContainText(
    'Każdy kupiony bohater to osobny egzemplarz z własnymi ulepszeniami i runami.',
  );
  await expect(popup).toContainText('Tego samego bohatera można kupić kilka razy.');
  // Kliknięcie „Kup” przy otwartym okienku zamyka je i kupuje: okienko niczego nie blokuje.
  await page.locator('[data-line="beasts"] [data-action="buy"]').click();
  await expect(popup).toHaveCount(0);
  await expect(page.locator('.purse')).toHaveAttribute('data-gold', '300');
  expect(errors).toEqual([]);
});

test('okienko informacji mieści się w scenie w małym oknie i po angielsku', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 700, height: 620 });
  await seedSave(page, { ...SAVE, settings: { lang: 'en', battleSpeed: 1 } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.locator('.map')).toBeVisible();

  await page.getByRole('button', { name: 'Squad' }).click();
  await expect(
    await openInfo(page, page.getByRole('button', { name: 'Info: Squad' })),
  ).toContainText('Slot 1 is the front');
  await expect(
    await openInfo(page, page.locator('.hero-card').getByRole('button', { name: /^Info:/ })),
  ).toHaveText('Values after the arrows: stats after the next upgrade.');
  await page.getByRole('button', { name: 'Back' }).click();

  await page.getByRole('button', { name: 'Shop' }).click();
  await expect(
    await openInfo(page, page.getByRole('button', { name: 'Info: Shop' })),
  ).toContainText('You can buy the same hero more than once.');
  expect(errors).toEqual([]);
});
