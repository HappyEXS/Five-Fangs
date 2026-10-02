import { describe, expect, it } from 'vitest';
import {
  checkImports,
  checkSimPurity,
  extractImports,
  layerOf,
  stripComments,
} from './module-boundaries.ts';

const messages = (file: string, source: string) => checkImports(file, source).map((v) => v.message);

describe('stripComments', () => {
  it('usuwa komentarze i zachowuje numery linii', () => {
    const out = stripComments("a // import x from './x'\n/* b\n c */ d");
    expect(out.split('\n')).toHaveLength(3);
    expect(out).not.toContain('import');
    expect(out).toContain('d');
  });

  it('nie traktuje // w napisie jako komentarza', () => {
    expect(stripComments("const u = 'http://x'; f()")).toContain('f()');
  });
});

describe('extractImports', () => {
  it('rozpoznaje importy statyczne, typów, efektów ubocznych, reeksporty i dynamiczne', () => {
    const refs = extractImports(
      [
        "import { a } from './a.ts';",
        "import type { B } from './b.ts';",
        "import './c.css';",
        "export { d } from './d.ts';",
        "export type { E } from './e.ts';",
        "const f = await import('./f.ts');",
        'const g = await import(name);',
      ].join('\n'),
    );
    expect(refs).toEqual([
      { specifier: './a.ts', typeOnly: false, line: 1 },
      { specifier: './b.ts', typeOnly: true, line: 2 },
      { specifier: './c.css', typeOnly: false, line: 3 },
      { specifier: './d.ts', typeOnly: false, line: 4 },
      { specifier: './e.ts', typeOnly: true, line: 5 },
      { specifier: './f.ts', typeOnly: false, line: 6 },
      { specifier: '', typeOnly: false, line: 7 },
    ]);
  });

  it('obsługuje import wieloliniowy i pomija zakomentowany', () => {
    const refs = extractImports(
      "// import x from './no.ts';\nimport {\n  a,\n  b,\n} from './yes.ts';",
    );
    expect(refs).toEqual([{ specifier: './yes.ts', typeOnly: false, line: 2 }]);
  });

  it('nie myli import.meta z importem', () => {
    expect(extractImports('if (import.meta.env.DEV) {}')).toEqual([]);
  });
});

describe('layerOf', () => {
  it('przypisuje warstwy', () => {
    expect(layerOf('src/sim/tick.ts')).toBe('sim');
    expect(layerOf('src/assets/generated/heroes.webp')).toBe('assets');
    expect(layerOf('src/main.ts')).toBe('entry');
    expect(layerOf('src/tools.ts')).toBe('toolsEntry');
    expect(layerOf('scripts/balance.ts')).toBeNull();
    expect(layerOf('src/unknown/x.ts')).toBeNull();
  });
});

