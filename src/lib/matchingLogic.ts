import type { Candidate, CandidateNetworkSignal, CandidateSourceCategory } from "@/types/candidate";

export interface JobRequirements {
  seniorityLevel: string;
  yearsOfExperience: number | null;
  keySkills: string[];
  industries: string[];
  jobTitles: string[];
  targetCompanies: string[];
  location: string | null;
  roleCategory?: string | null;
}

export interface ScoredCandidate extends Candidate {
  score: number;
  explanation: string;
  scoreBreakdown: ScoreBreakdownItem[];
  matchedSkills: string[];
  missingSkills: string[];
  skillEvidence: SkillEvidenceItem[];
  dataConfidence: DataConfidence;
  decisionSummary: string;
  redFlags: string[];
  sourceCategory: CandidateSourceCategory;
  networkSignals: CandidateNetworkSignal[];
  evidenceSnippets: string[];
}

export interface ScoreBreakdownItem {
  label: string;
  rawScore: number;
  weight: number;
  weightedScore: number;
  reason: string;
}

export interface SkillEvidenceItem {
  skill: string;
  source: "kompetens" | "titel" | "bolag" | "källa";
  value: string;
}

export interface DataConfidence {
  level: "Hög" | "Medel" | "Låg";
  score: number;
  reasons: string[];
}

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " och ")
    .replace(/[<>]/g, " ")
    .replace(/[^a-z0-9åäö\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSkillText(value: string): string {
  return normalizeStr(value).replace(/\s+/g, "");
}

function stemSkillToken(token: string): string {
  return token
    .replace(/(ningar|ning|ering|ande|arna|erna|orna|are|or|ar|er|en|et|s)$/u, "")
    .replace(/projekt$/u, "projekter")
    .replace(/projektor$/u, "projekter");
}

function skillTerms(value: string): Set<string> {
  const normalized = normalizeStr(value);
  const compact = compactSkillText(value);
  const tokens = normalized.split(" ").filter((token) => token.length >= 3);
  const terms = new Set<string>([normalized, compact]);

  tokens.forEach((token) => {
    terms.add(token);
    terms.add(stemSkillToken(token));
  });

  if (/kraftledning|luftledning|transmissionline|powerline/.test(compact)) {
    ["kraftledning", "luftledning", "ledning", "transmissionline", "powerline"].forEach((term) => terms.add(term));
  }

  if (/projekter|projektor|projektering/.test(compact)) {
    ["projekter", "projektering", "projektor"].forEach((term) => terms.add(term));
  }

  if (/stolp/.test(compact)) {
    ["stolp", "stolpplacering", "stolpkonstruktion"].forEach((term) => terms.add(term));
  }

  if (/bygg/.test(compact)) {
    ["bygghandling", "ritning", "konstruktion"].forEach((term) => terms.add(term));
  }

  if (/falt|field/.test(compact)) {
    ["falt", "faltarbete", "fieldwork"].forEach((term) => terms.add(term));
  }

  if (/cad|autocad|microstation/.test(compact)) {
    ["cad", "autocad", "microstation"].forEach((term) => terms.add(term));
  }

  if (/40kv|kv|hogspanning|highvoltage/.test(compact)) {
    ["kv", "40kv", "hogspanning", "highvoltage"].forEach((term) => terms.add(term));
  }

  return terms;
}

function skillMatchesRequirement(candidateEvidence: string[], requiredSkill: string): boolean {
  const requiredTerms = skillTerms(requiredSkill);
  const evidenceTerms = new Set(candidateEvidence.flatMap((value) => Array.from(skillTerms(value))));

  return Array.from(requiredTerms).some((requiredTerm) =>
    Array.from(evidenceTerms).some((evidenceTerm) => {
      if (requiredTerm.length < 4 || evidenceTerm.length < 4) return requiredTerm === evidenceTerm;
      return requiredTerm.includes(evidenceTerm) || evidenceTerm.includes(requiredTerm);
    })
  );
}

function candidateSkillEvidence(candidate: Candidate): string[] {
  return [
    ...candidate.skills,
    candidate.currentRole,
    candidate.company,
    candidate.source,
    candidate.sourceCategory || "",
    ...(candidate.evidenceSnippets || []),
    ...(candidate.networkSignals || []).flatMap((signal) => [signal.label, signal.reason]),
  ].filter(Boolean);
}

function candidateEvidenceItems(candidate: Candidate): SkillEvidenceItem[] {
  return [
    ...candidate.skills.map((skill) => ({ skill: "", source: "kompetens" as const, value: skill })),
    { skill: "", source: "titel" as const, value: candidate.currentRole },
    { skill: "", source: "bolag" as const, value: candidate.company },
    { skill: "", source: "källa" as const, value: candidate.source },
  ].filter((item) => Boolean(item.value));
}

function matchingSkills(candidate: Candidate, requiredSkills: string[]): string[] {
  const evidence = candidateSkillEvidence(candidate);
  return requiredSkills.filter((requiredSkill) => skillMatchesRequirement(evidence, requiredSkill));
}

function matchingSkillEvidence(candidate: Candidate, requiredSkills: string[]): SkillEvidenceItem[] {
  const evidenceItems = candidateEvidenceItems(candidate);

  return requiredSkills.flatMap((requiredSkill) => {
    const match = evidenceItems.find((item) => skillMatchesRequirement([item.value], requiredSkill));
    return match ? [{ ...match, skill: requiredSkill }] : [];
  });
}

function skillMatch(candidate: Candidate, requiredSkills: string[]): number {
  if (requiredSkills.length === 0) return 50;
  const matches = matchingSkills(candidate, requiredSkills);
  return Math.round((matches.length / requiredSkills.length) * 100);
}

function missingSkills(candidate: Candidate, requiredSkills: string[]): string[] {
  const matched = new Set(matchingSkills(candidate, requiredSkills));
  return requiredSkills.filter((skill) => !matched.has(skill));
}

function dataConfidence(candidate: Candidate): DataConfidence {
  const reasons: string[] = [];
  let score = 0;

  if (candidate.name?.trim()) score += 15;
  if (candidate.currentRole?.trim()) {
    score += 15;
    reasons.push("tydlig roll");
  }
  if (candidate.company?.trim()) {
    score += 15;
    reasons.push("tydligt bolag");
  }
  if (candidate.location?.trim()) score += 10;
  if (candidate.skills?.length >= 3) {
    score += 20;
    reasons.push("flera kompetenser");
  } else if (candidate.skills?.length > 0) {
    score += 10;
  }
  if (candidate.linkedin?.trim()) {
    score += 15;
    reasons.push("LinkedIn-länk");
  }
  if (candidate.avatarUrl?.trim() || candidate.profileImageUrl?.trim() || candidate.imageUrl?.trim()) {
    score += 5;
    reasons.push("profilbild");
  }
  if (candidate.email?.trim() || candidate.phone?.trim()) {
    score += 10;
    reasons.push("kontaktuppgift");
  }
  if (candidate.sourceCategory?.trim()) {
    score += 5;
    reasons.push(`källtyp: ${candidate.sourceCategory}`);
  }
  if ((candidate.evidenceSnippets || []).length > 0) {
    score += 10;
    reasons.push("konkreta källutdrag");
  }

  if (reasons.length === 0) reasons.push("begränsad strukturerad data");

  return {
    score: Math.min(100, score),
    level: score >= 75 ? "Hög" : score >= 45 ? "Medel" : "Låg",
    reasons,
  };
}

function inferSourceCategory(candidate: Candidate): CandidateSourceCategory {
  if (candidate.sourceCategory) return candidate.sourceCategory;
  const source = normalizeStr(`${candidate.source} ${candidate.linkedin || ""}`);
  if (source.includes("linkedin")) return "LinkedIn";
  if (source.includes("rocketreach")) return "RocketReach";
  if (source.includes("github")) return "GitHub";
  if (source.includes("patent")) return "Patent";
  if (source.includes("researchgate") || source.includes("scholar") || source.includes("publication")) return "Forskning";
  if (source.includes("theorg") || source.includes("crunchbase") || source.includes("apollo")) return "Katalog";
  if (source.includes("company") || source.includes("team") || source.includes("about")) return "Bolagssida";
  return "Öppen webb";
}

function inferNetworkSignals(candidate: Candidate, req: JobRequirements): CandidateNetworkSignal[] {
  const existing = Array.isArray(candidate.networkSignals) ? candidate.networkSignals : [];
  const signals: CandidateNetworkSignal[] = [...existing];
  const company = normalizeStr(candidate.company);
  const roleAndSource = normalizeStr(`${candidate.currentRole} ${candidate.source} ${(candidate.evidenceSnippets || []).join(" ")}`);

  const targetCompany = req.targetCompanies.find((target) => {
    const normalizedTarget = normalizeStr(target);
    return normalizedTarget && company && (company.includes(normalizedTarget) || normalizedTarget.includes(company));
  });

  if (targetCompany && !signals.some((signal) => signal.label === "Relevant bolagsmiljö")) {
    signals.push({
      label: "Relevant bolagsmiljö",
      reason: `${candidate.company} matchar eller ligger nära önskad bolagsmiljö (${targetCompany}).`,
      strength: "Stark",
    });
  }

  const industryHit = req.industries.find((industry) => {
    const normalizedIndustry = normalizeStr(industry);
    return normalizedIndustry && roleAndSource.includes(normalizedIndustry);
  });

  if (industryHit && !signals.some((signal) => signal.label === "Branschmiljö")) {
    signals.push({
      label: "Branschmiljö",
      reason: `Profilen innehåller signaler kopplade till ${industryHit}.`,
      strength: "Medel",
    });
  }

  if (/elnat|elkraft|kraftledning|transmission|distribution|substation|station|stallverk/.test(roleAndSource) && !signals.some((signal) => signal.label === "Elnätsnära kontext")) {
    signals.push({
      label: "Elnätsnära kontext",
      reason: "Titel, källa eller utdrag innehåller elnätsnära begrepp.",
      strength: "Medel",
    });
  }

  return signals.slice(0, 6);
}

function networkSignalScore(candidate: Candidate, req: JobRequirements): number {
  const signals = inferNetworkSignals(candidate, req);
  if (signals.some((signal) => signal.strength === "Stark")) return 100;
  if (signals.some((signal) => signal.strength === "Medel")) return 70;
  if (signals.length > 0) return 45;
  return 20;
}

function decisionSummary(candidate: Candidate, req: JobRequirements): string {
  const matches = matchingSkills(candidate, req.keySkills);
  const misses = missingSkills(candidate, req.keySkills);
  const signals = inferNetworkSignals(candidate, req);
  const companyHint = req.targetCompanies.some((company) => normalizeStr(company) === normalizeStr(candidate.company))
    ? `${candidate.company}-bakgrund`
    : candidate.company;
  const matchText = req.keySkills.length > 0 ? `${matches.length}/${req.keySkills.length} krav` : "krav saknas i annonsen";
  const riskText = misses.length > 0 ? `Risk: saknar ${misses.slice(0, 2).join(", ")} i källorna.` : "Inga tydliga kompetensluckor i källorna.";
  const networkText = signals.length > 0 ? `Nätverk: ${signals[0].label}.` : "Ingen tydlig nätverkssignal.";
  return `${matchText}, ${companyHint}, ${candidate.yearsOfExperience} år, ${candidate.location}. ${networkText} ${riskText}`;
}

function redFlags(candidate: Candidate, req: JobRequirements): string[] {
  const flags: string[] = [];
  const confidence = dataConfidence(candidate);
  const skillRawScore = skillMatch(candidate, req.keySkills);
  const titleRawScore = titleRelevance(candidate, req);

  if (confidence.score < 45) flags.push("Låg datakvalitet");
  if (!candidate.linkedin?.trim()) flags.push("LinkedIn saknas");
  if (!candidate.email?.trim() && !candidate.phone?.trim()) flags.push("Kontaktuppgifter saknas");
  if (req.keySkills.length > 0 && skillRawScore < 40) flags.push("Svag kompetensmatch");
  if (titleRawScore < 50) flags.push("Otydlig rollmatch");
  if (companyRelevance(candidate, req) >= 80 && skillRawScore < 50) flags.push("Matchar främst på bolag, inte kompetens");
  if (networkSignalScore(candidate, req) >= 70 && skillRawScore < 50) flags.push("Nätverkssignal utan stark kompetensbevisning");
  return flags;
}

function seniorityScore(candidate: Candidate, req: JobRequirements): number {
  const level = normalizeStr(req.seniorityLevel);
  const yoe = candidate.yearsOfExperience;

  if (level.includes("senior") || level.includes("lead")) {
    if (yoe >= 7) return 100;
    if (yoe >= 5) return 70;
    return 30;
  }
  if (level.includes("mid")) {
    if (yoe >= 3 && yoe <= 8) return 100;
    if (yoe >= 2) return 70;
    return 40;
  }
  if (level.includes("junior")) {
    if (yoe <= 3) return 100;
    if (yoe <= 5) return 60;
    return 30;
  }
  return 50;
}

function titleRelevance(candidate: Candidate, req: JobRequirements): number {
  if (req.jobTitles.length === 0) return 50;
  const normRole = normalizeStr(candidate.currentRole);
  const match = req.jobTitles.some(t => {
    const nt = normalizeStr(t);
    return normRole.includes(nt) || nt.includes(normRole) ||
      nt.split(" ").some(word => word.length > 3 && normRole.includes(word));
  });
  return match ? 100 : 20;
}

function locationScore(candidate: Candidate, req: JobRequirements): number {
  if (!req.location) return 50;
  const normLoc = normalizeStr(req.location);
  const candLoc = normalizeStr(candidate.location);
  if (candLoc.includes(normLoc) || normLoc.includes(candLoc)) return 100;
  if (candLoc === "remote") return 80;
  return 20;
}

function companyRelevance(candidate: Candidate, req: JobRequirements): number {
  if (req.targetCompanies.length === 0 && req.industries.length === 0) return 50;
  const normCompany = normalizeStr(candidate.company);
  const companyMatch = req.targetCompanies.some(c => normalizeStr(c) === normCompany);
  if (companyMatch) return 100;
  return 40;
}

function scoreWeights(req: JobRequirements) {
  const combined = normalizeStr([...req.jobTitles, ...req.keySkills, req.roleCategory || ""].join(" "));
  if (/gis|mat|mät|mark|tillstand|tillstånd/.test(combined)) {
    return { skill: 32, seniority: 18, title: 14, location: 14, company: 12, network: 10 };
  }
  if (/bered|kraftledning|luftledning|station|stallverk|ställverk|elkraft/.test(combined)) {
    return { skill: 40, seniority: 18, title: 14, location: 10, company: 10, network: 8 };
  }
  return { skill: 36, seniority: 22, title: 14, location: 10, company: 10, network: 8 };
}

function buildScoreBreakdown(candidate: Candidate, req: JobRequirements): ScoreBreakdownItem[] {
  const skillMatches = matchingSkills(candidate, req.keySkills);
  const skillRawScore = skillMatch(candidate, req.keySkills);
  const seniorityRawScore = seniorityScore(candidate, req);
  const titleRawScore = titleRelevance(candidate, req);
  const locationRawScore = locationScore(candidate, req);
  const companyRawScore = companyRelevance(candidate, req);
  const networkRawScore = networkSignalScore(candidate, req);
  const signals = inferNetworkSignals(candidate, req);

  const weights = scoreWeights(req);
  const items = [
    {
      label: "Kompetens",
      rawScore: skillRawScore,
      weight: weights.skill,
      reason:
        req.keySkills.length === 0
          ? "Inga specifika kompetenskrav hittades i annonsen."
          : `${skillMatches.length} av ${req.keySkills.length} krav matchar${skillMatches.length > 0 ? `: ${skillMatches.join(", ")}` : "."}`,
    },
    {
      label: "Senioritet",
      rawScore: seniorityRawScore,
      weight: weights.seniority,
      reason: `${candidate.yearsOfExperience} års erfarenhet jämfört med nivån ${req.seniorityLevel || "okänd"}.`,
    },
    {
      label: "Rolltitel",
      rawScore: titleRawScore,
      weight: weights.title,
      reason:
        req.jobTitles.length === 0
          ? "Ingen tydlig måltitel hittades i annonsen."
          : `Kandidatens roll "${candidate.currentRole}" jämförs med ${req.jobTitles.join(", ")}.`,
    },
    {
      label: "Plats",
      rawScore: locationRawScore,
      weight: weights.location,
      reason: req.location ? `${candidate.location} jämförs med ${req.location}.` : "Ingen specifik plats hittades i annonsen.",
    },
    {
      label: "Bolag/bransch",
      rawScore: companyRawScore,
      weight: weights.company,
      reason:
        req.targetCompanies.length > 0 || req.industries.length > 0
          ? `${candidate.company} jämförs med önskade bolag/branscher.`
          : "Inga specifika bolag eller branscher hittades i annonsen.",
    },
    {
      label: "Nätverk",
      rawScore: networkRawScore,
      weight: weights.network,
      reason:
        signals.length > 0
          ? signals.map((signal) => `${signal.label}: ${signal.reason}`).join(" ")
          : "Ingen tydlig nätverks- eller branschsignal hittades.",
    },
  ];

  return items.map((item) => ({
    ...item,
    weightedScore: Math.round((item.rawScore * item.weight) / 100),
  }));
}

function generateExplanation(candidate: Candidate, req: JobRequirements): string {
  const parts: string[] = [];
  const skillMatches = matchingSkills(candidate, req.keySkills);

  if (skillMatches.length > 0) {
    parts.push(`Matchar ${skillMatches.length} av ${req.keySkills.length} kravkompetenser (${skillMatches.join(", ")}).`);
  }

  if (req.seniorityLevel) {
    parts.push(`${candidate.yearsOfExperience} års erfarenhet vägs mot nivån ${req.seniorityLevel}.`);
  }

  if (req.location && normalizeStr(candidate.location).includes(normalizeStr(req.location))) {
    parts.push(`Finns i målområdet (${candidate.location}).`);
  }

  if (parts.length === 0) {
    parts.push(`Generell profilrelevans baserad på erfarenhet och bakgrund hos ${candidate.company}.`);
  }

  return parts.join(" ");
}

export function rankCandidates(candidates: Candidate[], requirements: JobRequirements): ScoredCandidate[] {
  return candidates
    .map(candidate => {
      const scoreBreakdown = buildScoreBreakdown(candidate, requirements);
      const score = scoreBreakdown.reduce((sum, item) => sum + item.weightedScore, 0);
      const explanation = generateExplanation(candidate, requirements);
      return {
        ...candidate,
        sourceCategory: inferSourceCategory(candidate),
        networkSignals: inferNetworkSignals(candidate, requirements),
        evidenceSnippets: candidate.evidenceSnippets || [],
        score,
        explanation,
        scoreBreakdown,
        matchedSkills: matchingSkills(candidate, requirements.keySkills),
        missingSkills: missingSkills(candidate, requirements.keySkills),
        skillEvidence: matchingSkillEvidence(candidate, requirements.keySkills),
        dataConfidence: dataConfidence(candidate),
        decisionSummary: decisionSummary(candidate, requirements),
        redFlags: redFlags(candidate, requirements),
      };
    })
    .sort((a, b) => b.score - a.score);
}
