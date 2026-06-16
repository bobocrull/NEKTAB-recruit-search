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

  for (const candidate of input.candidates) {
    const { data: savedCandidate, error: candidateError } = await supabase
      .from("candidates")
      .upsert(
        {
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
        },
        { onConflict: "canonical_key" }
      )
      .select("id")
      .single();

    if (candidateError) throw candidateError;

    const { data: searchCandidate, error: relationError } = await supabase
      .from("search_candidates")
      .upsert(
        {
          search_id: search!.id,
          candidate_id: savedCandidate!.id,
          score: candidate.score,
          score_breakdown: candidate.scoreBreakdown as unknown as Json,
          matched_skills: candidate.matchedSkills,
          missing_skills: candidate.missingSkills,
          skill_evidence: candidate.skillEvidence as unknown as Json,
          decision_summary: candidate.decisionSummary,
          red_flags: candidate.redFlags,
          recommendation: candidateRecommendation(candidate),
        },
        { onConflict: "search_id,candidate_id" }
      )
      .select("id")
      .single();

    if (relationError) throw relationError;

    await supabase.from("candidate_sources").insert({
      candidate_id: savedCandidate!.id,
      source_name: candidate.source || "web",
      source_url: candidate.linkedin ?? null,
      raw_payload: candidate as unknown as Json,
    });

    await supabase.from("candidate_events").insert({
      candidate_id: savedCandidate!.id,
      search_candidate_id: searchCandidate!.id,
      event_type: "created",
      message: `Kandidat hittades i sökning "${input.title}".`,
      created_by: userId,
    });
  }

  return search!.id;
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
