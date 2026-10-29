import { describe, expect, it } from "vitest";
import { INTERACT_RANGE, roomAt, scenarios, spots, spotsNear, startRoom } from "./index";

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

  describe("spots", () => {
    const all = spots(scenario);

    it("places every person and thing inside its own room", () => {
      expect(all).toHaveLength(scenario.people.length + scenario.things.length);
      for (const spot of all) expect(roomAt(scenario, spot.x, spot.y)?.id, spot.id).toBe(spot.room);
    });

    it("keeps spots far enough apart to tell them apart, and their names readable", () => {
      for (const [i, a] of all.entries()) {
        for (const b of all.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} / ${b.id}`).toBeGreaterThan(56);
      }
    });

    it("keeps each name label inside the map", () => {
      for (const spot of all) {
        expect(spot.x).toBeGreaterThanOrEqual(40);
        expect(spot.x).toBeLessThanOrEqual(scenario.map.width - 40);
      }
    });

    it("finds what is within reach, nearest first", () => {
      const printer = all.find((s) => s.id === "label-printer")!;
      const near = spotsNear(scenario, printer.x + 10, printer.y);
      expect(near[0]?.id).toBe("label-printer");
      expect(spotsNear(scenario, printer.x, printer.y, 1).map((s) => s.id)).toEqual(["label-printer"]);
      expect(spotsNear(scenario, -500, -500)).toEqual([]);
      expect(INTERACT_RANGE).toBeGreaterThan(40);
    });
  });
});
