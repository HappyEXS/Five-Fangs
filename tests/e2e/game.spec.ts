// Testy end-to-end pętli gry na buildzie produkcyjnym (M4-11): gra startuje, walka dochodzi
// do końca, postęp się zapisuje, a konsola przeglądarki nie zawiera błędów.
import { expect, test } from '@playwright/test';
import { collectErrors, paintedPortraits, play, readSave, SAVE_KEY, seedSave } from './helpers.ts';

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

  // Ekranem głównym jest mapa pierwszego świata z wybranym pierwszym poziomem; składu nie da
  // się tu zmienić. Kolejne poziomy są zablokowane.
  await expect(page.locator('.world-name')).toHaveText('Zamek');
  await expect(page.locator('[data-level="w1_l1"]')).toHaveAttribute('data-state', 'open');
  await expect(page.locator('[data-level="w1_l2"]')).toHaveAttribute('data-state', 'locked');
  await expect(page.locator('.plaque')).toContainText('Podgrodzie');
  // Pierwszy poziom gry: dwóch Łuczników, drugi o poziom siły mocniejszy.
  await expect(page.locator('.unit-tag-enemy .unit-name')).toHaveText(['Łucznik', 'Łucznik']);
  await expect(page.locator('.unit-tag-enemy .unit-level')).toHaveText(['+1']);
  // Pod bohaterami gracza podpisy jak pod przeciwnikami, bez oznaczenia przy zerze ulepszeń.
  await expect(page.locator('.unit-tag-hero')).toHaveCount(2);
  await expect(page.locator('.unit-tag-hero', { hasText: 'Miecznik' })).toHaveCount(1);
  await expect(page.locator('.unit-tag-hero .unit-level')).toHaveCount(0);
  await expect(page.locator('.hero-chip')).toHaveCount(0);

  await page.getByRole('button', { name: 'Walcz' }).click();
  // W dolnych rogach miniaturki żywych postaci: dwóch bohaterów z lewej, przeciwnicy z prawej.
  const allies = page.locator('.hud-faces-player .hud-face');
  const foes = page.locator('.hud-faces-enemy .hud-face');
  await expect(allies).toHaveCount(2);
  await expect(foes).toHaveCount(2);
  await expect(foes.first()).toHaveAttribute('data-unit', 'archer_a');
  await expect(page.locator('.hud-face[data-alive="true"]')).toHaveCount(4);
  await expect.poll(() => paintedPortraits(page, '.hud-face .portrait-face')).toBe(4);
  await page.getByRole('button', { name: 'x4' }).click();
  // Pokonani przeciwnicy tracą miniaturki, zanim brama zamknie pole walki.
  await expect
    .poll(() => page.locator('.hud-faces-enemy .hud-face[data-alive="false"]').count(), {
      intervals: [100],
      timeout: 90_000,
    })
    .toBe(2);
  const result = page.locator('.result-sheet');
  await expect(result).toHaveAttribute('data-outcome', 'win', { timeout: 90_000 });
  await expect(result).toContainText('Zwycięstwo');
  await expect(result.locator('.rewards')).toContainText('+200 złota');
  // Po walce jest tylko informacja o nagrodach i jeden przycisk.
  await expect(result.getByRole('button')).toHaveCount(1);

  const save = await readSave(page);
  expect(save.gold).toBe(200);
  expect(save.levels).toMatchObject({ w1_l1: { cleared: true } });

  // OK wraca na mapę, która wybiera następny poziom.
  await result.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('.plaque')).toContainText('Most zwodzony');
  await expect(page.locator('.purse')).toHaveAttribute('data-gold', '200');

  // Po przeładowaniu strony postęp zostaje.
  await page.reload();
  await page.getByRole('button', { name: 'Graj' }).click();
  await expect(page.locator('.purse')).toHaveAttribute('data-gold', '200');
  await expect(page.locator('[data-level="w1_l1"]')).toHaveClass(/tile-cleared/);
  await expect(page.locator('[data-level="w1_l2"]')).toHaveAttribute('data-state', 'open');
  await expect(page.locator('[data-level="w1_l3"]')).toHaveAttribute('data-state', 'locked');
  await expect(page.locator('.plaque')).toContainText('Most zwodzony');

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
  // Jedyny przycisk karty to „i” z wyjaśnieniem; niczego się w niej nie kupuje.
  await expect(sheet.locator('button:not(.info-btn)')).toHaveCount(0);
  await expect(sheet.locator('.info-btn')).toHaveCount(1);
  await expect(field.locator('.upgrade-bar')).toHaveAttribute('data-upgrades', '0');
  await field.getByRole('button', { name: 'Kup ulepszenie za 50 złota' }).click();
  await expect(field.locator('.upgrade-bar')).toHaveAttribute('data-upgrades', '1');
  await expect(sheet).toContainText('Ulepszenia 1 z 4');
  await expect(page.locator('.purse')).toHaveAttribute('data-gold', '550');
  // Każde ulepszenie formy kosztuje tyle samo: drugie jest za tę samą kwotę co pierwsze.
  await expect(field.getByRole('button', { name: 'Kup ulepszenie za 50 złota' })).toBeVisible();

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
  await expect(info.locator('.tree-cost').first()).toContainText('400');
  await expect(info.locator('.line-tabs button')).toHaveText([
    'Miecznicy',
    'Łucznicy',
    'Beasts',
    'Immortals',
    'Plants',
    'Robots',
    // Szczep wrogów: zakładka informacyjna, bez kupowania (akronix.spec.ts).
    'Akronix',
  ]);
  // Tarczownik i Strażnik to dziś ewolucje Miecznika, Akolita i Kapłan ewolucje Łucznika.
  await expect(info).toContainText('Tarczownik');
  await expect(info).toContainText('Strażnik');
  await info.getByRole('button', { name: 'Łucznicy' }).click();
  await expect(info).toContainText('Akolita');
  await expect(info).toContainText('Kapłan');
  await expect(info.locator('[data-action="buy"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Wróć' }).click();

  // Sklep: nowy typ bohatera i drugi egzemplarz posiadanego.
  await page.getByRole('button', { name: 'Sklep' }).click();
  await page.locator('[data-line="beasts"] [data-action="buy"]').click();
  await page.locator('[data-line="swordsman"] [data-action="buy"]').click();
  await expect(page.locator('.purse')).toHaveAttribute('data-gold', '150');
  await expect(page.locator('[data-line="swordsman"]')).toContainText('Masz: 2');
  await expect(page.locator('[data-line="plants"] [data-action="buy"]')).toBeDisabled();
  let save = await readSave(page);
  expect(save.squad).toEqual([1, 2, 3, 4, null]);

  // Skład: Monstrosity (id 3) złapana na scenie i przeniesiona na front; zamienia się miejscami
  // z Miecznikiem.
  await page.getByRole('button', { name: 'Wróć' }).click();
  await page.getByRole('button', { name: 'Skład' }).click();
  await page.locator('.stage-hero[data-hero="3"]').dragTo(page.locator('[data-drop="slot:0"]'));
  await expect(page.locator('[data-drop="slot:0"] .field-name')).toHaveText('Monstrosity');
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
  await expect.poll(() => paintedPortraits(page, '.evolve-option .portrait-face')).toBe(2);
  await expect(picker).toContainText('Zbrojny');
  await expect(picker).toContainText('Tarczownik');
  await picker
    .getByRole('button', { name: 'Kup ewolucję w formę Tarczownik za 400 złota' })
    .click();
  await expect(picker).toHaveCount(0);
  await expect(page.locator('[data-drop="slot:0"] .field-name')).toHaveText('Tarczownik');
  const heroes = (await readSave(page)).heroes as { form: unknown; upgrades: unknown }[];
  expect(heroes[0]).toMatchObject({ form: 'guard_a', upgrades: 0 });

  // Bohaterowie: drzewo linii, wybrana forma na karcie i jej droga na scenie.
  await page.getByRole('button', { name: 'Wróć' }).click();
  await page.getByRole('button', { name: 'Bohaterowie' }).click();
  const tree = page.locator('.tree');
  // Szczep Mieczników: forma bazowa, dwie pierwsze ewolucje i cztery formy końcowe.
  await expect(tree.locator('.tree-node')).toHaveCount(7);
  await expect(tree.locator('.tree-node')).toContainText([
    'Miecznik',
    'Zbrojny',
    'Tarczownik',
    'Rycerz',
    'Berserker',
    'Strażnik',
    'Pawężnik',
  ]);
  await tree.getByRole('button', { name: 'Pawężnik' }).click();
  await expect(page.locator('.form-card')).toContainText('Ewolucja 2. stopnia');
  await expect(page.locator('.form-card')).toContainText('Ostatni stopień tej drogi');
  // Koszty zależą od stopnia formy: ewolucja na trzeci stopień i cztery równe ulepszenia.
  await expect(page.locator('.form-card .form-origin')).toContainText('1 600');
  await expect(page.locator('.form-card .form-upgrades')).toHaveText(/Ulepszenia\s*4 ×\s*800/);
  await expect(page.locator('.form-card')).toContainText('Tarcza: otrzymuje o 35% mniej obrażeń');
  await expect(page.locator('.path-name')).toHaveText(['Miecznik', 'Tarczownik', 'Pawężnik']);
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
  await expect(chip.locator('.chip-name')).toHaveText('Strzelec');
  await expect(chip.locator('.chip-level')).toHaveText('+3');
  await expect.poll(() => paintedPortraits(page, '.hero-chip .portrait-face')).toBe(1);
  // Karta wybranego bohatera też zaczyna się od jego miniaturki.
  await expect(page.locator('.hero-card .hero-name')).toHaveText('Miecznik');
  await expect.poll(() => paintedPortraits(page, '.hero-card .portrait-face')).toBe(1);
  const reserveHeight = async () => (await page.locator('.reserve').boundingBox())?.height ?? 0;
  const withHero = await reserveHeight();
  // Miniaturkę łapie się jak postać: upuszczona na slocie wchodzi do składu.
  await chip.dragTo(page.locator('[data-drop="slot:1"]'));
  await expect(page.locator('[data-drop="slot:1"] .field-name')).toHaveText('Strzelec +3');
  await expect(page.locator('.hero-chip')).toHaveCount(0);
  expect((await readSave(page)).squad).toEqual([1, 2, null, null, null]);
  // Pusty pasek „Poza składem” ma tę samą wysokość co z bohaterem: nic nie skacze.
  await expect(page.locator('.reserve')).toContainText('Wszyscy bohaterowie są w składzie.');
  expect(withHero).toBeGreaterThan(0);
  expect(await reserveHeight()).toBeCloseTo(withHero, 1);

  // Bohaterowie: każda forma w drzewie i karta wybranej formy mają miniaturkę.
  await page.getByRole('button', { name: 'Wróć' }).click();
  await page.getByRole('button', { name: 'Bohaterowie' }).click();
  await expect(page.locator('.tree-node')).toHaveCount(7);
  await expect.poll(() => paintedPortraits(page, '.tree-node .portrait-face')).toBe(7);
  await expect.poll(() => paintedPortraits(page, '.form-card .portrait-face')).toBe(1);
  expect(errors).toEqual([]);
});

