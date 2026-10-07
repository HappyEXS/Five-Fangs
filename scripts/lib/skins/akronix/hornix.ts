// Hornix, wojownik: jeździec na rogatej bestii (szkic autora: postać siedząca na czworonogu
// z rogami i otwartą paszczą). Na szkielecie humanoid bestia jest częścią tułowia: jej korpus,
// ogon i łeb pochylają się razem z nim, więc klip ciosu rogami (`gore`) wygląda jak szarża.
// Nogi rigu to nogi bestii; jeździec ma własne ręce i głowę.
import { intersect, union } from '../../raster.ts';
import { BONE, MAW, type Palette, type PartCanvas, partCanvas, RAG_HARD } from '../kit.ts';
import { fleshShin, fleshThigh } from '../limbs.ts';
import { bandHead, wrapFore, wrapUpper } from './body.ts';
import { BAND, CLOTH, EMBER, HIDE, LEATHER, SKIN } from './palette.ts';
import { barbedLance } from './weapons.ts';

const BEAST: Palette = { ...HIDE, accent: BAND.main, glow: EMBER };

function mountedTorso(): PartCanvas {
  const c = partCanvas(-28, -30, 35, 10, 106);
  // Peleryna jeźdźca i ogon bestii z tyłu.
  c.form(
    c.poly([
      [2.6, -22.4],
      [-3.4, -22.8],
      [-10.6, -11.4],
      [-8.6, -13.4],
      [-7, -10.6],
      [-4.6, -13],
    ]),
    CLOTH,
    { rag: 0.7 },
  );
  c.form(
    union(
      c.arc([-13, -6], [-23.6, -13.4], [-24.4, -2.4], 2.4, 1),
      c.horn(-24.4, -2.4, -25, 4.4, 2.2, 0.4),
    ),
    HIDE,
    { rag: 0.6 },
  );

  // Korpus: ciężka beczka na wysokości bioder, z grubym karkiem wysuniętym do przodu.
  const body = union(c.oval(0, -3.4, 15, 8), c.horn(9, -6, 20.4, -10.6, 6.6, 4.8));
  const hide = c.form(body, HIDE, { rag: 0.6 });
  c.patches(hide, HIDE.light, 0.16, 3, 0.6);
  c.fill(intersect(hide, c.oval(1, 2.4, 11, 3.4)), HIDE.light, 0.35);
  for (const x of [-9.4, -5, 8.4]) {
    c.fill(
      intersect(hide, c.arc([x, -11], [x - 2, -4], [x + 0.8, 3.4], 0.32, 0.32)),
      HIDE.dark,
      0.55,
    );
  }
  // Kolce na karku.
  for (const [x, y] of [
    [10.4, -12.4],
    [13.6, -13.8],
    [16.6, -14.8],
  ] as const) {
    c.ink(c.horn(x, y + 1.4, x - 1.2, y - 2, 1, 0.15), BONE, HIDE.dark);
  }

  // Łeb: żuchwa z zębami, dwa rogi do przodu i w górę, żarzące się oko.
  c.form(
    c.poly([
      [18, -8.8],
      [30, -7],
      [28.4, -4.2],
      [17.6, -5],
    ]),
    HIDE,
    { rag: RAG_HARD },
  );
  c.fill(
    c.poly([
      [19.4, -9.4],
      [29, -9.6],
      [28.4, -7.6],
      [19.6, -7.2],
    ]),
    MAW,
  );
  for (const x of [21.4, 23.8, 26.2]) {
    c.ink(c.horn(x, -10.4, x + 0.3, -7.8, 0.7, 0.12), BONE, HIDE.dark);
  }
  const skull = c.form(c.oval(23.4, -12.6, 6.2, 4.2), HIDE, { rag: 0.4 });
  c.patches(skull, HIDE.light, 0.18, 2.2, 0.6);
  c.ink(c.arc([21, -15.8], [22.4, -25.4], [31, -26.4], 2, 0.25), BONE, HIDE.dark);
  c.ink(c.arc([25.4, -15.4], [28.4, -20.6], [32.6, -18.6], 1.6, 0.2), BONE, HIDE.dark);
  c.eye(25, -12.8, 1.4, BEAST, 0.3);

  // Czaprak w barwach szczepu, na nim jeździec; jego noga zwisa po boku bestii.
  const blanket = c.form(
    c.poly([
      [-7.4, -12.4],
      [6.4, -12.4],
      [7.4, -2],
      [4, -3.6],
      [0.8, -1],
      [-2.6, -3.4],
      [-6.4, -1.6],
    ]),
    BAND,
    { rag: 0.5, shadow: 0.6 },
  );
  c.patches(blanket, BAND.shade, 0.25, 2, 0.8);
  const rider = c.form(c.horn(0, -20.4, -0.6, -11.4, 4.3, 3.7), CLOTH, { rag: 0.4, rim: 0.35 });
  c.fill(intersect(rider, c.line(-4.6, -19.4, 4, -12, 0.5)), LEATHER.main);
  c.form(c.horn(0.8, -11, 4, -2.4, 2.5, 2), CLOTH, { rag: 0.35 });
  c.form(union(c.box(4.2, -1.2, 2, 2.4, 0.6), c.oval(6, 1.2, 3.4, 1.7)), LEATHER, {
    rag: RAG_HARD,
  });
  return c.finish();
}

export function hornixParts(): Record<string, PartCanvas> {
  return {
    thigh: fleshThigh(BEAST, 1.3),
    shin: fleshShin(BEAST, 'hoof', 1.25),
    torso: mountedTorso(),
    upper: wrapUpper(CLOTH),
    fore: wrapFore(CLOTH, SKIN, 1, LEATHER),
    head: bandHead({ hair: 'spikes', band: true, mouth: 'shout', salt: 116 }),
    weapon: barbedLance(),
  };
}
