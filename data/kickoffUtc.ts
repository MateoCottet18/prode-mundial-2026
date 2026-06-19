/**
 * Kickoff oficial FIFA World Cup 2026 — fase de grupos (72 partidos).
 * Fuente: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures
 *
 * Horarios en UTC tal como publica FIFA. NO calcular desde EDT/sede/ciudad.
 */
export const FIFA_GROUP_KICKOFF_UTC: Record<string, string> = {
  "a-1": "2026-06-11T19:00:00Z",
  "a-2": "2026-06-12T02:00:00Z",
  "a-3": "2026-06-18T16:00:00Z",
  "a-4": "2026-06-19T01:00:00Z",
  "a-5": "2026-06-25T01:00:00Z",
  "a-6": "2026-06-25T01:00:00Z",
  "b-1": "2026-06-12T19:00:00Z",
  "b-2": "2026-06-13T19:00:00Z",
  "b-3": "2026-06-18T19:00:00Z",
  "b-4": "2026-06-18T22:00:00Z",
  "b-5": "2026-06-24T19:00:00Z",
  "b-6": "2026-06-24T19:00:00Z",
  "c-1": "2026-06-13T22:00:00Z",
  "c-2": "2026-06-14T01:00:00Z",
  "c-3": "2026-06-19T22:00:00Z",
  "c-4": "2026-06-20T00:30:00Z",
  "c-5": "2026-06-24T22:00:00Z",
  "c-6": "2026-06-24T22:00:00Z",
  "d-1": "2026-06-13T01:00:00Z",
  "d-2": "2026-06-14T04:00:00Z",
  "d-3": "2026-06-19T19:00:00Z",
  "d-4": "2026-06-20T03:00:00Z",
  "d-5": "2026-06-26T02:00:00Z",
  "d-6": "2026-06-26T02:00:00Z",
  "e-1": "2026-06-14T17:00:00Z",
  "e-2": "2026-06-14T23:00:00Z",
  "e-3": "2026-06-20T20:00:00Z",
  "e-4": "2026-06-21T00:00:00Z",
  "e-5": "2026-06-25T20:00:00Z",
  "e-6": "2026-06-25T20:00:00Z",
  "f-1": "2026-06-14T20:00:00Z",
  "f-2": "2026-06-15T02:00:00Z",
  "f-3": "2026-06-20T17:00:00Z",
  "f-4": "2026-06-21T04:00:00Z",
  "f-5": "2026-06-25T23:00:00Z",
  "f-6": "2026-06-25T23:00:00Z",
  "g-1": "2026-06-16T01:00:00Z",
  "g-2": "2026-06-15T19:00:00Z",
  "g-3": "2026-06-21T19:00:00Z",
  "g-4": "2026-06-22T01:00:00Z",
  "g-5": "2026-06-27T03:00:00Z",
  "g-6": "2026-06-27T03:00:00Z",
  "h-1": "2026-06-15T16:00:00Z",
  "h-2": "2026-06-15T22:00:00Z",
  "h-3": "2026-06-21T16:00:00Z",
  "h-4": "2026-06-21T22:00:00Z",
  "h-5": "2026-06-27T00:00:00Z",
  "h-6": "2026-06-27T00:00:00Z",
  "i-1": "2026-06-16T19:00:00Z",
  "i-2": "2026-06-16T22:00:00Z",
  "i-3": "2026-06-22T21:00:00Z",
  "i-4": "2026-06-23T00:00:00Z",
  "i-5": "2026-06-26T19:00:00Z",
  "i-6": "2026-06-26T19:00:00Z",
  "j-1": "2026-06-17T01:00:00Z",
  "j-2": "2026-06-17T04:00:00Z",
  "j-3": "2026-06-22T17:00:00Z",
  "j-4": "2026-06-23T03:00:00Z",
  "j-5": "2026-06-28T02:00:00Z",
  "j-6": "2026-06-28T02:00:00Z",
  "k-1": "2026-06-17T17:00:00Z",
  "k-2": "2026-06-18T02:00:00Z",
  "k-3": "2026-06-23T17:00:00Z",
  "k-4": "2026-06-24T02:00:00Z",
  "k-5": "2026-06-27T23:30:00Z",
  "k-6": "2026-06-27T23:30:00Z",
  "l-1": "2026-06-17T20:00:00Z",
  "l-2": "2026-06-17T23:00:00Z",
  "l-3": "2026-06-23T20:00:00Z",
  "l-4": "2026-06-23T23:00:00Z",
  "l-5": "2026-06-27T21:00:00Z",
  "l-6": "2026-06-27T21:00:00Z",
};

export const ARGENTINA_TZ = "America/Argentina/Buenos_Aires";

export function formatKickoffArgentinaFromUtc(kickoffUtc: string): string {
  const instant = new Date(kickoffUtc);
  if (Number.isNaN(instant.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TZ,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
}

export function formatKickoffArgentinaDisplay(kickoffUtc: string): string {
  const instant = new Date(kickoffUtc);
  if (Number.isNaN(instant.getTime())) return "";
  const date = new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(instant);
  const time = formatKickoffArgentinaFromUtc(kickoffUtc);
  return `${date} ${time} (Argentina)`;
}
