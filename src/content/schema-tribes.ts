// Schemat szczepów wrogów: grup jednostek specjalnych, których gracz nie zdobywa (np. Akronix).
// Szczep wrogów nie ma ewolucji, cen ani ulepszeń; treść podaje tylko, kto do niego należy.
import { z } from 'zod';

const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'id: małe litery, cyfry i podkreślenia');

export const enemyTribeSchema = z.strictObject({
  id,
  /**
   * Stopnie szczepu od najsłabszego do najsilniejszego; w stopniu jednostki też stoją w kolejności
   * siły. `rank` to id stopnia (tekst `rank.<id>` w słownikach), `units` to id jednostek
   * z units/enemies.json.
   */
  ranks: z
    .array(
      z.strictObject({
        rank: id,
        units: z.array(id).min(1),
      }),
    )
    .min(1),
});

export const enemyTribesSchema = z.array(enemyTribeSchema);

export type RawEnemyTribe = z.infer<typeof enemyTribeSchema>;
