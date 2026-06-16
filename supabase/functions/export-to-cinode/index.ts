import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { enforceRequestSecurity, json, preflight } from "../_shared/security.ts";

type PipelineStatus = "Ny" | "Intressant" | "Kontaktad" | "Svarat" | "Ej aktuell" | "Intervju";

type ExportCandidate = {
  id: string | number;
  name: string;
  currentRole: string;
  company: string;
  yearsOfExperience?: number;
  skills?: string[];
  location?: string;
  source?: string;
  sourceCategory?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  score?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  decisionSummary?: string;
  redFlags?: string[];
  networkSignals?: Array<{ label: string; reason: string; strength: string }>;
  evidenceSnippets?: string[];
  scoreBreakdown?: Array<{ label: string; weightedScore: number; rawScore: number; weight: number; reason: string }>;
};

type ExportRequest = {
  candidates: ExportCandidate[];
  pipeline?: Record<string, PipelineStatus>;
  feedback?: Record<string, string>;
  notes?: Record<string, string>;
  dryRun?: boolean;
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown): string | null {
  const clean = cleanString(value);
  if (!clean || ["not available", "unknown", "n/a"].includes(clean.toLowerCase())) return null;
  return clean;
}

function cleanNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function candidateId(candidate: ExportCandidate): string {
  return String(candidate.id);
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] || "Okänd", lastName: "Kandidat" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function cinodeConfig() {
  return {
    baseUrl: Deno.env.get("CINODE_BASE_URL") || "https://api.cinode.com",
    staticToken: Deno.env.get("CINODE_STATIC_TOKEN") || Deno.env.get("CINODE_TOKEN") || "",
    accessId: Deno.env.get("CINODE_ACCESS_ID") || "",
    accessSecret: Deno.env.get("CINODE_ACCESS_SECRET") || "",
    companyId: cleanNumber(Deno.env.get("CINODE_COMPANY_ID")),
    pipelineId: cleanNumber(Deno.env.get("CINODE_PIPELINE_ID")),
    pipelineStageId: cleanNumber(Deno.env.get("CINODE_PIPELINE_STAGE_ID")),
    recruitmentManagerId: cleanNumber(Deno.env.get("CINODE_RECRUITMENT_MANAGER_ID")),
    recruitmentSourceId: cleanNumber(Deno.env.get("CINODE_RECRUITMENT_SOURCE_ID")),
    currencyId: cleanNumber(Deno.env.get("CINODE_CURRENCY_ID")) || 1,
  };
}