test('szczep Beasts: zakup w sklepie, drzewo siedmiu form i walka Ignitixa', async ({ page }) => {
  const errors = collectErrors(page);
  await seedSave(page, {
    saveVersion: 3,
    gameVersion: '0.1.0',
    gold: 500,
    heroes: [
      { id: 1, line: 'beasts', form: 'ignitix', upgrades: 0, runes: [null, null] },
      { id: 2, line: 'beasts', form: 'tuskovator', upgrades: 0, runes: [null, null] },
    ],
    nextHeroId: 3,
    runes: [],
    levels: { w1_l1: { cleared: true, bestTicks: 420 } },
    squad: [2, 1, null, null, null],
    settings: { lang: 'pl', battleSpeed: 4 },
  });
  await play(page);

  // Sklep sprzedaje formę bazową szczepu.
  await page.getByRole('button', { name: 'Sklep' }).click();
  await page.locator('[data-line="beasts"] [data-action="buy"]').click();
  await expect(page.locator('[data-line="beasts"]')).toContainText('Masz: 3');
  await expect(page.locator('.purse')).toHaveAttribute('data-gold', '300');
  await page.getByRole('button', { name: 'Wróć' }).click();

  // Bohaterowie: drzewo o czterech formach końcowych z miniaturką przy każdej formie.
  await page.getByRole('button', { name: 'Bohaterowie' }).click();
  await page.locator('.line-tabs').getByRole('button', { name: 'Beasts' }).click();
  await expect(page.locator('.form-card .hero-form')).toContainText('Beasts');
  const tree = page.locator('.tree');
  await expect(tree.locator('.tree-node')).toHaveCount(7);
  await expect.poll(() => paintedPortraits(page, '.tree-node .portrait-face')).toBe(7);
  await tree.getByRole('button', { name: 'Ignitix' }).click();
  await expect(page.locator('.path-name')).toHaveText(['Monstrosity', 'Reaper', 'Ignitix']);
  await expect(page.locator('.form-card')).toContainText(
    'Strzela z miejsca w wroga stojącego najdalej',
  );
  // Drzewo kończy się nad głowami postaci stojących na scenie: nie zasłania najwyższej z nich.
  const sheet = await page.locator('.tree-sheet').boundingBox();
  const stage = await page.locator('#stage').boundingBox();
  if (sheet === null || stage === null) throw new Error('layout not measured');
  expect((sheet.y + sheet.height - stage.y) / stage.height).toBeLessThan(0.5);
  await page.getByRole('button', { name: 'Wróć' }).click();

  // Walka na poziomie 2 (miecznik z przodu, łucznik z tyłu): Ignitix zaczyna od łucznika.
  await page.locator('[data-level="w1_l2"]').click();
  await page.getByRole('button', { name: 'Walcz' }).click();
  const foes = page.locator('.hud-faces-enemy .hud-face');
  await expect(foes).toHaveCount(2);
  let fallen: string[] = [];
  await expect
    .poll(
      async () => {
        fallen = await page
          .locator('.hud-faces-enemy .hud-face[data-alive="false"]')
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-unit') ?? ''));
        return fallen.length;
      },
      { intervals: [50], timeout: 60_000 },
    )
    .toBeGreaterThan(0);
  expect(fallen).toEqual(['archer_a']);
  const result = page.locator('.result-sheet');
  await expect(result).toHaveAttribute('data-outcome', 'win', { timeout: 90_000 });
  expect(errors).toEqual([]);
});

