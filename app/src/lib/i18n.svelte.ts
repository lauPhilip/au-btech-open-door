import { readStored, writeStored } from "./room.svelte";
import { isLocale, translate, type Key, type Locale, type Vars } from "./i18n";

const STORED = "open-door:language";

function initial(): Locale {
  const saved = readStored(STORED);
  return isLocale(saved) ? saved : "en";
}

class I18n {
  locale = $state<Locale>(initial());

  constructor() {
    document.documentElement.lang = this.locale;
  }

  set(locale: Locale): void {
    this.locale = locale;
    writeStored(STORED, locale);
    document.documentElement.lang = locale;
  }
}

export const i18n = new I18n();

/** The interface text for a key in the chosen language. Reads the language, so screens update when it changes. */
export function t(key: Key, vars?: Vars): string {
  return translate(i18n.locale, key, vars);
}
