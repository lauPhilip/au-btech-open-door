// Faces players can pick. A face is a number; the app draws it from skin tone,
// hair style and hair colour, so the set is varied without showing stereotypes.

export const SKIN_TONES = ["#F6D7C3", "#E6B796", "#C68B62", "#8D5A3B", "#5C3A26"] as const;
export const HAIR_COLORS = ["#2B211C", "#6B4226", "#C99A5B", "#8A8F98"] as const;
/** short, long, bun, curls, cap */
export const HAIR_STYLES = ["short", "long", "bun", "curls", "cap"] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

/** How many faces there are to choose from. */
export const FACE_COUNT = 15;

export interface FaceLook {
  skin: string;
  hair: string;
  style: HairStyle;
}

export function isFace(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < FACE_COUNT;
}

/** The look of face number n. Every tone and every style appears, in a mixed order. */
export function faceLook(n: number): FaceLook {
  const i = ((Math.floor(n) % FACE_COUNT) + FACE_COUNT) % FACE_COUNT;
  return {
    skin: SKIN_TONES[i % SKIN_TONES.length]!,
    style: HAIR_STYLES[(i * 2 + Math.floor(i / 5)) % HAIR_STYLES.length]!,
    hair: HAIR_COLORS[(i + Math.floor(i / 4)) % HAIR_COLORS.length]!,
  };
}
