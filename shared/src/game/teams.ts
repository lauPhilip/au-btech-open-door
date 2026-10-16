// The five team tables. Each team is named after a door colour (concept book board 09).

export type TeamId = "blue" | "green" | "yellow" | "lilac" | "red";

export interface Team {
  id: TeamId;
  name: string;
  /** Fill colour for the team's table and markers. */
  color: string;
  /** Darker shade for text and outlines on the fill colour. */
  ink: string;
}

export const TEAMS: readonly Team[] = [
  { id: "blue", name: "Blue door", color: "#2E5BDB", ink: "#1E40A8" },
  { id: "green", name: "Green door", color: "#2F9E6E", ink: "#1E6B4E" },
  { id: "yellow", name: "Yellow door", color: "#F2C230", ink: "#7A5C00" },
  { id: "lilac", name: "Lilac door", color: "#8C6AD9", ink: "#5B3FA8" },
  { id: "red", name: "Red door", color: "#E8573F", ink: "#B93A25" },
];

/** Most players at one team table. */
export const TEAM_MAX = 5;

export function isTeamId(value: unknown): value is TeamId {
  return TEAMS.some((t) => t.id === value);
}

export function teamById(id: TeamId): Team {
  const team = TEAMS.find((t) => t.id === id);
  if (!team) throw new Error(`Unknown team ${id}`);
  return team;
}
