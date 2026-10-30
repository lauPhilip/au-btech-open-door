// Interface text in more than one language. English is the default; the choice is remembered on this device.

import { da } from "./messages.da";
import { en, type MessageKey } from "./messages.en";

export type Locale = "en" | "da";
export const LOCALES: ReadonlyArray<{ id: Locale; name: string }> = [
  { id: "en", name: "English" },
  { id: "da", name: "Dansk" },
];

const catalogues: Record<Locale, Record<MessageKey, string>> = { en, da };

export type Vars = Record<string, string | number>;

/** A key as callers write it: the plural forms _one and _other share the key without the ending. */
export type Key = MessageKey extends infer K ? (K extends `${infer B}_one` | `${infer B}_other` ? B : K) : never;

/** The text for a key. A "count" value picks the _one or _other form, and {name} is replaced by a value. */
export function translate(locale: Locale, key: Key, vars: Vars = {}): string {
  const find = (c: Record<string, string>) => {
    if (typeof vars.count === "number") {
      const form = c[`${key}_${vars.count === 1 ? "one" : "other"}`];
      if (form !== undefined) return form;
    }
    return c[key];
  };
  const text = find(catalogues[locale]) ?? find(en) ?? key;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "da";
}