test('szczepy Immortals, Plants i Robots: sklep sześciu szczepów, drzewa i walka', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await seedSave(page, {
    saveVersion: 3,
    gameVersion: '0.1.0',
    gold: 700,
    heroes: [
      { id: 1, line: 'robots', form: 'whirl_bot', upgrades: 0, runes: [null, null] },
      { id: 2, line: 'plants', form: 'ivy', upgrades: 0, runes: [null, null] },
      { id: 3, line: 'immortals', form: 'cardinal', upgrades: 0, runes: [null, null] },
    ],
    nextHeroId: 4,
    runes: [],
    levels: { w1_l1: { cleared: true, bestTicks: 420 } },
    squad: [1, 3, 2, null, null],
    settings: { lang: 'pl', battleSpeed: 4 },
  });
  await play(page);

  // Sklep: sześć metek w jednym rzędzie, żadna nie nachodzi na sąsiednią ani nie wychodzi
  // poza scenę.
  await page.getByRole('button', { name: 'Sklep' }).click();
  const tags = page.locator('.shop-tag');
  await expect(tags).toHaveCount(6);
  await expect(tags.locator('.tag-name')).toHaveText([
    'Miecznik',
    'Łucznik',
    'Monstrosity',
    'Orb',
    'Bush',
    'Bot',
  ]);
  const stage = await page.locator('#stage').boundingBox();
  if (stage === null) throw new Error('stage not measured');
  const boxes = await tags.evaluateAll((nodes) =>
    nodes.map((node) => {
      const tag = node.getBoundingClientRect();
      const button = node.querySelector('button')?.getBoundingClientRect();
      return { left: tag.left, right: tag.right, buttonWidth: button?.width ?? 0 };
    }),
  );
  boxes.forEach((box, index) => {
    expect(box.left).toBeGreaterThanOrEqual(stage.x);
    expect(box.right).toBeLessThanOrEqual(stage.x + stage.width);
    // Przycisk zakupu mieści się w metce.
    expect(box.buttonWidth).toBeLessThanOrEqual(box.right - box.left);
    const next = boxes[index + 1];
    if (next !== undefined) expect(box.right).toBeLessThanOrEqual(next.left);
  });
  for (const line of ['immortals', 'plants', 'robots']) {
    await page.locator(`[data-line="${line}"] [data-action="buy"]`).click();
  }
  await expect(page.locator('.purse')).toHaveAttribute('data-gold', '100');
  await page.getByRole('button', { name: 'Wróć' }).click();

  // Bohaterowie: drzewa trzech szczepów z miniaturką przy każdej formie.
  await page.getByRole('button', { name: 'Bohaterowie' }).click();
  const tree = page.locator('.tree');
  const tab = (name: string) => page.locator('.line-tabs').getByRole('button', { name });

  await tab('Immortals').click();
  await expect(tree.locator('.tree-node')).toHaveCount(7);
  await expect.poll(() => paintedPortraits(page, '.tree-node .portrait-face')).toBe(7);
  await tree.getByRole('button', { name: 'Xartix' }).click();
  await expect(page.locator('.path-name')).toHaveText(['Orb', 'Guardian of hell', 'Xartix']);
  await expect(page.locator('.form-card')).toContainText('Co 2. atak zadaje podwójne obrażenia');
  await tree.getByRole('button', { name: 'Enigmatix' }).click();
  await expect(page.locator('.form-card')).toContainText('Tarcza: otrzymuje o 50% mniej obrażeń');

  await tab('Plants').click();
  await expect(tree.locator('.tree-node')).toHaveCount(7);
  await expect.poll(() => paintedPortraits(page, '.tree-node .portrait-face')).toBe(7);
  await tree.getByRole('button', { name: 'Mother-tree' }).click();
  await expect(page.locator('.path-name')).toHaveText(['Bush', 'Trunk', 'Mother-tree']);
  await expect(page.locator('.form-card')).toContainText(
    'Nie atakuje. Co 2 s przyzywa sojusznika (życie 100, atak 20); najwyżej 5 naraz.',
  );
  await tree.getByRole('button', { name: 'Ice Ivy' }).click();
  await expect(page.locator('.form-card')).toContainText('Co 1 s leczy całą drużynę o 25');
  await tree.getByRole('button', { name: 'Toxic Ivy' }).click();
  await expect(page.locator('.form-card')).toContainText('Pociski przebijają wszystkich wrogów');

  await tab('Robots').click();
  await expect(tree.locator('.tree-node')).toHaveCount(7);
  await expect.poll(() => paintedPortraits(page, '.tree-node .portrait-face')).toBe(7);
  await tree.getByRole('button', { name: 'Whirl-bot' }).click();
  await expect(page.locator('.path-name')).toHaveText(['Bot', 'Holo-bot', 'Whirl-bot']);
  await expect(page.locator('.form-card')).toContainText('Unika 70 na 100 ataków');
  await page.getByRole('button', { name: 'Wróć' }).click();

  // Walka: Whirl-bot z przodu, za nim Cardinal i Ivy, która strzela ze swojego slotu; dwa wolne
  // sloty zajęli kupieni przed chwilą Orb i Bush.
  expect((await readSave(page)).squad).toEqual([1, 3, 2, 4, 5]);
  await page.locator('[data-level="w1_l2"]').click();
  await page.getByRole('button', { name: 'Walcz' }).click();
  await expect(page.locator('.hud-faces-player .hud-face')).toHaveCount(5);
  await expect.poll(() => paintedPortraits(page, '.hud-faces-player .portrait-face')).toBe(5);
  const result = page.locator('.result-sheet');
  await expect(result).toHaveAttribute('data-outcome', 'win', { timeout: 90_000 });
  expect(errors).toEqual([]);
});

