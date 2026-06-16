import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { enforceRequestSecurity, json, preflight } from "../_shared/security.ts";

type JobRequirements = {
  seniorityLevel?: string;
  yearsOfExperience?: number | null;
  keySkills?: string[];
  industries?: string[];
  jobTitles?: string[];
  targetCompanies?: string[];
  location?: string | null;
};

type SearchResult = {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
};

type Candidate = {
  id: string;
  name: string;
  currentRole: string;
  company: string;
  yearsOfExperience: number;
  skills: string[];
  location: string;
  source: string;
  email: string;
  phone: string;
  linkedin: string;
  summary?: string;
  sourceCategory?: string;
  networkSignals?: Array<{ label: string; reason: string; strength: "Stark" | "Medel" | "Svag" }>;
  evidenceSnippets?: string[];
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(cleanString).filter(Boolean).slice(0, 12)
    : [];
}

function normalizeRequirements(raw: unknown): JobRequirements {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return {
    seniorityLevel: cleanString(value.seniorityLevel) || "mid",
    yearsOfExperience: typeof value.yearsOfExperience === "number" ? value.yearsOfExperience : null,
    keySkills: cleanList(value.keySkills),
    industries: cleanList(value.industries),
    jobTitles: cleanList(value.jobTitles),
    targetCompanies: cleanList(value.targetCompanies),
    location: cleanString(value.location) || null,
  };
}

function quote(term: string): string {
  return `"${term.replace(/"/g, "")}"`;
}

function buildSearchQueries(requirements: JobRequirements, fallbackQuery: string): string[] {
  const titles = requirements.jobTitles?.length ? requirements.jobTitles : [fallbackQuery];
  const skills = (requirements.keySkills || []).slice(0, 4);
  const location = requirements.location ? quote(requirements.location) : "";
  const seniority = requirements.seniorityLevel && requirements.seniorityLevel !== "mid"
    ? quote(requirements.seniorityLevel)
    : "";

  const primaryTitle = quote(titles[0] || fallbackQuery);
  const skillPhrase = skills.map(quote).join(" ");
  const base = [primaryTitle, seniority, skillPhrase, location].filter(Boolean).join(" ");
  const altTitle = titles[1] ? quote(titles[1]) : primaryTitle;

  return [
    `site:linkedin.com/in ${base} -jobs -job -hiring -recruiter`,
    `site:rocketreach.co ${base} -jobs -job -hiring -recruiter`,
    `site:github.com ${altTitle} ${skills.slice(0, 2).map(quote).join(" ")} ${location} -jobs -hiring`,
    `site:patents.google.com ${primaryTitle} ${skills.slice(0, 2).map(quote).join(" ")} ${location}`,
    `site:researchgate.net ${primaryTitle} ${skills.slice(0, 2).map(quote).join(" ")} ${location}`,
    `site:stackoverflow.com/users ${primaryTitle} ${skills.slice(0, 2).map(quote).join(" ")} ${location}`,
    `site:theorg.com ${primaryTitle} ${skills.slice(0, 2).map(quote).join(" ")} ${location}`,
    `${primaryTitle} ${skillPhrase} ${location} "NEKTAB" OR "Svenska kraftnät" OR "Vattenfall" OR "Ellevio" -jobs -hiring`,
  ].map((q) => q.replace(/\s+/g, " ").trim());
}

function safeParseCandidates(argumentsJson: string | undefined): Candidate[] {
  if (!argumentsJson) return [];
  try {
    const parsed = JSON.parse(argumentsJson);
    return Array.isArray(parsed?.candidates) ? parsed.candidates : [];
  } catch (error) {
    console.error("Candidate JSON parse error:", error);
    return [];
  }
}

