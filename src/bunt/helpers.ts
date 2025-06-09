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

  /** Escape HTML special characters. */
  escapeHtml: (val: unknown) => {
    return String(val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },
};

export type StandardHelpers = typeof standardHelpers;
