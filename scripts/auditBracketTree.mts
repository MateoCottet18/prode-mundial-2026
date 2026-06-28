#!/usr/bin/env npx tsx
/**
 * Auditoría del árbol completo: feeds FIFA vs app.
 * npx tsx scripts/auditBracketTree.mts
 */
import { matches as staticMatches } from "../data/matches";
import {
  FIFA_CUARTOS_FEEDS,
  FIFA_FINAL_FEEDS,
  FIFA_OCTAVOS_FEEDS,
  FIFA_SEMIFINAL_FEEDS,
} from "../data/knockoutBracketTree";
import { KNOCKOUT_FIFA_MATCH_NUMBER } from "../data/knockoutKickoff";
import { buildBracket } from "../lib/bracket/buildBracket";
import { getKnockoutMatches } from "../lib/standings";

const ko = getKnockoutMatches({}, staticMatches, {}, {});
const bracket = buildBracket({}, staticMatches, {}, {});

type FeedCheck = {
  round: string;
  destId: string;
  fifa: number;
  homeFeed: string;
  awayFeed: string;
  appHome: string;
  appAway: string;
  ok: boolean;
};

function checkFeeds(
  round: string,
  feeds: readonly [string, string][],
  matches: { id: string; homeTeam: string; awayTeam: string }[],
  fifaStart: number,
): FeedCheck[] {
  return feeds.map(([homeFeed, awayFeed], i) => {
    const destId = `${round}-${i + 1}`;
    const m = matches[i];
    const expectedHome = `Ganador ${homeFeed}`;
    const expectedAway = `Ganador ${awayFeed}`;
    return {
      round,
      destId,
      fifa: fifaStart + i,
      homeFeed,
      awayFeed,
      appHome: m.homeTeam,
      appAway: m.awayTeam,
      ok: m.homeTeam === expectedHome && m.awayTeam === expectedAway,
    };
  });
}

const rows: FeedCheck[] = [
  ...checkFeeds("octavos", FIFA_OCTAVOS_FEEDS, ko.octavos, 89),
  ...checkFeeds("cuartos", FIFA_CUARTOS_FEEDS, ko.cuartos, 97),
  ...checkFeeds("semifinal", FIFA_SEMIFINAL_FEEDS, ko.semifinal, 101),
  ...checkFeeds("final", FIFA_FINAL_FEEDS, ko.final, 104),
];

console.log("\n══════════════════════════════════════════════════════════════");
console.log("ÁRBOL COMPLETO — Ronda origen | Winner | Va a | FIFA | App actual");
console.log("══════════════════════════════════════════════════════════════\n");

console.log(
  "| Ronda destino | FIFA | Feed home | Feed away | App home | App away | OK |",
);
console.log("| --- | --- | --- | --- | --- | --- | --- |");
for (const r of rows) {
  console.log(
    `| ${r.destId} | M${r.fifa} | ${r.homeFeed} | ${r.awayFeed} | ${r.appHome} | ${r.appAway} | ${r.ok ? "✓" : "✗"} |`,
  );
}

console.log("\n--- Avance por partido 16avos (winner → octavos) ---\n");
for (let i = 0; i < FIFA_OCTAVOS_FEEDS.length; i++) {
  const [a, b] = FIFA_OCTAVOS_FEEDS[i];
  const dest = `octavos-${i + 1}`;
  console.log(`W(${a}) + W(${b}) → ${dest} (M${89 + i})`);
}

console.log("\n--- Rutas Brasil / Argentina / México / Sudáfrica ---\n");

function pathFor16avos(id: string): string[] {
  const chain = [id];
  const octIdx = FIFA_OCTAVOS_FEEDS.findIndex(([a, b]) => a === id || b === id);
  if (octIdx === -1) return chain;
  const octId = `octavos-${octIdx + 1}`;
  chain.push(octId);
  const cuartIdx = FIFA_CUARTOS_FEEDS.findIndex(([a, b]) => a === octId || b === octId);
  if (cuartIdx === -1) return chain;
  const cuartId = `cuartos-${cuartIdx + 1}`;
  chain.push(cuartId);
  const semiIdx = FIFA_SEMIFINAL_FEEDS.findIndex(([a, b]) => a === cuartId || b === cuartId);
  if (semiIdx === -1) return chain;
  chain.push(`semifinal-${semiIdx + 1}`);
  chain.push("final-1");
  return chain;
}

for (const id of ["16avos-3", "16avos-5", "16avos-7", "16avos-13"]) {
  const m = ko["16avos"].find((x) => x.id === id)!;
  const fifa = KNOCKOUT_FIFA_MATCH_NUMBER[id];
  console.log(`${m.homeTeam} vs ${m.awayTeam} (${id}, M${fifa})`);
  console.log(`  Ruta: ${pathFor16avos(id).join(" → ")}`);
}

const brazilPath = pathFor16avos("16avos-5");
const argPath = pathFor16avos("16avos-13");
const sameSemi =
  brazilPath.includes("semifinal-2") && argPath.includes("semifinal-2");
console.log(
  `\nBrasil y Argentina en la misma semifinal (M102): ${sameSemi ? "✓ SÍ" : "✗ NO"}`,
);
console.log(`  Brasil:   ${brazilPath.join(" → ")}`);
console.log(`  Argentina: ${argPath.join(" → ")}`);

console.log("\n--- Layout visual buildBracket ---\n");
console.log("LEFT r32:", bracket.left.r32.map((m) => m.id).join(", "));
console.log("RIGHT r32:", bracket.right.r32.map((m) => m.id).join(", "));
console.log("LEFT oct:", bracket.left.octavos.map((m) => m.id).join(", "));
console.log("RIGHT oct:", bracket.right.octavos.map((m) => m.id).join(", "));
console.log("LEFT semi:", bracket.left.semifinal.id);
console.log("RIGHT semi:", bracket.right.semifinal.id);

const allOk = rows.every((r) => r.ok);
console.log(
  `\n${allOk && sameSemi ? "✓ ÁRBOL FIFA VALIDADO" : "✗ HAY ERRORES EN EL ÁRBOL"}\n`,
);