function normalizeLinkedIn(value: unknown, source: string): string {
  const raw = cleanString(value);
  const url = raw || (source.includes("linkedin.com/in/") ? source : "");
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url.replace(/^\/+/, "")}`;
}

function inferSourceCategory(source: string): string {
  const value = source.toLowerCase();
  if (value.includes("linkedin.com")) return "LinkedIn";
  if (value.includes("rocketreach.co")) return "RocketReach";
  if (value.includes("github.com")) return "GitHub";
  if (value.includes("patents.google.com")) return "Patent";
  if (value.includes("researchgate.net") || value.includes("scholar") || value.includes("publication")) return "Forskning";
  if (value.includes("theorg.com") || value.includes("crunchbase.com")) return "Katalog";
  return "Öppen webb";
}

function cleanNetworkSignals(value: unknown): Candidate["networkSignals"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => item && typeof item === "object" ? item as Record<string, unknown> : null)
    .filter(Boolean)
    .map((item) => ({
      label: cleanString(item?.label),
      reason: cleanString(item?.reason),
      strength: ["Stark", "Medel", "Svag"].includes(cleanString(item?.strength))
        ? cleanString(item?.strength) as "Stark" | "Medel" | "Svag"
        : "Svag",
    }))
    .filter((item) => item.label && item.reason)
    .slice(0, 5);
}

function normalizeCandidate(raw: Record<string, unknown>, index: number): Candidate | null {
  const source = cleanString(raw.source);
  const name = cleanString(raw.name);
  if (!name || /company|jobs|careers|recruit/i.test(name)) return null;

  const skills = cleanList(raw.skills);
  return {
    id: `web-${crypto.randomUUID?.() || `${Date.now()}-${index}`}`,
    name,
    currentRole: cleanString(raw.currentRole) || "Unknown role",
    company: cleanString(raw.company) || "Unknown company",
    yearsOfExperience: typeof raw.yearsOfExperience === "number" && raw.yearsOfExperience > 0
      ? Math.round(raw.yearsOfExperience)
      : 3,
    skills,
    location: cleanString(raw.location) || "Unknown",
    source: source || "Web",
    email: cleanString(raw.email) || "Not available",
    phone: cleanString(raw.phone) || "Not available",
    linkedin: normalizeLinkedIn(raw.linkedin, source),
    summary: cleanString(raw.summary),
    sourceCategory: cleanString(raw.sourceCategory) || inferSourceCategory(source),
    networkSignals: cleanNetworkSignals(raw.networkSignals),
    evidenceSnippets: cleanList(raw.evidenceSnippets).slice(0, 5),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight(req);
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const blocked = enforceRequestSecurity(req, "search-candidates", { maxBytes: 160_000, limit: 15 });
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const requirements = normalizeRequirements(body.requirements);
    const fallbackQuery = cleanString(body.query) || [
      ...(requirements.jobTitles || []).slice(0, 2),
      ...(requirements.keySkills || []).slice(0, 3),
      requirements.location,
    ].filter(Boolean).join(" ");

    if (!fallbackQuery && !requirements.jobTitles?.length && !requirements.keySkills?.length) {
      return json(req, { error: "requirements or query is required" }, 400);
    }

    const bypassCache = Boolean(body.bypassCache);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (supabaseUrl && supabaseServiceKey && !bypassCache) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: existingSearches } = await supabase
        .from("recruitment_searches")
        .select("id")
        .eq("title", fallbackQuery)
        .gt("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(1);
        
      if (existingSearches && existingSearches.length > 0) {
        console.log(`Using cached candidates from search ID: ${existingSearches[0].id}`);
        const { data: searchCandidates, error: scError } = await supabase
          .from("search_candidates")
          .select(`
            score,
            score_breakdown,
            matched_skills,
            missing_skills,
            skill_evidence,
            decision_summary,
            red_flags,
            recommendation,
            pipeline_status,
            feedback,
            candidates (
              id,
              name,
              current_role,
              company,
              years_of_experience,
              skills,
              location,
              linkedin_url,
              email,
              phone,
              avatar_url,
              profile_image_url,
              data_confidence
            )
          `)
          .eq("search_id", existingSearches[0].id);

        if (!scError && searchCandidates && searchCandidates.length > 0) {
          const mappedCandidates = searchCandidates.map((sc: any) => {
            const c = sc.candidates;
            if (!c) return null;
            return {
              id: c.id,
              name: c.name,
              currentRole: c.current_role,
              company: c.company,
              yearsOfExperience: Number(c.years_of_experience || 3),
              skills: c.skills || [],
              location: c.location || "Unknown",
              linkedin: c.linkedin_url || "",
              email: c.email || "Not available",
              phone: c.phone || "Not available",
              avatarUrl: c.avatar_url || "",
              profileImageUrl: c.profile_image_url || "",
              summary: sc.decision_summary || "",
              source: c.linkedin_url || "Web",
              sourceCategory: c.linkedin_url ? "LinkedIn" : "Öppen webb",
              evidenceSnippets: [],
              networkSignals: []
            };
          }).filter(Boolean);

          if (mappedCandidates.length > 0) {
            console.log(`Returning ${mappedCandidates.length} cached candidates`);
            return json(req, { candidates: mappedCandidates });
          }
        }
      }
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) return json(req, { error: "Firecrawl not configured" }, 500);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json(req, { error: "LOVABLE_API_KEY not configured" }, 500);

    const queries = buildSearchQueries(requirements, fallbackQuery);
    console.log("Candidate search queries:", queries);

    const searchResponses = await Promise.all(queries.map(async (query) => {
      const response = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit: 8,
          scrapeOptions: { formats: ["markdown"] },
        }),
      });

      if (!response.ok) {
        console.error("Firecrawl search error:", response.status, await response.text());
        return [];
      }

      const data = await response.json();
      return Array.isArray(data.data) ? data.data as SearchResult[] : [];
    }));

    const seenUrls = new Set<string>();
    const results = searchResponses
      .flat()
      .filter((result) => {
        const url = cleanString(result.url);
        if (!url || seenUrls.has(url)) return false;
        seenUrls.add(url);
        return true;
      })
      .slice(0, 18);

    if (results.length === 0) return json(req, { candidates: [] });

    const summaries = results
      .map((r, i) => `--- Result ${i + 1} ---
