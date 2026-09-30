export default async function handler(req, res) {
  // Allow preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tavily-api-key, x-gemini-api-key');
    res.status(200).end();
    return;
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

    // 1. Check if Tavily API key is provided (in env or request header)
    const tavilyKey = process.env.TAVILY_API_KEY || req.headers['x-tavily-api-key'];
    if (tavilyKey && tavilyKey.trim()) {
      try {
        const reqs = req.body.requirements || {};
        const jobTitle = req.body.query || reqs.jobTitles?.[0] || "ingenjör";
        const skills = (reqs.keySkills || []).slice(0, 3).join(" ");
        const location = reqs.location || "Sverige";
        const searchQuery = `site:linkedin.com/in "${jobTitle}" ${skills} "${location}" -intitle:"jobs" -intitle:"hiring"`;

        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey.trim(),
            query: searchQuery,
            search_depth: "basic",
            max_results: 10
          })
        });

        if (!tavilyRes.ok) {
          const errData = await tavilyRes.json().catch(() => ({}));
          console.warn("Tavily error:", tavilyRes.status, errData);
          res.status(502).json({
            error: `Tavily API-fel (${tavilyRes.status}): ${errData.detail || errData.error || "Kontrollera din Tavily API-nyckel."}`,
            candidates: []
          });
          return;
        }

        const tData = await tavilyRes.json();
        if (tData.results && tData.results.length > 0) {
          const candidates = tData.results.map((r, index) => {
            const cleanTitle = (r.title || "")
              .replace(/\s*\|\s*LinkedIn.*$/i, "")
              .replace(/\s*-\s*LinkedIn.*$/i, "")
              .replace(/\s*–\s*LinkedIn.*$/i, "");
            const parts = cleanTitle.split(/\s+[-–|]\s+/);
            const name = parts[0]?.trim() || "LinkedIn-kandidat";
            const role = parts[1]?.trim() || jobTitle;
            const company = parts[2]?.trim() || "LinkedIn";

            const contentText = r.content || "";
            const foundSkills = (reqs.keySkills || []).filter(skill => 
              contentText.toLowerCase().includes(skill.toLowerCase()) ||
              cleanTitle.toLowerCase().includes(skill.toLowerCase())
            );
            const candidateSkills = foundSkills.length > 0 ? foundSkills : (reqs.keySkills || []).slice(0, 5);

            return {
              id: `web-tavily-${Date.now()}-${index}`,
              name,
              currentRole: role,
              current_role: role,
              company,
              yearsOfExperience: reqs.yearsOfExperience || 3,
              years_of_experience: reqs.yearsOfExperience || 3,
              skills: candidateSkills,
              location: reqs.location || location,
              linkedin: r.url,
              linkedin_url: r.url,
              email: "Not available",
              phone: "Not available",
              avatarUrl: "",
              profileImageUrl: "",
              summary: contentText,
              source: r.url,
              sourceCategory: "LinkedIn",
              evidenceSnippets: [],
              networkSignals: []
            };
          });

          res.status(200).json({ candidates });
          return;
        } else {
          res.status(200).json({ candidates: [] });
          return;
        }
      } catch (tavilyErr) {
        console.warn("Tavily search error:", tavilyErr.message);
        res.status(502).json({
          error: `Kunde inte ansluta till Tavily: ${tavilyErr.message}`,
          candidates: []
        });
        return;
      }
    }

    // 2. Fallback to Lovable Edge Function proxy
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
      res.status(502).json({ error: `Extern söktjänst fel (${response.status}): ${errText}`, candidates: [] });
      return;
    }

    const data = await response.json();

    // Check if the edge function reported AI gateway failure
    if (data.error || !data.candidates || data.candidates.length === 0) {
      res.status(502).json({
        error: data.error === "AI processing failed"
          ? "Lovables externa AI-gateway har upphört. Lägg till en gratis Tavily API-nyckel i inställningarna eller i Vercel för att aktivera automatisk webbsökning."
          : (data.error || "Inga kandidater hittades via extern sökning."),
        candidates: []
      });
      return;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Vercel proxy/security error:", error);
    res.status(500).json({ error: error.message });
  }
}
