import type { GroupName } from "@/data/matches";

export type QualifierSlot =
  | { type: "position"; group: GroupName; position: 1 | 2 }
  | { type: "third"; index: number };

export const officialRoundOf32Slots: [QualifierSlot, QualifierSlot][] = [
  [{ type: "position", group: "Grupo A", position: 1 }, { type: "position", group: "Grupo B", position: 2 }],
  [{ type: "position", group: "Grupo C", position: 1 }, { type: "third", index: 1 }],
  [{ type: "position", group: "Grupo E", position: 1 }, { type: "position", group: "Grupo F", position: 2 }],
  [{ type: "position", group: "Grupo G", position: 1 }, { type: "third", index: 2 }],
  [{ type: "position", group: "Grupo B", position: 1 }, { type: "position", group: "Grupo A", position: 2 }],
  [{ type: "position", group: "Grupo D", position: 1 }, { type: "third", index: 3 }],
  [{ type: "position", group: "Grupo F", position: 1 }, { type: "position", group: "Grupo E", position: 2 }],
  [{ type: "position", group: "Grupo H", position: 1 }, { type: "third", index: 4 }],
  [{ type: "position", group: "Grupo I", position: 1 }, { type: "position", group: "Grupo J", position: 2 }],
  [{ type: "position", group: "Grupo K", position: 1 }, { type: "third", index: 5 }],
  [{ type: "position", group: "Grupo J", position: 1 }, { type: "position", group: "Grupo I", position: 2 }],
  [{ type: "position", group: "Grupo L", position: 1 }, { type: "third", index: 6 }],
  [{ type: "position", group: "Grupo C", position: 2 }, { type: "third", index: 7 }],
  [{ type: "position", group: "Grupo D", position: 2 }, { type: "position", group: "Grupo G", position: 2 }],
  [{ type: "position", group: "Grupo H", position: 2 }, { type: "third", index: 8 }],
  [{ type: "position", group: "Grupo K", position: 2 }, { type: "position", group: "Grupo L", position: 2 }],
];

export const officialKnockoutStages = [
  "16avos",
  "Octavos",
  "Cuartos",
  "Semifinal",
  "Final",
] as const;
