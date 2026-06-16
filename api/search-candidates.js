export default async function handler(req, res) {
  // Allow preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