describe('checkImports', () => {
  it('pozwala na dozwolone kierunki', () => {
    expect(messages('src/sim/tick.ts', "import { hash } from '../core/hash.ts';")).toEqual([]);
    expect(messages('src/sim/tick.ts', "import { x } from './state.ts';")).toEqual([]);
    expect(messages('src/render/rig.ts', "import type { S } from '../sim/state.ts';")).toEqual([]);
    expect(messages('src/ui/Menu.tsx', "import { scene } from '../game/scene.ts';")).toEqual([]);
    expect(messages('src/game/app.ts', "import { r } from '../render/renderer.ts';")).toEqual([]);
  });

  it('odrzuca sim → render', () => {
    expect(messages('src/sim/tick.ts', "import { draw } from '../render/draw.ts';")).toEqual([
      'warstwa "sim" nie może importować z "render": "../render/draw.ts"',
    ]);
  });

  it('odrzuca core → cokolwiek', () => {
    expect(messages('src/core/pool.ts', "import { x } from '../sim/state.ts';")).toHaveLength(1);
  });

  it('content może importować z sim tylko typy', () => {
    expect(messages('src/content/compile.ts', "import type { U } from '../sim/types.ts';")).toEqual(
      [],
    );
    expect(messages('src/content/compile.ts', "import { U } from '../sim/types.ts';")).toEqual([
      'warstwa "content" nie może importować z "sim" (dozwolony tylko `import type`): "../sim/types.ts"',
    ]);
  });

  it('odrzuca logikę gry sięgającą do ui i narzędzi', () => {
    expect(messages('src/game/app.ts', "import { M } from '../ui/Menu.tsx';")).toHaveLength(1);
    expect(messages('src/main.ts', "import { t } from './tools/sandbox.ts';")).toHaveLength(1);
    expect(messages('src/ui/Hud.tsx', "import { s } from '../sim/state.ts';")).toHaveLength(1);
  });

  it('narzędzia mogą wszystko', () => {
    expect(messages('src/tools/sandbox.ts', "import { M } from '../ui/Menu.tsx';")).toEqual([]);
    expect(messages('src/tools.ts', "import { s } from './tools/sandbox.ts';")).toEqual([]);
    expect(messages('src/tools/sandbox.ts', 'await import(path);')).toEqual([]);
  });

  it('pilnuje pakietów zewnętrznych', () => {
    expect(messages('src/sim/tick.ts', "import { z } from 'zod';")).toEqual([
      'warstwa "sim" nie może importować pakietu "zod"',
    ]);
    expect(messages('src/content/schema.ts', "import { z } from 'zod';")).toEqual([]);
    expect(messages('src/ui/App.tsx', "import { useState } from 'preact/hooks';")).toEqual([]);
    expect(messages('src/game/state.ts', "import { signal } from '@preact/signals';")).toEqual([]);
    expect(messages('src/core/rng.ts', "import fs from 'node:fs';")).toHaveLength(1);
  });

  it('testy mogą używać vitest i modułów Node, ale nie łamać warstw', () => {
    expect(messages('src/sim/tick.test.ts', "import { it } from 'vitest';")).toEqual([]);
    expect(messages('src/sim/tick.test.ts', "import { readFileSync } from 'node:fs';")).toEqual([]);
    expect(messages('src/sim/tick.test.ts', "import { d } from '../content/x.ts';")).toHaveLength(
      1,
    );
  });

  it('odrzuca dynamiczny import bez literału i import spoza src', () => {
    expect(messages('src/game/load.ts', 'await import(path);')).toHaveLength(1);
    expect(messages('src/game/load.ts', "import x from '../../scripts/x.ts';")).toHaveLength(1);
  });

  it('nie sprawdza plików spoza src', () => {
    expect(messages('scripts/balance.ts', "import { x } from '../src/ui/x.ts';")).toEqual([]);
  });
});

describe('checkSimPurity', () => {
  const found = (source: string) => checkSimPurity('src/sim/tick.ts', source).map((v) => v.message);

  it('odrzuca losowość, zegar, funkcje przestępne i floaty', () => {
    expect(found('const r = Math.random();')).toHaveLength(1);
    expect(found('const t = Date.now();')).toHaveLength(1);
    expect(found('const t = performance.now();')).toHaveLength(1);
    expect(found('const d = Math.sqrt(x);')).toHaveLength(1);
    expect(found('const p = x ** 2;')).toHaveLength(1);
    expect(found('const a = new Float32Array(4);')).toHaveLength(1);
  });

  it('przepuszcza dozwolone operacje', () => {
    expect(
      found('const a = Math.imul(x, 3) + Math.floor(y / 2) + Math.abs(z) + Math.min(a, b);'),
    ).toEqual([]);
  });

  it('ignoruje komentarze i pliki spoza sim', () => {
    expect(found('// Math.random() jest zakazane')).toEqual([]);
    expect(checkSimPurity('src/render/fx.ts', 'Math.random()')).toEqual([]);
  });
});
