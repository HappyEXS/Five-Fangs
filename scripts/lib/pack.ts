// Pakowanie prostokątów w atlas metodą półek: od najwyższych, wierszami o stałej szerokości.

export interface PackItem {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

export interface Placement {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Packing {
  readonly width: number;
  readonly height: number;
  readonly placements: readonly Placement[];
}

/**
 * Układa elementy w atlasie o podanej szerokości. `padding` to przezroczysty odstęp wokół
 * każdego elementu, żeby wygładzanie przy rysowaniu nie zaciągało sąsiadów.
 * Kolejność jest deterministyczna: wysokość malejąco, potem nazwa.
 */
export function packShelves(
  items: readonly PackItem[],
  atlasWidth: number,
  padding: number,
): Packing {
  const sorted = [...items].sort(
    (a, b) => b.height - a.height || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );
  const placements: Placement[] = [];
  let x = padding;
  let y = padding;
  let shelfHeight = 0;
  for (const item of sorted) {
    if (item.width + 2 * padding > atlasWidth) {
      throw new Error(`Sprite "${item.name}" is wider than the atlas`);
    }
    if (x + item.width + padding > atlasWidth) {
      x = padding;
      y += shelfHeight + padding;
      shelfHeight = 0;
    }
    placements.push({ name: item.name, x, y, width: item.width, height: item.height });
    x += item.width + padding;
    shelfHeight = Math.max(shelfHeight, item.height);
  }
  return { width: atlasWidth, height: y + shelfHeight + padding, placements };
}
