import type { CandidateFiltersState } from "@/components/CandidateFilters";
import type { ScoredCandidate } from "@/lib/matchingLogic";

export function applyFilters(
  candidates: ScoredCandidate[],
  filters: CandidateFiltersState
): ScoredCandidate[] {
  const filtered = candidates.filter((c) => {
    if (c.score < filters.minScore) return false;
    if (
      filters.location.trim() &&
      !c.location?.toLowerCase().includes(filters.location.toLowerCase())
    )
      return false;
    if (filters.requiredSkills.length > 0) {
      const hasAll = filters.requiredSkills.every((rs) =>
        c.skills?.some(
          (cs: string) =>
            cs.toLowerCase().includes(rs.toLowerCase()) ||
            rs.toLowerCase().includes(cs.toLowerCase())
        )
      );
      if (!hasAll) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sortBy === "skill") {
      const aSkill = a.scoreBreakdown.find((item) => item.label === "Kompetens")?.rawScore ?? 0;
      const bSkill = b.scoreBreakdown.find((item) => item.label === "Kompetens")?.rawScore ?? 0;
      return bSkill - aSkill || b.matchedSkills.length - a.matchedSkills.length || b.score - a.score;
    }

    if (filters.sortBy === "experience") {
      return b.yearsOfExperience - a.yearsOfExperience || b.score - a.score;
    }

    if (filters.sortBy === "network") {
      const strengthScore = { Stark: 3, Medel: 2, Svag: 1 };
      const aNetwork = Math.max(0, ...(a.networkSignals || []).map((signal) => strengthScore[signal.strength] ?? 0));
      const bNetwork = Math.max(0, ...(b.networkSignals || []).map((signal) => strengthScore[signal.strength] ?? 0));
      return bNetwork - aNetwork || (b.networkSignals || []).length - (a.networkSignals || []).length || b.score - a.score;
    }

    if (filters.sortBy === "name") {
      return a.name.localeCompare(b.name, "sv");
    }

    return b.score - a.score;
  });
}
