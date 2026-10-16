import { describe, expect, it } from "vitest";
import { roomAt, startRoom, scenarios } from "./index";

const scenario = scenarios["nordknit-black-friday"]!;

describe("the generated Nordknit scenario", () => {
  it("is loaded with rooms, people and threats", () => {
    expect(scenario.map.rooms.length).toBeGreaterThan(0);
    expect(scenario.people.length).toBeGreaterThan(0);
    expect(scenario.threats.length).toBeGreaterThan(0);
  });

  it("has a start room", () => {
    expect(startRoom(scenario).id).toBeTruthy();
  });

  it("finds the room at a point inside it, and none outside the map", () => {
    const room = scenario.map.rooms[0]!;
    const [x, y, w, h] = room.rect;
    expect(roomAt(scenario, x + w / 2, y + h / 2)?.id).toBe(room.id);
    expect(roomAt(scenario, -10, -10)).toBeNull();
  });
});
