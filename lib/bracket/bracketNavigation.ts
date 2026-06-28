import type { Match } from "@/data/matches";
import {
  BRACKET_LEFT_CUARTOS_IDS,
  BRACKET_LEFT_OCTAVOS_IDS,
  BRACKET_LEFT_R32_IDS,
  BRACKET_RIGHT_CUARTOS_IDS,
  BRACKET_RIGHT_OCTAVOS_IDS,
  BRACKET_RIGHT_R32_IDS,
  FIFA_CUARTOS_FEEDS,
  FIFA_FINAL_FEEDS,
  FIFA_OCTAVOS_FEEDS,
  FIFA_SEMIFINAL_FEEDS,
} from "@/data/knockoutBracketTree";
import type { BracketLayout } from "@/types/bracket";

export type KnockoutRoundTab = "16avos" | "octavos" | "cuartos" | "semis" | "final";

export const KNOCKOUT_ROUND_TABS: { id: KnockoutRoundTab; label: string }[] = [
  { id: "16avos", label: "16avos" },
  { id: "octavos", label: "Octavos" },
  { id: "cuartos", label: "Cuartos" },
  { id: "semis", label: "Semis" },
  { id: "final", label: "Final" },
];

const LEFT_BRANCH_IDS = new Set<string>([
  ...BRACKET_LEFT_R32_IDS,
  ...BRACKET_LEFT_OCTAVOS_IDS,
  ...BRACKET_LEFT_CUARTOS_IDS,
  "semifinal-1",
]);

const RIGHT_BRANCH_IDS = new Set<string>([
  ...BRACKET_RIGHT_R32_IDS,
  ...BRACKET_RIGHT_OCTAVOS_IDS,
  ...BRACKET_RIGHT_CUARTOS_IDS,
  "semifinal-2",
]);

type FeedConfig = {
  feeds: readonly [string, string][];
  targetPrefix: string;
};

const FEED_ROUNDS: FeedConfig[] = [
  { feeds: FIFA_OCTAVOS_FEEDS, targetPrefix: "octavos" },
  { feeds: FIFA_CUARTOS_FEEDS, targetPrefix: "cuartos" },
  { feeds: FIFA_SEMIFINAL_FEEDS, targetPrefix: "semifinal" },
  { feeds: FIFA_FINAL_FEEDS, targetPrefix: "final" },
];

const { feedersByTarget, advanceBySource } = buildFeedMaps();

function buildFeedMaps() {
  const feedersByTarget: Record<string, [string, string]> = {};
  const advanceBySource: Record<string, string> = {};

  for (const { feeds, targetPrefix } of FEED_ROUNDS) {
    feeds.forEach(([homeFeed, awayFeed], index) => {
      const targetId = `${targetPrefix}-${index + 1}`;
      feedersByTarget[targetId] = [homeFeed, awayFeed];
      advanceBySource[homeFeed] = targetId;
      advanceBySource[awayFeed] = targetId;
    });
  }

  return { feedersByTarget, advanceBySource };
}

function sortByMatchNumber(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const numA = Number.parseInt(a.id.split("-").pop() ?? "0", 10);
    const numB = Number.parseInt(b.id.split("-").pop() ?? "0", 10);
    return numA - numB;
  });
}

export function getMatchesForRound(
  bracket: BracketLayout,
  round: KnockoutRoundTab,
): Match[] {
  switch (round) {
    case "16avos":
      return sortByMatchNumber([...bracket.left.r32, ...bracket.right.r32]);
    case "octavos":
      return sortByMatchNumber([...bracket.left.octavos, ...bracket.right.octavos]);
    case "cuartos":
      return sortByMatchNumber([...bracket.left.cuartos, ...bracket.right.cuartos]);
    case "semis":
      return [bracket.left.semifinal, bracket.right.semifinal];
    case "final":
      return [bracket.final, bracket.tercerPuesto];
    default:
      return [];
  }
}

export function getBracketBranch(
  matchId: string,
): "left" | "right" | "center" | null {
  if (matchId === "final" || matchId === "tercer-puesto") return "center";
  if (LEFT_BRANCH_IDS.has(matchId)) return "left";
  if (RIGHT_BRANCH_IDS.has(matchId)) return "right";
  return null;
}

export function getBranchLabel(branch: ReturnType<typeof getBracketBranch>): string | null {
  switch (branch) {
    case "left":
      return "Rama izquierda";
    case "right":
      return "Rama derecha";
    case "center":
      return "Centro";
    default:
      return null;
  }
}

export function formatWinnerFeedLabel(matchId: string): string {
  return `Ganador ${matchId}`;
}

export function getMatchFeeders(matchId: string): [string, string] | null {
  if (matchId === "tercer-puesto") {
    return ["semifinal-1", "semifinal-2"];
  }
  return feedersByTarget[matchId] ?? null;
}

export function getFeedLabels(matchId: string): string[] {
  const feeders = getMatchFeeders(matchId);
  if (!feeders) return [];

  if (matchId === "tercer-puesto") {
    return ["Perdedor semifinal-1", "Perdedor semifinal-2"];
  }

  return feeders.map(formatWinnerFeedLabel);
}

export function getAdvanceTargetId(matchId: string): string | null {
  return advanceBySource[matchId] ?? null;
}

const STAGE_LABELS: Record<string, string> = {
  octavos: "Octavos",
  cuartos: "Cuartos",
  semifinal: "Semifinal",
  final: "Final",
};

export function formatAdvanceTargetLabel(targetId: string): string {
  if (targetId === "final") return "Final";
  if (targetId === "tercer-puesto") return "3er puesto";

  const dash = targetId.lastIndexOf("-");
  if (dash === -1) return targetId;

  const prefix = targetId.slice(0, dash);
  const num = targetId.slice(dash + 1);
  const stage = STAGE_LABELS[prefix] ?? prefix;
  return `${stage}-${num}`;
}

export function getAdvanceHint(matchId: string): string | null {
  const targetId = getAdvanceTargetId(matchId);
  if (!targetId) return null;
  return `El ganador avanza a ${formatAdvanceTargetLabel(targetId)}`;
}
