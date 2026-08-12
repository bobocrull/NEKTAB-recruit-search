import { checkBotId } from 'botid/server';

const SEARX_INSTANCES = [
  "https://searxng.ch",
  "https://priv.au",
  "https://northboot.xyz",
  "https://searx.work",
  "https://search.ononoki.org"
];

function buildSearchQueries(requirements, fallbackQuery) {
  const titles = requirements?.jobTitles?.length ? requirements.jobTitles : [fallbackQuery];
  const skills = (requirements?.keySkills || []).slice(0, 4);
  const location = requirements?.location ? requirements.location : "";
  const seniority = requirements?.seniorityLevel && requirements.seniorityLevel !== "mid" ? requirements.seniorityLevel : "";

  const primaryTitle = titles[0] || fallbackQuery;
  const skillPhrase = skills.map(s => `"${s.replace(/"/g, '')}"`).join(" ");
  const base = [primaryTitle ? `"${primaryTitle.replace(/"/g, '')}"` : "", seniority, skillPhrase, location ? `"${location.replace(/"/g, '')}"` : ""].filter(Boolean).join(" ");
  const altTitle = titles[1] ? `"${titles[1].replace(/"/g, '')}"` : (primaryTitle ? `"${primaryTitle.replace(/"/g, '')}"` : "");

  return [
    `site:linkedin.com/in ${base} -jobs -job -hiring -recruiter`,
    `site:rocketreach.co ${base} -jobs -job -hiring -recruiter`,
    `site:github.com ${altTitle} ${skills.slice(0, 2).map(s => `"${s.replace(/"/g, '')}"`).join(" ")} ${location ? `"${location.replace(/"/g, '')}"` : ""} -jobs -hiring`,
    `site:researchgate.net ${primaryTitle ? `"${primaryTitle.replace(/"/g, '')}"` : ""} ${skills.slice(0, 2).map(s => `"${s.replace(/"/g, '')}"`).join(" ")}`,
    `site:stackoverflow.com/users ${primaryTitle ? `"${primaryTitle.replace(/"/g, '')}"` : ""} ${skills.slice(0, 2).map(s => `"${s.replace(/"/g, '')}"`).join(" ")}`
  ].map((q) => q.replace(/\s+/g, " ").trim());
}

async function searchSearx(query) {
  for (const instance of SEARX_INSTANCES) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          console.log(`SearXNG success using instance: ${instance}`);
          return data.results.map(r => ({
            url: r.url,
            title: r.title,
            snippet: r.content
          }));
        }
      }
    } catch (e) {
      console.warn(`SearXNG instance ${instance} failed:`, e.message);
    }
  }
  return [];
}

async function searchWebFree(query) {
  // 1. Tavily Search API
  if (process.env.TAVILY_API_KEY) {
    try {
      console.log("Searching via Tavily...");
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: query,
          search_depth: "basic",
          max_results: 8
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results) {
          return data.results.map(r => ({
            url: r.url,
            title: r.title,
            snippet: r.content
          }));
        }
      }
    } catch (e) {
      console.error("Tavily search failed, falling back:", e.message);
    }
  }

  // 2. Google Custom Search
  if (process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_CX) {
    try {
      console.log("Searching via Google Custom Search...");
      const url = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CSE_KEY}&cx=${process.env.GOOGLE_CSE_CX}&q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.items) {
          return data.items.map(item => ({
            url: item.link,
            title: item.title,
            snippet: item.snippet
          }));
        }
      }
    } catch (e) {
      console.error("Google Custom Search failed, falling back:", e.message);
    }
  }

  // 3. SearXNG Fallback
  return await searchSearx(query);
}

