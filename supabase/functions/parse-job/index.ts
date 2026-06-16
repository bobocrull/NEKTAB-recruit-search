import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { enforceRequestSecurity, json, preflight } from "../_shared/security.ts";

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(cleanString).filter(Boolean).slice(0, 20)
    : [];
}

function normalizeRequirements(raw: unknown) {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const seniority = cleanString(value.seniorityLevel).toLowerCase();
  const allowed = new Set(["junior", "mid", "senior", "lead", "principal"]);

  return {
    seniorityLevel: allowed.has(seniority) ? seniority : "mid",
    yearsOfExperience: typeof value.yearsOfExperience === "number" ? value.yearsOfExperience : null,
    keySkills: cleanList(value.keySkills),
    industries: cleanList(value.industries),
    jobTitles: cleanList(value.jobTitles),
    targetCompanies: cleanList(value.targetCompanies),
    location: cleanString(value.location) || null,
  };
}

function parseToolArguments(argumentsJson: string | undefined) {
  if (!argumentsJson) return null;
  try {
    return JSON.parse(argumentsJson);
  } catch (error) {
    console.error("Requirement JSON parse error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return preflight(req);
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const blocked = enforceRequestSecurity(req, "parse-job", { maxBytes: 140_000, limit: 20 });
  if (blocked) return blocked;

  try {
    const { jobDescription } = await req.json();
    if (!jobDescription || typeof jobDescription !== "string") {
      return json(req, { error: "jobDescription is required" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a recruitment analyst. Extract structured data from job descriptions. Always respond with valid JSON only, no markdown.`,
          },
          {
            role: "user",
            content: `Extract the following from this job description and return as JSON:
- seniorityLevel (string: "junior", "mid", "senior", "lead", or "principal")
- yearsOfExperience (number or null)
- keySkills (array of strings)
- industries (array of strings)
- jobTitles (array of relevant job titles to search for)
- targetCompanies (array of strings, if implied)
- location (string or null)

Job Description:
${jobDescription}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_requirements",
              description: "Extract structured job requirements from a job description",
              parameters: {
                type: "object",
                properties: {
                  seniorityLevel: { type: "string", enum: ["junior", "mid", "senior", "lead", "principal"] },
                  yearsOfExperience: { type: ["number", "null"] },
                  keySkills: { type: "array", items: { type: "string" } },
                  industries: { type: "array", items: { type: "string" } },
                  jobTitles: { type: "array", items: { type: "string" } },
                  targetCompanies: { type: "array", items: { type: "string" } },
                  location: { type: ["string", "null"] },
                },
                required: ["seniorityLevel", "keySkills", "industries", "jobTitles", "targetCompanies"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_requirements" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return json(req, { error: "Rate limit exceeded. Please try again in a moment." }, 429);
      }
      if (response.status === 402) {
        return json(req, { error: "AI credits exhausted. Please add funds." }, 402);
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return json(req, { error: "AI processing failed" }, 500);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return json(req, { error: "Failed to extract requirements" }, 500);
    }

    const parsed = parseToolArguments(toolCall.function.arguments);
    if (!parsed) return json(req, { error: "Failed to parse extracted requirements" }, 500);

    return json(req, normalizeRequirements(parsed));
  } catch (e) {
    console.error("parse-job error:", e);
    return json(req, { error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
