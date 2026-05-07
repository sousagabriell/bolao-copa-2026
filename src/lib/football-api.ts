import { Match } from "./types";

const API_URL = "https://api.football-data.org/v4";
const API_KEY = process.env.FOOTBALL_DATA_API_KEY!;

interface FootballMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string;
  group: string | null;
  homeTeam: {
    name: string;
    crest: string;
  };
  awayTeam: {
    name: string;
    crest: string;
  };
  score: {
    winner: string | null;
    fullTime: { home: number | null; away: number | null };
    regularTime: { home: number | null; away: number | null };
  };
  venue: string | null;
}

async function fetchAPI<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "X-Auth-Token": API_KEY },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Football API error: ${response.status} ${path}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchWorldCupMatches(): Promise<Partial<Match>[]> {
  const data = await fetchAPI<{ matches: FootballMatch[] }>(
    "/competitions/WC/matches?season=2026"
  );

  return data.matches.map((m) => ({
    external_id: m.id,
    home_team: m.homeTeam.name,
    away_team: m.awayTeam.name,
    home_team_crest: m.homeTeam.crest || null,
    away_team_crest: m.awayTeam.crest || null,
    stadium: m.venue || null,
    city: null,
    starts_at: m.utcDate,
    status: m.status as Match["status"],
    home_score: m.score.fullTime.home,
    away_score: m.score.fullTime.away,
    home_score_regular:
      m.score.regularTime?.home ?? m.score.fullTime.home,
    away_score_regular:
      m.score.regularTime?.away ?? m.score.fullTime.away,
    stage: m.stage,
    group_name: m.group,
    matchday: m.matchday,
  }));
}
