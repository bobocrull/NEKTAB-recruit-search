import { supabase as supabaseClient } from "@/integrations/supabase/client";

const supabase = supabaseClient as any;
import type { Json } from "@/integrations/supabase/types";
import type { JobRequirements, ScoredCandidate } from "@/lib/matchingLogic";

export interface PersistSearchInput {
  title: string;
  jobDescription: string;
  managerProfile: Record<string, unknown>;
  requirements: JobRequirements;
  candidates: ScoredCandidate[];
}

function canonicalKey(candidate: ScoredCandidate): string {
  const linkedin = candidate.linkedin?.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  const name = candidate.name.toLowerCase().replace(/\s+/g, " ").trim();
  const company = candidate.company.toLowerCase().replace(/\s+/g, " ").trim();
  return linkedin || `${name}|${company}`;
}

function candidateRecommendation(candidate: ScoredCandidate) {
  if (candidate.score >= 75 && candidate.redFlags.length <= 1) return "Kontakta nu";
  if (candidate.score >= 55) return "Kanske";
  if (candidate.score >= 40) return "Avvakta";
  return "Ej relevant";
}

export async function persistSearchWithCandidates(input: PersistSearchInput) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  // 1. Insert search
  const { data: search, error: searchError } = await supabase
    .from("recruitment_searches")
    .insert({
      title: input.title,
      job_description: input.jobDescription,
      manager_profile: input.managerProfile as Json,
      parsed_requirements: input.requirements as unknown as Json,
      role_category: input.requirements.roleCategory ?? null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (searchError) throw searchError;
  if (!search) throw new Error("Search record was not created");

  if (!input.candidates || input.candidates.length === 0) {
    return search.id;
  }

  // 2. Prepare candidates data
  const candidateRecords = input.candidates.map(candidate => ({
    canonical_key: canonicalKey(candidate),
    name: candidate.name,
    current_role: candidate.currentRole,
    company: candidate.company,
    years_of_experience: candidate.yearsOfExperience,
    skills: candidate.skills,
    location: candidate.location,
    linkedin_url: candidate.linkedin ?? null,
    email: candidate.email ?? null,
    phone: candidate.phone ?? null,
    avatar_url: candidate.avatarUrl ?? candidate.imageUrl ?? null,
    profile_image_url: candidate.profileImageUrl ?? null,
    data_confidence: candidate.dataConfidence as unknown as Json,
    last_seen_at: new Date().toISOString(),
  }));

  // 3. Batch upsert candidates
  const { data: savedCandidates, error: candidateError } = await supabase
    .from("candidates")
    .upsert(candidateRecords, { onConflict: "canonical_key" })
    .select("id, canonical_key");

  if (candidateError) throw candidateError;
  if (!savedCandidates) throw new Error("Failed to retrieve upserted candidates");

  // Create a map from canonical_key to candidate ID for quick lookup
  const candidateIdMap = new Map<string, string>();
  for (const row of savedCandidates) {
    candidateIdMap.set(row.canonical_key, row.id);
  }

  // 4. Prepare search candidates relation records
  const relationRecords = input.candidates.map(candidate => {
    const key = canonicalKey(candidate);
    const candidateDbId = candidateIdMap.get(key);
    if (!candidateDbId) {
      throw new Error(`Failed to find database ID for candidate key: ${key}`);
    }
    return {
      search_id: search.id,
      candidate_id: candidateDbId,
      score: candidate.score,
      score_breakdown: candidate.scoreBreakdown as unknown as Json,
      matched_skills: candidate.matchedSkills,
      missing_skills: candidate.missingSkills,
      skill_evidence: candidate.skillEvidence as unknown as Json,
      decision_summary: candidate.decisionSummary,
      red_flags: candidate.redFlags,
      recommendation: candidateRecommendation(candidate),
    };
  });

  // 5. Batch upsert relations
  const { data: searchCandidates, error: relationError } = await supabase
    .from("search_candidates")
    .upsert(relationRecords, { onConflict: "search_id,candidate_id" })
    .select("id, candidate_id");

  if (relationError) throw relationError;
  if (!searchCandidates) throw new Error("Failed to retrieve upserted search_candidates");

  // Create a map from candidate_id to search_candidate_id
  const searchCandIdMap = new Map<string, string>();
  for (const row of searchCandidates) {
    searchCandIdMap.set(row.candidate_id, row.id);
  }

  // 6. Prepare candidate sources and candidate events
  const sourceRecords = [];
  const eventRecords = [];

  for (const candidate of input.candidates) {
    const key = canonicalKey(candidate);
    const candidateDbId = candidateIdMap.get(key);
    const searchCandDbId = searchCandIdMap.get(candidateDbId || "");

    if (candidateDbId) {
      sourceRecords.push({
        candidate_id: candidateDbId,
        source_name: candidate.source || "web",
        source_url: candidate.linkedin ?? null,
        raw_payload: candidate as unknown as Json,
      });

      if (searchCandDbId) {
        eventRecords.push({
          candidate_id: candidateDbId,
          search_candidate_id: searchCandDbId,
          event_type: "created" as const,
          message: `Kandidat hittades i sökning "${input.title}".`,
          created_by: userId,
        });
      }
    }
  }

  // 7. Batch insert sources
  if (sourceRecords.length > 0) {
    const { error: sourceError } = await supabase
      .from("candidate_sources")
      .insert(sourceRecords);
    if (sourceError) throw sourceError;
  }

  // 8. Batch insert events
  if (eventRecords.length > 0) {
    const { error: eventError } = await supabase
      .from("candidate_events")
      .insert(eventRecords);
    if (eventError) throw eventError;
  }

  return search.id;
}

export async function updateSearchCandidateStatus(
  searchCandidateId: string,
  pipelineStatus: "Ny" | "Intressant" | "Kontaktad" | "Svarat" | "Ej aktuell" | "Intervju",
  feedback?: "Relevant" | "Inte relevant" | "Fel bransch" | "För junior" | "Fel geografi" | "Saknar nyckelkompetens"
) {
  const { error } = await supabase
    .from("search_candidates")
    .update({ pipeline_status: pipelineStatus, feedback: feedback ?? null })
    .eq("id", searchCandidateId);

  if (error) throw error;
}

export async function addCandidateNote(searchCandidateId: string, body: string) {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("candidate_notes").insert({
    search_candidate_id: searchCandidateId,
    body,
    created_by: userData.user?.id ?? null,
  });

  if (error) throw error;
}

export async function logCandidateExport(searchId: string | null, candidateIds: string[], reason: string) {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("data_exports").insert({
    search_id: searchId,
    exported_candidate_ids: candidateIds,
    export_reason: reason,
    created_by: userData.user?.id ?? null,
  });

  if (error) throw error;
}
