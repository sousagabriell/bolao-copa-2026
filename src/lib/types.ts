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

const TEAM_NAMES: Record<string, string> = {
  // América do Sul
  Brazil: "Brasil",
  Colombia: "Colômbia",
  Uruguay: "Uruguai",
  Ecuador: "Equador",
  Bolivia: "Bolívia",
  Paraguay: "Paraguai",
  Chile: "Chile",
  Peru: "Peru",
  Venezuela: "Venezuela",
  // América do Norte e Central
  Mexico: "México",
  Canada: "Canadá",
  "United States": "Estados Unidos",
  Panama: "Panamá",
  Nicaragua: "Nicarágua",
  "Trinidad and Tobago": "Trinidad e Tobago",
  // Europa
  Germany: "Alemanha",
  France: "França",
  Spain: "Espanha",
  Italy: "Itália",
  Netherlands: "Países Baixos",
  Belgium: "Bélgica",
  England: "Inglaterra",
  Croatia: "Croácia",
  Denmark: "Dinamarca",
  Poland: "Polônia",
  Sweden: "Suécia",
  Norway: "Noruega",
  Finland: "Finlândia",
  Hungary: "Hungria",
  Serbia: "Sérvia",
  Romania: "Romênia",
  Greece: "Grécia",
  Turkey: "Turquia",
  Ukraine: "Ucrânia",
  Russia: "Rússia",
  Austria: "Áustria",
  Switzerland: "Suíça",
  Slovakia: "Eslováquia",
  Slovenia: "Eslovênia",
  Bulgaria: "Bulgária",
  Iceland: "Islândia",
  Ireland: "Irlanda",
  Scotland: "Escócia",
  Wales: "Gales",
  "Northern Ireland": "Irlanda do Norte",
  Albania: "Albânia",
  "North Macedonia": "Macedônia do Norte",
  Luxembourg: "Luxemburgo",
  Cyprus: "Chipre",
  Georgia: "Geórgia",
  Armenia: "Armênia",
  Moldova: "Moldávia",
  Belarus: "Bielorrússia",
  Lithuania: "Lituânia",
  Latvia: "Letônia",
  Estonia: "Estônia",
  "Czech Republic": "República Tcheca",
  Czechia: "República Tcheca",
  "Bosnia and Herzegovina": "Bósnia e Herzegovina",
  // África
  Morocco: "Marrocos",
  "South Africa": "África do Sul",
  Egypt: "Egito",
  Nigeria: "Nigéria",
  Cameroon: "Camarões",
  Ghana: "Gana",
  Algeria: "Argélia",
  Tunisia: "Tunísia",
  "Ivory Coast": "Costa do Marfim",
  "Côte d'Ivoire": "Costa do Marfim",
  Libya: "Líbia",
  Sudan: "Sudão",
  Ethiopia: "Etiópia",
  Kenya: "Quênia",
  Tanzania: "Tanzânia",
  Rwanda: "Ruanda",
  Zambia: "Zâmbia",
  Zimbabwe: "Zimbábue",
  Mozambique: "Moçambique",
  Gabon: "Gabão",
  Chad: "Chade",
  Niger: "Níger",
  Somalia: "Somália",
  Liberia: "Libéria",
  "Sierra Leone": "Serra Leoa",
  "Cape Verde": "Cabo Verde",
  "DR Congo": "RD Congo",
  "Central African Republic": "República Centro-Africana",
  Djibouti: "Djibuti",
  Eritrea: "Eritreia",
  "Guinea-Bissau": "Guiné-Bissau",
  "Equatorial Guinea": "Guiné Equatorial",
  // Ásia
  "South Korea": "Coreia do Sul",
  "Korea Republic": "Coreia do Sul",
  "Korea DPR": "Coreia do Norte",
  "North Korea": "Coreia do Norte",
  Japan: "Japão",
  "Saudi Arabia": "Arábia Saudita",
  Iran: "Irã",
  Iraq: "Iraque",
  Jordan: "Jordânia",
  "United Arab Emirates": "Emirados Árabes Unidos",
  Qatar: "Catar",
  Bahrain: "Bahrein",
  Oman: "Omã",
  Yemen: "Iêmen",
  Syria: "Síria",
  Lebanon: "Líbano",
  "China PR": "China",
  Australia: "Austrália",
  Thailand: "Tailândia",
  Vietnam: "Vietnã",
  Indonesia: "Indonésia",
  Malaysia: "Malásia",
  Philippines: "Filipinas",
  India: "Índia",
  Myanmar: "Mianmar",
  Cambodia: "Camboja",
  Singapore: "Cingapura",
  Mongolia: "Mongólia",
  Afghanistan: "Afeganistão",
  Pakistan: "Paquistão",
  Uzbekistan: "Uzbequistão",
  Kazakhstan: "Cazaquistão",
  Kyrgyzstan: "Quirguistão",
  Tajikistan: "Tajiquistão",
  Turkmenistan: "Turquemenistão",
  Azerbaijan: "Azerbaijão",
  // Oceania
  "New Zealand": "Nova Zelândia",
  "Papua New Guinea": "Papua Nova Guiné",
  "Solomon Islands": "Ilhas Salomão",
  Tahiti: "Taiti",
  "New Caledonia": "Nova Caledônia",
};

export function translateTeamName(name: string): string {
  return TEAM_NAMES[name] ?? name;
}

export function formatGroupName(group: string): string {
  return group.replace(/^GROUP_/, "GRUPO ");
}
