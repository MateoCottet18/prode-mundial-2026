import type { Match } from "@/data/matches";

export function bracketStageLabel(matchId: string, stage: Match["stage"]) {
  if (matchId === "tercer-puesto") return "3er puesto";
  switch (stage) {
    case "16avos":
      return "16avos de final";
    case "octavos":
      return "Octavos de final";
    case "cuartos":
      return "Cuartos de final";
    case "semifinal":
      return "Semifinal";
    case "final":
      return "Final";
    default:
      return stage;
  }
}

/** Etiqueta corta para cards compactas del bracket. */
export function bracketStageShortLabel(matchId: string, stage: Match["stage"]) {
  if (matchId === "tercer-puesto") return "3er puesto";
  switch (stage) {
    case "16avos":
      return "16avos";
    case "octavos":
      return "Octavos";
    case "cuartos":
      return "Cuartos";
    case "semifinal":
      return "Semi";
    case "final":
      return "Final";
    default:
      return stage;
  }
}
