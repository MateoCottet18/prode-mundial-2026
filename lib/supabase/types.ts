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
  status: "pending" | "finished";
  updated_at?: string;
};

export type PaymentRow = {
  id?: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path?: string | null;
  status: PaymentStatus;
  uploaded_at?: string;
};

export function toScoreInput(homeGoals: number, awayGoals: number): ScoreInput {
  return { home: String(homeGoals), away: String(awayGoals) };
}
