// Tłumaczenie tekstów widocznych dla gracza. Słowniki leżą w src/content/i18n;
// ten moduł zna tylko mechanikę: wyszukanie klucza i podstawienie parametrów.

export type Dictionary = Readonly<Record<string, string>>;
export type MessageParams = Readonly<Record<string, string | number>>;

/** Podstawia `{nazwa}` wartościami z `params`. Nieznane znaczniki zostają bez zmian. */
export function formatMessage(template: string, params?: MessageParams): string {
  if (params === undefined) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/**
 * Tekst dla klucza w słowniku `dict`, a gdy go brakuje, w `fallback`.
 * Brak w obu zwraca sam klucz, żeby błąd był widoczny na ekranie zamiast pustego miejsca.
 */
export function translate(
  dict: Dictionary,
  fallback: Dictionary,
  key: string,
  params?: MessageParams,
): string {
  const template = dict[key] ?? fallback[key] ?? key;
  return formatMessage(template, params);
}