test('Mother-tree wygrywa walkę samymi przyzwanymi krzakami', async ({ page }) => {
  const errors = collectErrors(page);
  await seedSave(page, {
    saveVersion: 3,
    gameVersion: '0.1.0',
    gold: 0,
    heroes: [{ id: 1, line: 'plants', form: 'mother_tree', upgrades: 0, runes: [null, null] }],
    nextHeroId: 2,
    runes: [],
    levels: {},
    squad: [1, null, null, null, null],
    settings: { lang: 'pl', battleSpeed: 4 },
  });
  await play(page);
  await page.getByRole('button', { name: 'Walcz' }).click();
  // Krzaki nie mają twarzy w HUD-zie: po stronie gracza jest tylko Mother-tree.
  const faces = page.locator('.hud-faces-player .hud-face');
  await expect(faces).toHaveCount(1);
  // Sama nie atakuje, więc cała wygrana to dzieło przyzwanych.
  const result = page.locator('.result-sheet');
  await expect(result).toHaveAttribute('data-outcome', 'win', { timeout: 90_000 });
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
  await expect(page.locator('[data-drop="slot:1"] .field-name')).toHaveText('Strzelec +1');
  expect(errors).toEqual([]);
});

test('zapis w wersji 3 z dawnymi liniami ludzi wczytuje się do dwóch szczepów', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await seedSave(page, {
    saveVersion: 3,
    gameVersion: '0.1.0',
    // Złota wystarcza na ewolucję na trzeci stopień (1600).
    gold: 2000,
    heroes: [
      // Dawna linia Tarczowników, kopia formy z testowego drzewa i dawna linia Akolitów.
      { id: 1, line: 'guard', form: 'guard_b', upgrades: 2, runes: [null, null] },
      { id: 2, line: 'swordsman', form: 'swordsman_c2', upgrades: 1, runes: [null, null] },
      { id: 3, line: 'cleric', form: 'cleric_a', upgrades: 4, runes: [null, null] },
      { id: 4, line: 'cleric', form: 'cleric_c', upgrades: 3, runes: [null, null] },
    ],
    nextHeroId: 5,
    runes: [],
    levels: { w1_l1: { cleared: true, bestTicks: 412 } },
    squad: [1, 2, 3, 4, null],
    settings: { lang: 'pl', battleSpeed: 1 },
  });
  await play(page);
  await expect(page.locator('.purse')).toHaveAttribute('data-gold', '2000');
  await page.getByRole('button', { name: 'Skład' }).click();
  // Nikt nie przepadł i nikt nie stracił ulepszeń.
  await expect(page.locator('.stage-hero')).toHaveCount(4);
  await expect(page.locator('[data-drop="slot:0"] .field-name')).toHaveText('Strażnik +2');
  await expect(page.locator('[data-drop="slot:1"] .field-name')).toHaveText('Strażnik +1');
  await expect(page.locator('[data-drop="slot:2"] .field-name')).toHaveText('Akolita +4');
  await expect(page.locator('[data-drop="slot:3"] .field-name')).toHaveText('Strzelec +3');
  // Akolita z kompletem ulepszeń może ewoluować w obie formy końcowe swojej drogi.
  await page
    .locator('[data-drop="slot:2"]')
    .getByRole('button', { name: 'Wybierz drogę ewolucji' })
    .click();
  const picker = page.locator('.evolve-picker');
  await expect(picker.locator('.evolve-option')).toHaveCount(2);
  await expect(picker).toContainText('Kapłan');
  await expect(picker).toContainText('Inkwizytor');
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
