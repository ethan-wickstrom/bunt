import { match } from 'ts-pattern';

const ENTITIES = {
  '&': '&',
  '<': '<',
  '>': '>',
  '"': '"',
  "'": '&#39;',
} as const;

type EscapableChar = keyof typeof ENTITIES;

/**
 * A collection of standard helper functions available in all templates.
 */
export const standardHelpers = {
  /** Convert a string to uppercase. */
  upper: (val: unknown) => String(val).toUpperCase(),

  /** Convert a string to lowercase. */
  lower: (val: unknown) => String(val).toLowerCase(),

  /** Capitalize the first letter of a string. */
  capitalize: (val: unknown) => {
    const str = String(val);
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /** Truncate a string to a specified length. */
  truncate: (val: unknown, length: number = 20) => {
    const str = String(val);
    return str.length > length ? `${str.slice(0, length)}...` : str;
  },

  /** Stringify a value to JSON. */
  json: (val: unknown) => JSON.stringify(val),

  /** Format a date using toLocaleDateString. */
  date: (val: unknown, locales?: string | string[], options?: Intl.DateTimeFormatOptions) => {
    const date = val instanceof Date ? val : new Date(String(val));
    return date.toLocaleDateString(locales, options);
  },

  /**
   * Escapes a string for safe insertion into HTML text or attributes.
   * Covers control chars, named entities, and falls back to numeric references.
   */
  escapeHTML: (source: string): string => {
    // Regex: control chars (0x00–0x1F), named chars [&<>"'], and high Unicode (0x7F–0xFFFF)
    // Construct safely to avoid "Unexpected control character" errors
    const ESCAPE_REGEX = new RegExp(`[${String.fromCharCode(0x00)}-${String.fromCharCode(0x1F)}<>"'&\\x7F-\\uFFFF]`, 'g');

    return String(source).replace(ESCAPE_REGEX, (char) =>
      match<EscapableChar | string>(char)
        .with('&',   () => ENTITIES['&'])
        .with('<',   () => ENTITIES['<'])
        .with('>',   () => ENTITIES['>'])
        .with('"',   () => ENTITIES['"'])
        .with("'",   () => ENTITIES["'"])
        .otherwise((c) => `&#${c.codePointAt(0)};`)
    );
  },

  // Alias for compatibility with compiler output
  escapeHtml: (source: string): string => standardHelpers.escapeHTML(source),
};

export type StandardHelpers = typeof standardHelpers;

/** Helper function signatures for type checking */
export type HelperFunction = (...args: unknown[]) => unknown;
