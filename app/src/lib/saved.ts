// What the browser remembers between page loads. Only small, per-session things:
// a player's id, name and face for a code, and the teacher's key.
// Everything here is useless once the session is deleted after six hours.

import { FACE_COUNT, isFace } from "@open-door/shared";
import { readStored, writeStored } from "./room.svelte";

export interface SavedPlayer {
  id: string;
  name: string;
  face: number;
}

/** A random id of 21 URL-safe characters. */
export function randomId(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  const bytes = new Uint8Array(21);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b & 63]).join("");
}

export function loadPlayer(code: string): SavedPlayer | null {
  try {
    const data = JSON.parse(readStored(`open-door:player:${code}`) ?? "null") as Partial<SavedPlayer> | null;
    if (data && typeof data.id === "string" && typeof data.name === "string" && isFace(data.face)) {
      return { id: data.id, name: data.name, face: data.face };
    }
  } catch {
    /* ignore broken data */
  }
  return null;
}

export function savePlayer(code: string, player: SavedPlayer): void {
  writeStored(`open-door:player:${code}`, JSON.stringify(player));
  writeStored("open-door:name", player.name);
  writeStored("open-door:face", String(player.face));
}

/** Name and face from the last session, to fill in the form. */
export function lastProfile(): { name: string; face: number } {
  const face = Number(readStored("open-door:face"));
  return {
    name: readStored("open-door:name") ?? "",
    face: isFace(face) ? face : Math.floor(Math.random() * FACE_COUNT),
  };
}

export function loadTeacherKey(code: string): string | null {
  return readStored(`open-door:teacher:${code}`);
}

export function saveTeacherKey(code: string, key: string): void {
  writeStored(`open-door:teacher:${code}`, key);
}
