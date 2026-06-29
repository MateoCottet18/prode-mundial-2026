import type { PaymentStatus, ScoreInput } from "@/lib/prode";

export type ProfileRow = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: "participant" | "admin";
  payment_status: PaymentStatus;
  created_at: string;
};

export type PredictionRow = {
  id?: string;
  user_id: string;
  match_id: string;
  home_goals: number;
  away_goals: number;
  points: number;
  created_at?: string;
  updated_at?: string;
};

export type ResultRow = {
  match_id: string;
  home_goals: number;
  away_goals: number;
  winner_team?: string | null;
  decided_by?: "regular" | "penalties" | null;
  status: "pending" | "finished";
  updated_at?: string;
};

export type PaymentRow = {
  id?: string;
  user_id: string;
  payer_name?: string | null;
  /** Legacy: el flujo nuevo NO sube archivo. Mantengo los campos opcionales
   *  para que filas viejas (con comprobante) sigan deserializando bien. */
  file_name?: string | null;
  file_size?: number | null;
  file_type?: string | null;
  storage_path?: string | null;
  status: PaymentStatus;
  uploaded_at?: string;
};

export type MatchRow = {
  id: string;
  home_team: string;
  away_team: string;
  match_date: string | null;
  kickoff_time: string | null;
  kickoff_utc: string | null;
  kickoff_argentina: string | null;
  kickoff_argentina_display: string | null;
  group_name: string | null;
  stage: "grupos" | "16avos" | "octavos" | "cuartos" | "semifinal" | "final";
  matchday: number | null;
  venue: string | null;
  city: string | null;
  created_at?: string;
  updated_at?: string;
};

export function toScoreInput(homeGoals: number, awayGoals: number): ScoreInput {
  return { home: String(homeGoals), away: String(awayGoals) };
}