async function extractCandidatesFree(requirements, summaries) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  console.log("Extracting candidates via native Gemini API...");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You extract real individual candidate profiles from web search results. Use only evidence in the results. Prefer LinkedIn, RocketReach, GitHub, Stack Overflow, patents, research/publication pages, company/team pages, and professional directory profile pages.\n\nJob requirements:\n${JSON.stringify(requirements, null, 2)}\n\nSearch Results:\n${summaries}`
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            candidates: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  currentRole: { type: "STRING" },
                  company: { type: "STRING" },
                  location: { type: "STRING" },
                  skills: { type: "ARRAY", items: { type: "STRING" } },
                  yearsOfExperience: { type: "NUMBER" },
                  source: { type: "STRING" },
                  email: { type: "STRING" },
                  phone: { type: "STRING" },
                  linkedin: { type: "STRING" },
                  summary: { type: "STRING" },
                  sourceCategory: { type: "STRING" }
                },
                required: [
                  "name",
                  "currentRole",
                  "company",
                  "location",
                  "skills",
                  "yearsOfExperience",
                  "source",
                  "email",
                  "phone",
                  "linkedin",
                  "summary",
                  "sourceCategory"
                ]
              }
            }
          },
          required: ["candidates"]
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API failed with status ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty response from Gemini API");
  }

  const parsed = JSON.parse(text);
  return Array.isArray(parsed.candidates) ? parsed.candidates : [];
}

function inferSourceCategory(source) {
  const value = (source || "").toLowerCase();
  if (value.includes("linkedin.com")) return "LinkedIn";
  if (value.includes("rocketreach.co")) return "RocketReach";
  if (value.includes("github.com")) return "GitHub";
  if (value.includes("patents.google.com")) return "Patent";
  if (value.includes("researchgate.net")) return "Forskning";
  return "Öppen webb";
}

function normalizeCandidate(raw, index) {
  const name = raw.name || "";
  if (!name || /company|jobs|careers|recruit/i.test(name)) return null;

  return {
    id: `web-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
    name,
    current_role: raw.currentRole || "Unknown role",
    company: raw.company || "Unknown company",
    years_of_experience: typeof raw.yearsOfExperience === "number" && raw.yearsOfExperience > 0
      ? Math.round(raw.yearsOfExperience)
      : 3,
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    location: raw.location || "Unknown",
    linkedin_url: raw.linkedin || (raw.source && raw.source.includes("linkedin.com/in/") ? raw.source : ""),
    email: raw.email || "Not available",
    phone: raw.phone || "Not available",
    avatar_url: "",
    profile_image_url: "",
    summary: raw.summary || "",
    source: raw.source || "Web",
    sourceCategory: raw.sourceCategory || inferSourceCategory(raw.source),
    evidenceSnippets: [],
    networkSignals: []
  };
}

export default async function handler(req, res) {
  // Allow preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
    return;
  }

  // Verify challenge using Vercel BotID
  try {
    const { isBot } = await checkBotId();
    if (isBot) {
      res.status(403).json({ error: 'Access Denied: Bot detected' });
      return;
    }
  } catch (botError) {
    console.error("BotID check failed:", botError.message);
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
    return;
  }
  const token = authHeader.split(' ')[1];

  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://ylfqngrejmqlhuutekgn.supabase.co";
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsZnFuZ3Jlam1xbGh1dXRla2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDcwNjMsImV4cCI6MjA5NzE4MzA2M30.OU5B_IqjaAgEswJHFel8XfD5BY29U1vAHVHXM_Cb3tA";

  try {
    // Validate JWT token with Supabase Auth service
    const verifyRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${token}`
      }
    });

    if (!verifyRes.ok) {
      res.status(401).json({ error: 'Unauthorized: Invalid token session' });
      return;
    }

    // IF GEMINI API KEY is present, execute the free pipeline
    if (process.env.GEMINI_API_KEY) {
      console.log("Gemini API key detected. Running automated free pipeline...");
      const body = req.body;
      const requirements = body.requirements;
      const fallbackQuery = body.query || "";

      const queries = buildSearchQueries(requirements, fallbackQuery);
      console.log("Free sourcing queries:", queries);

      // Execute search queries in parallel
      const searchResponses = await Promise.all(queries.map(async (q) => {
        try {
          return await searchWebFree(q);
        } catch (e) {
          console.error(`Search query failed for: ${q}`, e.message);
          return [];
        }
      }));

      // Deduplicate results by URL
      const seenUrls = new Set();
      const results = searchResponses
        .flat()
        .filter((r) => {
          const url = r.url?.trim();
          if (!url || seenUrls.has(url)) return false;
          seenUrls.add(url);
          return true;
        })
        .slice(0, 18);

      if (results.length === 0) {
        res.status(200).json({ candidates: [] });
        return;
      }

      const summaries = results
        .map((r, i) => `--- Result ${i + 1} ---
URL: ${r.url || ""}
Title: ${r.title || ""}
Snippet: ${r.snippet || ""}`)
        .join("\n\n");

      const extracted = await extractCandidatesFree(requirements, summaries);
      const candidates = extracted
        .map((candidate, index) => normalizeCandidate(candidate, index))
        .filter(Boolean);

      console.log(`Successfully extracted ${candidates.length} candidates via Gemini API.`);
      res.status(200).json({ candidates });
      return;
    }

    // Otherwise, fall back to the original Lovable Edge Function (original proxy flow)
    console.log("No GEMINI_API_KEY set. Falling back to Lovable proxy...");
    const oldUrl = "https://bqfksdoevseeknyiglur.supabase.co/functions/v1/search-candidates";
    const oldAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZmtzZG9ldnNlZWtueWlnbHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDQ0NDEsImV4cCI6MjA5MDQ4MDQ0MX0.40mAdlNjKTp5ydyYvR6icObQENOosKM26dKyplzxkWA";

    const response = await fetch(oldUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": oldAnonKey,
        "Authorization": `Bearer ${oldAnonKey}`
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({ error: `Edge function failed: ${errText}` });
      return;
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Vercel proxy/security error:", error);
    res.status(500).json({ error: error.message });
  }
}
