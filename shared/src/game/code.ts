// Session codes: four characters that are easy to read aloud and type on a phone.

/** Letters and digits without look-alikes (no I, L, O, 0, 1). */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 4;

const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

/** Make a new code. `random` returns numbers in [0, 1), like Math.random. */
export function makeCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)] ?? "A";
  }
  return code;
}

/** Upper-case, drop spaces and dashes; returns null if it is not a valid code. */
export function normaliseCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/[\s-]/g, "");
  return CODE_PATTERN.test(code) ? code : null;
}

export function isCode(value: unknown): value is string {
  return typeof value === "string" && CODE_PATTERN.test(value);
}
