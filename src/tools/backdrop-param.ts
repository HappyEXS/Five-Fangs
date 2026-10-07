// Tło sceny w narzędziach dev: parametr adresu `backdrop=<id>` wybiera jedno z teł światów,
// żeby piaskownicę i pomiar wydajności dało się obejrzeć na każdym z nich.
import { BACKDROP_IDS, type BackdropId } from '../content/schema-progression.ts';

/** Tło z parametru `backdrop` albo null, gdy parametru nie ma lub nie jest znanym tłem. */
export function backdropFromQuery(query: URLSearchParams): BackdropId | null {
  const value = query.get('backdrop');
  return BACKDROP_IDS.find((id) => id === value) ?? null;
}
