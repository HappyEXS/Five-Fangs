// Wspólne kroki testów end-to-end: zapis w przeglądarce, start gry, błędy konsoli.
import { expect, type Page } from '@playwright/test';

export const SAVE_KEY = 'five-fangs.save';

/** Zbiera błędy konsoli i nieobsłużone wyjątki strony. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  return errors;
}

export async function readSave(page: Page): Promise<Record<string, unknown>> {
  const text = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  expect(text).not.toBeNull();
  return JSON.parse(text ?? '{}') as Record<string, unknown>;
}

/** Wstawia zapis przed startem gry, o ile przeglądarka nie ma jeszcze żadnego. */
export async function seedSave(page: Page, save: unknown): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    [SAVE_KEY, JSON.stringify(save)] as const,
  );
}

/** Otwiera grę i przechodzi z ekranu startowego na mapę. */
export async function play(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Graj' }).click();
  await expect(page.locator('.map')).toBeVisible();
}

/** Liczba miniaturek pod selektorem (canvasy `.portrait-face`), na których coś narysowano. */
export async function paintedPortraits(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluateAll(
    (nodes) =>
      nodes.filter((node) => {
        if (!(node instanceof HTMLCanvasElement)) return false;
        const pixels = node.getContext('2d')?.getImageData(0, 0, node.width, node.height).data;
        return pixels?.some((value, index) => index % 4 === 3 && value > 0) ?? false;
      }).length,
  );
}
