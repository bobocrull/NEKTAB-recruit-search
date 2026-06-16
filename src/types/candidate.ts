export interface Candidate {
  id: number | string;
  name: string;
  currentRole: string;
  company: string;
  yearsOfExperience: number;
  skills: string[];
  location: string;
  source: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  avatarUrl?: string;
  profileImageUrl?: string;
  imageUrl?: string;
  sourceCategory?: CandidateSourceCategory;
  networkSignals?: CandidateNetworkSignal[];
  evidenceSnippets?: string[];
  integrationStatus?: "Ej exporterad" | "Redo för export" | "Exporterad" | "Skickad till Cinode";
}

export type CandidateSourceCategory =
  | "LinkedIn"
  | "RocketReach"
  | "GitHub"
  | "Patent"
  | "Forskning"
  | "Bolagssida"
  | "Katalog"
  | "Öppen webb";

export interface CandidateNetworkSignal {
  label: string;
  reason: string;
  strength: "Stark" | "Medel" | "Svag";
}
