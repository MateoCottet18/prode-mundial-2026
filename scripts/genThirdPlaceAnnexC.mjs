import fs from "node:fs";

const src = fs.readFileSync("scripts/thirdPlaceAssignments.source.mjs", "utf8");
const winners = src.match(/export const ANNEX_C_WINNERS = (\[[^\]]+\])/)[1];
const rowsBlock = src.match(/export const ANNEX_C_ROWS = \[([\s\S]*?)\];/)[1];
const rows = [...rowsBlock.matchAll(/"([A-Z]{8})"/g)].map((m) => m[1]);

if (rows.length !== 495) {
  throw new Error(`Expected 495 Annex C rows, got ${rows.length}`);
}

const out = `// FIFA World Cup 26 Annex C — third-place assignment lookup (495 combinations).
// Source: FWC2026 regulations + https://github.com/manganite/wm2026
import type { GroupName } from "@/data/matches";

export const ANNEX_C_WINNERS = ${winners} as const;
export type AnnexCWinnerLetter = (typeof ANNEX_C_WINNERS)[number];

export const ANNEX_C_ROWS: readonly string[] = [
${rows.map((r) => `  "${r}",`).join("\n")}
];

const annexCByCombination = new Map<string, string>();
for (const row of ANNEX_C_ROWS) {
  annexCByCombination.set([...row].sort().join(""), row);
}

export function getThirdPlaceOpponentLetter(
  winnerLetter: AnnexCWinnerLetter,
  qualifyingThirdLetters: string[],
): string | null {
  if (qualifyingThirdLetters.length !== 8) return null;
  const key = [...qualifyingThirdLetters].sort().join("");
  const row = annexCByCombination.get(key);
  if (!row) return null;
  const idx = ANNEX_C_WINNERS.indexOf(winnerLetter);
  if (idx === -1) return null;
  return row[idx] ?? null;
}

export function formatThirdPoolPlaceholder(eligibleGroups: GroupName[]): string {
  const letters = eligibleGroups.map((g) => g.replace("Grupo ", "")).join("/");
  return \`3° \${letters}\`;
}
`;

fs.writeFileSync("data/thirdPlaceAnnexC.ts", out, "utf8");
console.log(`Wrote data/thirdPlaceAnnexC.ts (${rows.length} rows)`);
