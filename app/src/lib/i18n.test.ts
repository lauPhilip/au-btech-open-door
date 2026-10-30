import { describe, expect, it } from "vitest";
import { da } from "./messages.da";
import { en } from "./messages.en";
import { translate } from "./i18n";

describe("interface text", () => {
  it("has the same keys in English and Danish", () => {
    expect(Object.keys(da).sort()).toEqual(Object.keys(en).sort());
  });

  it("uses the same {values} in both languages", () => {
    const names = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(en) as Array<keyof typeof en>) expect(names(da[key]), key).toEqual(names(en[key]));
  });

  it("has no empty text", () => {
    for (const text of [...Object.values(en), ...Object.values(da)]) expect(text.trim().length).toBeGreaterThan(0);
  });

  it("fills in values and picks the plural form", () => {
    expect(translate("en", "team.text", { max: 5 })).toBe("Sit with the people next to you. Up to 5 at each table.");
    expect(translate("en", "warn.tables", { count: 1 })).toBe("1 table is not done yet.");
    expect(translate("en", "warn.tables", { count: 3 })).toBe("3 tables are not done yet.");
    expect(translate("da", "warn.tables", { count: 2 })).toBe("2 borde er ikke færdige endnu.");
  });

  it("falls back to English text, then to the key", () => {
    expect(translate("da", "join.title")).toBe("Deltag i din klasse");
    expect(translate("en", "nothing.here" as never)).toBe("nothing.here");
  });
});