URL: ${r.url || ""}
Title: ${r.title || ""}
Description: ${r.description || ""}
Content:
${(r.markdown || "").slice(0, 1800)}`)
      .join("\n\n");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You extract real individual candidate profiles from web search results. Use only evidence in the results. Prefer LinkedIn, RocketReach, GitHub, Stack Overflow, patents, research/publication pages, company/team pages, and professional directory profile pages. Return tool output only.",
          },
          {
            role: "user",
            content: `Job requirements:
${JSON.stringify(requirements, null, 2)}

Extract candidate profiles from these search results.
Rules:
- Include only individual people, not company pages, job ads, schools, recruiters, agencies, or article authors unless the page is clearly their professional profile.
- RocketReach profile pages are valid candidate sources if they identify an individual person.
- Use the result URL as source.
- If a field is not available, use "Not available" for email/phone and "Unknown" for company/location.
- Skills should be concise technologies, tools, domains, or methods that are visible or strongly implied by the profile.
- yearsOfExperience should be an evidence-based estimate; use 3 only if no estimate is possible.
- sourceCategory must be one of LinkedIn, RocketReach, GitHub, Patent, Forskning, Bolagssida, Katalog, Öppen webb.
- evidenceSnippets should contain short exact or near-exact text fragments from the result that support the match.
- networkSignals should describe relevant company, industry, project, research, patent, or energy-sector connections separately from skills.
- summary should explain why this candidate may match the job in one sentence.

Search Results:
${summaries}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_candidates",
              description: "Extract structured individual candidate profiles from search results",
              parameters: {
                type: "object",
                properties: {
                  candidates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        currentRole: { type: "string" },
                        company: { type: "string" },
                        location: { type: "string" },
                        skills: { type: "array", items: { type: "string" } },
                        yearsOfExperience: { type: "number" },
                        source: { type: "string" },
                        email: { type: "string" },
                        phone: { type: "string" },
                        linkedin: { type: "string" },
                        summary: { type: "string" },
                        sourceCategory: { type: "string" },
                        evidenceSnippets: { type: "array", items: { type: "string" } },
                        networkSignals: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              label: { type: "string" },
                              reason: { type: "string" },
                              strength: { type: "string", enum: ["Stark", "Medel", "Svag"] },
                            },
                            required: ["label", "reason", "strength"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["name", "currentRole", "company", "location", "skills", "yearsOfExperience", "source", "email", "phone", "linkedin", "summary", "sourceCategory", "evidenceSnippets", "networkSignals"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["candidates"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_candidates" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status, await aiResponse.text());
      return json(req, { error: "AI processing failed", candidates: [] }, 200);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const candidates = safeParseCandidates(toolCall?.function?.arguments)
      .map((candidate, index) => normalizeCandidate(candidate as unknown as Record<string, unknown>, index))
      .filter(Boolean);

    console.log(`Found ${candidates.length} candidates`);
    return json(req, { candidates });
  } catch (e) {
    console.error("search-candidates error:", e);
    return json(req, { error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