async function getCinodeToken(config: ReturnType<typeof cinodeConfig>) {
  if (config.staticToken) return config.staticToken;
  if (!config.accessId || !config.accessSecret) {
    throw new Error("Cinode auth saknas. Sätt CINODE_STATIC_TOKEN eller CINODE_ACCESS_ID/CINODE_ACCESS_SECRET.");
  }

  const basic = btoa(`${config.accessId}:${config.accessSecret}`);
  const response = await fetch(`${config.baseUrl}/token`, {
    method: "GET",
    headers: { Authorization: `Basic ${basic}` },
  });

  if (!response.ok) {
    throw new Error(`Kunde inte hämta Cinode-token (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  if (!data?.access_token) throw new Error("Cinode token response saknar access_token.");
  return String(data.access_token);
}

async function cinodeFetch(path: string, token: string, init: RequestInit = {}) {
  const config = cinodeConfig();
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new Error(`Cinode API ${response.status} på ${path}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }

  return data;
}

function buildCandidateDescription(
  candidate: ExportCandidate,
  pipeline?: Record<string, PipelineStatus>,
  feedback?: Record<string, string>,
  notes?: Record<string, string>
) {
  const id = candidateId(candidate);
  return [
    "Importerad från NEKTAB Candidate Intelligence.",
    "",
    candidate.decisionSummary && `Beslutsrad: ${candidate.decisionSummary}`,
    typeof candidate.score === "number" && `NEKTAB-score: ${candidate.score}/100`,
    pipeline?.[id] && `Pipeline i NEKTAB-verktyget: ${pipeline[id]}`,
    feedback?.[id] && `Feedback: ${feedback[id]}`,
    notes?.[id] && `Chefens anteckning: ${notes[id]}`,
    "",
    candidate.matchedSkills?.length ? `Matchade krav: ${candidate.matchedSkills.join(", ")}` : "",
    candidate.missingSkills?.length ? `Saknade krav: ${candidate.missingSkills.join(", ")}` : "",
    candidate.redFlags?.length ? `Risker: ${candidate.redFlags.join(", ")}` : "",
    candidate.networkSignals?.length
      ? `Nätverkssignaler: ${candidate.networkSignals.map((signal) => `${signal.label} (${signal.strength}) - ${signal.reason}`).join(" | ")}`
      : "",
    candidate.evidenceSnippets?.length ? `Källutdrag: ${candidate.evidenceSnippets.join(" | ")}` : "",
    candidate.scoreBreakdown?.length
      ? `Poängfördelning: ${candidate.scoreBreakdown.map((item) => `${item.label}: ${item.weightedScore}p (${item.rawScore}/100 x ${item.weight}%)`).join(" | ")}`
      : "",
    "",
    candidate.source && `Källa: ${candidate.sourceCategory || "Öppen webb"} - ${candidate.source}`,
  ].filter(Boolean).join("\n");
}

function buildCinodeCandidatePayload(
  candidate: ExportCandidate,
  config: ReturnType<typeof cinodeConfig>,
  request: ExportRequest
) {
  const { firstName, lastName } = splitName(candidate.name);
  const id = candidateId(candidate);

  return {
    firstName,
    lastName,
    title: optionalString(candidate.currentRole),
    description: buildCandidateDescription(candidate, request.pipeline, request.feedback, request.notes),
    email: optionalString(candidate.email),
    phone: optionalString(candidate.phone),
    linkedInUrl: optionalString(candidate.linkedin),
    state: 0,
    currentEmployer: optionalString(candidate.company),
    pipelineId: config.pipelineId,
    pipelineStageId: config.pipelineStageId,
    recruitmentManagerId: config.recruitmentManagerId,
    recruitmentSourceId: config.recruitmentSourceId,
    currencyId: config.currencyId,
    notifyRecruitmentManager: false,
    isMobile: Boolean(optionalString(candidate.phone)),
    internalId: `nektab-ci:${id}`,
  };
}

async function addCandidateSkills(companyId: number, token: string, cinodeCandidateId: number, candidate: ExportCandidate) {
  const warnings: string[] = [];
  const skills = Array.from(new Set([...(candidate.skills || []), ...(candidate.matchedSkills || [])].filter(Boolean))).slice(0, 20);

  for (const skill of skills) {
    try {
      await cinodeFetch(`/v0.1/companies/${companyId}/candidates/${cinodeCandidateId}/skills`, token, {
        method: "POST",
        body: JSON.stringify({
          name: skill,
          companyCandidateId: cinodeCandidateId,
          keywordSynonymId: null,
          languageId: 1,
        }),
      });
    } catch (error) {
      warnings.push(`Kunde inte lägga till skill "${skill}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return warnings;
}

async function addCandidateLinks(companyId: number, token: string, cinodeCandidateId: number, candidate: ExportCandidate) {
  const warnings: string[] = [];
  const links = [
    candidate.linkedin && { uri: candidate.linkedin, title: "LinkedIn", description: "Profil hittad via NEKTAB Candidate Intelligence" },
    candidate.source && { uri: candidate.source, title: candidate.sourceCategory || "Källa", description: "Källa för kandidatmatchning" },
  ].filter(Boolean) as Array<{ uri: string; title: string; description: string }>;

  for (const link of links) {
    try {
      await cinodeFetch(`/v0.1/companies/${companyId}/candidates/${cinodeCandidateId}/uriattachments`, token, {
        method: "POST",
        body: JSON.stringify(link),
      });
    } catch (error) {
      warnings.push(`Kunde inte lägga till länk "${link.title}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return warnings;
}

async function addMatchNote(companyId: number, token: string, cinodeCandidateId: number, candidate: ExportCandidate, request: ExportRequest) {
  try {
    await cinodeFetch(`/v0.1/companies/${companyId}/candidates/${cinodeCandidateId}/events/notes`, token, {
      method: "POST",
      body: JSON.stringify({
        title: "NEKTAB matchanalys",
        description: buildCandidateDescription(candidate, request.pipeline, request.feedback, request.notes),
        noteType: 0,
        status: 2,
        type: 1,
        visibility: 0,
        noteDate: new Date().toISOString(),
        timezoneId: "Europe/Stockholm",
      }),
    });
    return [];
  } catch (error) {
    return [`Kunde inte lägga till matchanalys-note: ${error instanceof Error ? error.message : String(error)}`];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return preflight(req);
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const blocked = enforceRequestSecurity(req, "export-to-cinode", { maxBytes: 220_000, limit: 8 });
  if (blocked) return blocked;

  try {
    const request = await req.json() as ExportRequest;
    const candidates = Array.isArray(request.candidates) ? request.candidates : [];
    if (candidates.length === 0) return json(req, { error: "candidates is required" }, 400);
    if (candidates.length > 25) return json(req, { error: "Max 25 kandidater per Cinode-export." }, 413);

    const config = cinodeConfig();
    if (!config.companyId) return json(req, { error: "CINODE_COMPANY_ID saknas." }, 500);

    const token = request.dryRun ? "dry-run" : await getCinodeToken(config);
    const results = [];

    for (const candidate of candidates) {
      const payload = buildCinodeCandidatePayload(candidate, config, request);

      if (request.dryRun) {
        results.push({ localId: candidateId(candidate), dryRun: true, payload });
        continue;
      }

      const created = await cinodeFetch(`/v0.1/companies/${config.companyId}/candidates`, token, {
        method: "POST",
        body: JSON.stringify(payload),
      }) as { id?: number };

      const cinodeCandidateId = created?.id;
      if (!cinodeCandidateId) throw new Error(`Cinode returnerade inget candidate id för ${candidate.name}.`);

      const warnings = [
        ...(await addCandidateSkills(config.companyId, token, cinodeCandidateId, candidate)),
        ...(await addCandidateLinks(config.companyId, token, cinodeCandidateId, candidate)),
        ...(await addMatchNote(config.companyId, token, cinodeCandidateId, candidate, request)),
      ];

      results.push({
        localId: candidateId(candidate),
        name: candidate.name,
        cinodeCandidateId,
        warnings,
      });
    }

    return json(req, { exported: results.length, results });
  } catch (error) {
    console.error("export-to-cinode error:", error);
    return json(req, { error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
