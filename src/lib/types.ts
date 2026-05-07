export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PaymentStatus = "pending" | "paid" | "revoked";

export type MatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "SUSPENDED"
  | "CANCELLED";

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  payment_status: PaymentStatus;
  payment_id: string | null;
  paid_at: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: number;
  external_id: number;
  home_team: string;
  away_team: string;
  home_team_crest: string | null;
  away_team_crest: string | null;
  stadium: string | null;
  city: string | null;
  starts_at: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  home_score_regular: number | null;
  away_score_regular: number | null;
  stage: string;
  group_name: string | null;
  matchday: number | null;
  created_at: string;
  updated_at: string;
}

export interface Prediction {
  id: number;
  user_id: string;
  match_id: number;
  home_score_pred: number;
  away_score_pred: number;
  points: number | null;
  created_at: string;
  updated_at: string;
}

export interface RankingEntry {
  id: string;
  name: string;
  avatar_url: string | null;
  joined_at: string;
  total_points: number;
  exact_scores: number;
  correct_results: number;
  total_predictions: number;
}

export interface Settings {
  key: string;
  value: string;
  updated_at: string;
}
