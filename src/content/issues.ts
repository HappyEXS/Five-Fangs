// Wspólny format problemu zgłaszanego przez walidatory treści.

export interface ContentIssue {
  /** Plik albo zbiór danych, którego dotyczy problem. */
  source: string;
  message: string;
}
