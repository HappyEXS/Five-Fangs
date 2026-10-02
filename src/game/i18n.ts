// Bieżący język gry i funkcja tłumacząca dla UI.
import { signal } from '@preact/signals';
import {
  dictionaries,
  type Language,
  type MessageKey,
  SOURCE_LANGUAGE,
} from '../content/i18n/index.ts';
import { type MessageParams, translate } from '../core/i18n.ts';

export const language = signal<Language>(SOURCE_LANGUAGE);

/** Tekst dla klucza w bieżącym języku. Odczyt w komponencie subskrybuje go na zmianę języka. */
export function t(key: MessageKey, params?: MessageParams): string {
  return translate(dictionaries[language.value], dictionaries[SOURCE_LANGUAGE], key, params);
}
