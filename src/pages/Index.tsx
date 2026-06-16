import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandidateCard } from "@/components/CandidateCard";
import { JobRequirementsPanel } from "@/components/JobRequirementsPanel";
import { CandidateFilters, CandidateFiltersState } from "@/components/CandidateFilters";
import { rankCandidates, JobRequirements, ScoredCandidate } from "@/lib/matchingLogic";
import { applyFilters } from "@/lib/candidateFilters";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

const supabase = supabaseClient as any;
import { Search, Loader2, AlertCircle, Download, BookmarkPlus, BookmarkCheck, Trash2, ShieldCheck, ExternalLink, Save, History, FileText, Lock, Mail as MailIcon, LogOut, Check, ArrowRight, User, Plus, Upload, X, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";

const QUICK_PROFILE_SUGGESTIONS = [
  "Senior kraftledningsprojektör",
  "Beredare elnät",
  "CAD kraftledning",
  "Luftledning över 40 kV",
  "Stolpplacering",
  "Stationsprojektör",
];

type PipelineStatus = "Ny" | "Intressant" | "Kontakta" | "Avvakta" | "Ej relevant" | "Skickad till Cinode";
type FeedbackTag = "Relevant" | "Inte relevant" | "Fel bransch" | "För junior" | "Fel geografi" | "Saknar nyckelkompetens";

interface ManagerProfile {
  mustHave: string;
  niceToHave: string;
  disqualifiers: string;
  geography: string;
  seniority: string;
  engagement: string;
}

interface SourcingLogEntry {
  id: string;
  candidateId: string;
  candidateName: string;
  action: string;
  timestamp: string;
}

interface RoleTemplate {
  id: string;
  name: string;
  jobDescription: string;
  managerProfile: ManagerProfile;
}

interface SearchHistoryEntry {
  id: string;
  title: string;
  candidateCount: number;
  createdAt: string;
  jobDescription: string;
  managerProfile: ManagerProfile;
}

// LocalStorage helpers for 0 API Cost fallback
function readLocalCandidates(): any[] {
  try {
    const stored = localStorage.getItem("nektab-local-candidates");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalCandidates(candidates: any[]) {
  localStorage.setItem("nektab-local-candidates", JSON.stringify(candidates.slice(0, 1000)));
}

function readLocalShortlist(): ScoredCandidate[] {
  try {
    const stored = localStorage.getItem("nektab-local-shortlist");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalShortlist(candidates: ScoredCandidate[]) {
  localStorage.setItem("nektab-local-shortlist", JSON.stringify(candidates.slice(0, 100)));
}

function readLocalHistory(): SearchHistoryEntry[] {
  try {
    const stored = localStorage.getItem("nektab-local-search-history");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalHistory(history: SearchHistoryEntry[]) {
  localStorage.setItem("nektab-local-search-history", JSON.stringify(history.slice(0, 15)));
}

function profileText(profile: ManagerProfile): string {
  return [
    profile.mustHave && `Måste ha: ${profile.mustHave}`,
    profile.niceToHave && `Meriterande: ${profile.niceToHave}`,
    profile.disqualifiers && `Diskvalificerande: ${profile.disqualifiers}`,
    profile.geography && `Geografi: ${profile.geography}`,
    profile.seniority && `Senioritet: ${profile.seniority}`,
    profile.engagement && `Upplägg: ${profile.engagement}`,
  ].filter(Boolean).join("\n");
}

function searchTitleFromText(text: string): string {
  const firstUsefulLine = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-#*\s]+/, "").trim())
    .find((line) => line.length > 3);
  return (firstUsefulLine || "Namnlös sökning").slice(0, 72);
}

function cleanRequirementValue(value: string) {
  return value
    .replace(/\uFFFD/g, "")
    .replace(/\s+(på|till|och|eller|med|inom)$/i, "")
    .replace(/^(på|till|och|eller|med|inom)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanRequirementList(values: unknown): string[] {
  const stopWords = new Set(["på", "till", "och", "eller", "med", "inom", "från", "for", "of", "and"]);
  const list = Array.isArray(values) ? values : [];
  return Array.from(
    new Set(
      list
        .filter((item): item is string => typeof item === "string")
        .map(cleanRequirementValue)
        .filter((item) => item.length > 1 && !stopWords.has(item.toLowerCase()))
    )
  );
}

function cleanJobRequirements(requirements: JobRequirements): JobRequirements {
  return {
    ...requirements,
    keySkills: cleanRequirementList(requirements.keySkills),
    industries: cleanRequirementList(requirements.industries),
    jobTitles: cleanRequirementList(requirements.jobTitles),
    targetCompanies: cleanRequirementList(requirements.targetCompanies),
    location: requirements.location ? cleanRequirementValue(requirements.location) || null : null,
  };
}

// Rule-based requirement parser that runs 100% locally in the browser with 0 API costs
function parseJobDescriptionLocally(text: string): JobRequirements {
  const lowerText = text.toLowerCase();
  
  // 1. Seniority Level
  let seniorityLevel = "mid";
  if (/\bsenior\b|\blead\b|\bchef\b|\bansvarig\b/i.test(lowerText)) {
    seniorityLevel = "senior";
  } else if (/\bprincipal\b|\bexpert\b/i.test(lowerText)) {
    seniorityLevel = "principal";
  } else if (/\bjunior\b|\btrainee\b|\bnyutexaminerad\b/i.test(lowerText)) {
    seniorityLevel = "junior";
  }

  // 2. Years of Experience
  let yearsOfExperience: number | null = null;
  const yoeRegex = /(\d+)\s*(?:-|–|till)\s*(\d+)\s*(?:års?|years?)\s*erfarenhet/i;
  const yoeRegexSingle = /(?:minst|at least|erfarenhet på|kräver)\s*(\d+)\s*(?:års?|years?)/i;
  const matchRange = lowerText.match(yoeRegex);
  if (matchRange) {
    yearsOfExperience = Number(matchRange[1]);
  } else {
    const matchSingle = lowerText.match(yoeRegexSingle);
    if (matchSingle) {
      yearsOfExperience = Number(matchSingle[1]);
    }
  }
  if (yearsOfExperience === null) {
    if (seniorityLevel === "senior") yearsOfExperience = 5;
    else if (seniorityLevel === "principal") yearsOfExperience = 8;
    else if (seniorityLevel === "junior") yearsOfExperience = 1;
    else yearsOfExperience = 3;
  }

  // 3. Key Skills dictionary matching
  const SKILL_DICTIONARY = [
    "CAD", "AutoCAD", "MicroStation", "Luftledning", "Stolpplacering", "Elnät", "Elkraft", "Högspänning",
    "Ställverk", "Transformator", "GIS", "Markåtkomst", "Tillstånd", "Projektledning", "Beredning", 
    "Beredare", "Stationsprojektering", "Kabel", "Kabelprojektering", "Kraftledning", "Transmission", 
    "Distribution", "Mellanspänning", "Lågspänning", "Projektör", "CAD-ritare"
  ];
  const keySkills: string[] = [];
  SKILL_DICTIONARY.forEach(skill => {
    const regex = new RegExp(`\\b${skill.toLowerCase()}\\w*\\b`, 'i');
    if (regex.test(lowerText)) {
      keySkills.push(skill);
    }
  });

  // 4. Job Titles matching
  const TITLE_DICTIONARY = [
    "Kraftledningsprojektör", "Elkraftingenjör", "CAD-konstruktör", "Beredare", "Stationsprojektör", 
    "Projektledare elnät", "Elnätsingenjör", "GIS-ingenjör", "Tillståndshandläggare", "Markförhandlare"
  ];
  const jobTitles: string[] = [];
  TITLE_DICTIONARY.forEach(title => {
    const regex = new RegExp(`\\b${title.toLowerCase()}\\w*\\b`, 'i');
    if (regex.test(lowerText)) {
      jobTitles.push(title);
    }
  });
  if (jobTitles.length === 0) {
    const titleMatch = text.split(/\r?\n/)[0]?.replace(/^Titel:\s*/i, "").trim();
    if (titleMatch && titleMatch.length > 3 && titleMatch.length < 50) {
      jobTitles.push(titleMatch);
    } else {
      jobTitles.push("Projektör");
    }
  }

  // 5. Industries
  const industries: string[] = [];
  if (/elnät|elkraft|energi/i.test(lowerText)) industries.push("Elnät & Elkraft");
  if (/infrastruktur/i.test(lowerText)) industries.push("Infrastruktur");
  if (/konsult/i.test(lowerText)) industries.push("Teknisk konsultverksamhet");

  // 6. Target Companies
  const targetCompanies: string[] = [];
  if (/vattenfall/i.test(lowerText)) targetCompanies.push("Vattenfall");
  if (/ellevio/i.test(lowerText)) targetCompanies.push("Ellevio");
  if (/svenska kraftnät/i.test(lowerText)) targetCompanies.push("Svenska kraftnät");
  if (/sweco/i.test(lowerText)) targetCompanies.push("Sweco");
  if (/rejlers/i.test(lowerText)) targetCompanies.push("Rejlers");

  // 7. Location
  let location: string | null = null;
  const locations = ["Stockholm", "Göteborg", "Malmö", "Sundsvall", "Västerås", "Örebro", "Uppsala", "Linköping"];
  for (const loc of locations) {
    if (new RegExp(`\\b${loc}\\b`, 'i').test(lowerText)) {
      location = loc;
      break;
    }
  }
  if (!location) location = "Sverige";

  return {
    seniorityLevel,
    yearsOfExperience,
    keySkills,
    industries,
    jobTitles,
    targetCompanies,
    location
  };
}

function candidateKey(candidate: Record<string, unknown>): string {
  const clean = (value: unknown) => (typeof value === "string" ? value.toLowerCase().replace(/\s+/g, " ").trim() : "");
  const linkedin = clean(candidate.linkedin).replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  const name = clean(candidate.name);
  const company = clean(candidate.company);
  const role = clean(candidate.currentRole);
  return linkedin || [name, company].filter(Boolean).join("|") || [name, role].filter(Boolean).join("|") || name;
}

function candidateId(candidate: ScoredCandidate): string {
  return String(candidate.id);
}

async function getFunctionErrorMessage(err: unknown): Promise<string> {
  if (err instanceof Response) {
    try {
      const data = await err.json();
      return data.error || data.message || `Felkod: ${err.status}`;
    } catch {
      try {
        const text = await err.text();
        return text || `Felkod: ${err.status}`;
      } catch {
        return `Serverfel: ${err.status}`;
      }
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err || "Ett okänt fel uppstod");
}

function buildQuickJobDescription(keyword: string): string {
  if (!keyword.trim()) return "";
  
  const kw = keyword.toLowerCase();
  let roleTitle = keyword;
  let skills = "Elnätsdesign, CAD, Projektering";
  let tasks = "Konstruktion och projektering av elnät.";
  
  if (kw.includes("kraftledning") || kw.includes("luftledning")) {
    roleTitle = keyword.includes("Senior") ? "Senior Kraftledningsprojektör" : "Kraftledningsprojektör";
    skills = "Luftledning, Stolpplacering, CAD, MicroStation, Högspänning, Geografi, Markåtkomst";
    tasks = "Konstruktion av luftledningar (över 40kV), stolpplacering samt tillståndshantering.";
  } else if (kw.includes("beredare") || kw.includes("beredning")) {
    roleTitle = "Beredare Elnät";
    skills = "Beredning, Markägarkontakter, Markåtkomst, EBR, Kalkylering, Kabelförläggning";
    tasks = "Projektering, EBR-kalkylering och markägarkontakter för distributionsnät.";
  } else if (kw.includes("cad")) {
    roleTitle = "CAD-konstruktör Elkraft";
    skills = "CAD, AutoCAD, MicroStation, Elkraft, Konstruktion, Dokumentation";
    tasks = "Skapa ritningar, layouter och teknisk dokumentation för elnätsprojekt.";
  } else if (kw.includes("station") || kw.includes("ställverk")) {
    roleTitle = "Stationsprojektör / Ställverkskonstruktör";
    skills = "Stationsprojektering, Ställverk, Transformator, Primärkonstruktion, Sekundärkonstruktion";
    tasks = "Projektering och konstruktion av ställverk och transformatorstationer.";
  } else if (kw.includes("projektledare")) {
    roleTitle = "Projektledare Elnät";
    skills = "Projektledning, Elnät, Entreprenad, ÄTA, EBR, Projektstyrning";
    tasks = "Leda elnätsprojekt från förstudie till driftsättning och besiktning.";
  }
  
  return `Titel: ${roleTitle}

Vi söker nu en ${roleTitle} för att stärka vårt team inom elnät och elkraft.

Nyckelkompetenser:
- ${skills}
- Erfarenhet av liknande roller inom energisektorn
- Relevant ingenjörsutbildning eller motsvarande arbetslivserfarenhet

Huvudsakliga arbetsuppgifter:
- ${tasks}
- Samarbete med interna konsulter, kunder och markägare
- Framtagning av tekniska underlag, ritningar och kalkyler`;
}

function downloadCandidatesCsv(
  candidates: ScoredCandidate[],
  pipeline: Record<string, string>,
  feedback: Record<string, string>,
  notes: Record<string, string>
) {
  const headers = [
    "Namn",
    "Nuvarande roll",
    "Företag",
    "Erfarenhet (år)",
    "Plats",
    "E-post",
    "Telefon",
    "LinkedIn-profil",
    "Matchpoäng",
    "Status",
    "Feedback",
    "Kommentarer"
  ];

  const rows = candidates.map(c => {
    const statusVal = pipeline[c.id] || "Ny";
    const feedbackVal = feedback[c.id] || "";
    const noteVal = notes[c.id] || "";
    return [
      c.name,
      c.currentRole,
      c.company,
      c.yearsOfExperience,
      c.location,
      c.email,
      c.phone,
      c.linkedin,
      c.score,
      statusVal,
      feedbackVal,
      noteVal.replace(/\n/g, " ")
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(val => {
      const cell = val === undefined || val === null ? "" : String(val);
      if (cell.includes(",") || cell.includes("\"") || cell.includes("\n")) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(","))
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `NEKTAB_kandidater_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authLoading, setAuthLoading] = useState(false);
  const [fullName, setFullName] = useState("");

  const [quickProfile, setQuickProfile] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [requirements, setRequirements] = useState<JobRequirements | null>(null);
  const [webResults, setWebResults] = useState<ScoredCandidate[]>([]);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CandidateFiltersState>({
    minScore: 0,
    location: "",
    requiredSkills: [],
    sortBy: "score",
    viewMode: "cards",
  });
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [shortlist, setShortlist] = useState<ScoredCandidate[]>(readLocalShortlist);
  const [showShortlistOnly, setShowShortlistOnly] = useState(false);
  const [searchProgress, setSearchProgress] = useState({ completed: 0, total: 0, queries: [] as string[] });
  
  const [pipelineByCandidate, setPipelineByCandidate] = useState<Record<string, PipelineStatus>>({});
  const [feedbackByCandidate, setFeedbackByCandidate] = useState<Record<string, FeedbackTag>>({});
  const [notesByCandidate, setNotesByCandidate] = useState<Record<string, string>>({});
  const [savingStatus, setSavingStatus] = useState<Record<string, "idle" | "saving" | "saved">>({});

  const [sourcingLog, setSourcingLog] = useState<SourcingLogEntry[]>([]);
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>(readLocalHistory);
  const [templateName, setTemplateName] = useState("");
  const [managerProfile, setManagerProfile] = useState<ManagerProfile>({
    mustHave: "",
    niceToHave: "",
    disqualifiers: "",
    geography: "",
    seniority: "",
    engagement: "",
  });

  // Manual Candidate Creation Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCandName, setNewCandName] = useState("");
  const [newCandRole, setNewCandRole] = useState("");
  const [newCandCompany, setNewCandCompany] = useState("");
  const [newCandLocation, setNewCandLocation] = useState("");
  const [newCandSkills, setNewCandSkills] = useState("");
  const [newCandYoe, setNewCandYoe] = useState("");
  const [newCandLinkedin, setNewCandLinkedin] = useState("");
  const [newCandEmail, setNewCandEmail] = useState("");
  const [newCandPhone, setNewCandPhone] = useState("");

  const { toast } = useToast();

  const [recruiterName, setRecruiterName] = useState(localStorage.getItem("nektab-recruiter-name") || "");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [hoveredRequirementSkill, setHoveredRequirementSkill] = useState<string | null>(null);
  const [showDatabaseOnly, setShowDatabaseOnly] = useState(false);
  const [databaseCandidates, setDatabaseCandidates] = useState<ScoredCandidate[]>([]);
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(false);

  const fetchDatabaseCandidates = async (): Promise<ScoredCandidate[]> => {
    let rawCands: any[] = [];
    try {
      const { data, error } = await supabase
        .from("candidates")
        .select("*");
      
      if (!error && data) {
        rawCands = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          currentRole: c.current_role || "Unknown role",
          company: c.company || "Unknown company",
          yearsOfExperience: Number(c.years_of_experience || 3),
          skills: c.skills || [],
          location: c.location || "Sverige",
          linkedin: c.linkedin_url || "",
          email: c.email || "Not available",
          phone: c.phone || "Not available",
          avatarUrl: c.avatar_url || "",
          profileImageUrl: c.profile_image_url || "",
          summary: "",
          source: c.linkedin_url || "Intern databas",
          sourceCategory: "Intern databas" as any,
          evidenceSnippets: [],
          networkSignals: []
        }));
      } else {
        throw new Error("Supabase error or empty");
      }
    } catch (dbErr) {
      rawCands = readLocalCandidates();
    }

    const activeReqs = requirements || {
      seniorityLevel: "mid",
      yearsOfExperience: null,
      keySkills: [],
      industries: [],
      jobTitles: [],
      targetCompanies: [],
      location: null
    };

    return rankCandidates(rawCands, activeReqs);
  };

  const handleToggleDatabase = async () => {
    if (!showDatabaseOnly) {
      setIsLoadingDatabase(true);
      const cands = await fetchDatabaseCandidates();
      setDatabaseCandidates(cands);
      setShowDatabaseOnly(true);
      setShowShortlistOnly(false);
      setIsLoadingDatabase(false);
    } else {
      setShowDatabaseOnly(false);
    }
    setSelectedCandidateIds(new Set());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setJobDescription(text);
        toast({ title: "Annons inladdad", description: `Läste in ${file.name} framgångsrikt.` });
      }
    };
    reader.onerror = () => {
      toast({ title: "Filfel", description: "Det gick inte att läsa filen.", variant: "destructive" });
    };

    if (file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".rtf") || file.name.endsWith(".json") || file.type.startsWith("text/")) {
      reader.readAsText(file);
    } else {
      toast({
        title: "Filformat stöds ej direkt",
        description: "För PDF eller Word-dokument, vänligen klistra in texten manuellt för bästa resultat.",
        variant: "destructive"
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // 1. Session and auth listeners
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      toast({ title: "Fyll i alla fält", variant: "destructive" });
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        toast({ title: "Inloggad framgångsrikt!" });
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              full_name: fullName || "NEKTAB Manager",
            }
          }
        });
        if (error) throw error;
        toast({ title: "Registrerad! Logga in nu." });
      }
    } catch (err: any) {
      toast({ title: "Autentisering misslyckades", description: err.message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    toast({ title: "Du har loggat ut." });
  };

  // Sync Shortlist to localStorage
  useEffect(() => {
    saveLocalShortlist(shortlist);
  }, [shortlist]);

  // Load templates on mount (local storage)
  useEffect(() => {
    const storedTemplates = localStorage.getItem("nektab-local-templates");
    if (storedTemplates) setRoleTemplates(JSON.parse(storedTemplates));
  }, []);

  const candidatePool = showDatabaseOnly 
    ? databaseCandidates 
    : (showShortlistOnly ? shortlist : webResults);
  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    [...webResults, ...shortlist, ...databaseCandidates].forEach((c) => c.skills?.forEach((s: string) => skills.add(s)));
    return Array.from(skills).sort();
  }, [webResults, shortlist, databaseCandidates]);

  const filteredWebResults = useMemo(() => applyFilters(candidatePool, filters), [candidatePool, filters]);
  const selectedCandidates = useMemo(
    () => candidatePool.filter((candidate) => selectedCandidateIds.has(candidateId(candidate))),
    [candidatePool, selectedCandidateIds]
  );
  const allVisibleSelected =
    filteredWebResults.length > 0 && filteredWebResults.every((candidate) => selectedCandidateIds.has(candidateId(candidate)));
  const showSidePanel = Boolean(requirements || webResults.length > 0 || shortlist.length > 0 || showDatabaseOnly);
  const comparedCandidates = selectedCandidates.slice(0, 4);
  const enrichedJobDescription = [jobDescription, profileText(managerProfile)].filter(Boolean).join("\n\nChefens kravprofil\n");

  const addLog = (candidate: ScoredCandidate, action: string) => {
    const entry: SourcingLogEntry = {
      id: `${Date.now()}-${candidateId(candidate)}`,
      candidateId: candidateId(candidate),
      candidateName: candidate.name,
      action,
      timestamp: new Date().toLocaleString("sv-SE"),
    };
    setSourcingLog((current) => [entry, ...current].slice(0, 100));
  };

  const applySavedSearch = (item: Pick<RoleTemplate | SearchHistoryEntry, "jobDescription" | "managerProfile"> & { name?: string; title?: string }) => {
    setJobDescription(item.jobDescription);
    setManagerProfile(item.managerProfile);
    setQuickProfile(item.name || item.title || "");
    clearResults();
  };

  const clearResults = () => {
    setRequirements(null);
    setWebResults([]);
    setSearchError(null);
    setSelectedCandidateIds(new Set());
    setSearchProgress({ completed: 0, total: 0, queries: [] });
    setShowShortlistOnly(false);
  };

  const handleQuickProfile = () => {
    const draft = buildQuickJobDescription(quickProfile);
    if (!draft) {
      toast({ title: "Skriv in en titel eller kompetens först", variant: "destructive" });
      return;
    }
    setJobDescription(draft);
    clearResults();
  };

  // Call the original Edge function on bqfksdoevseeknyiglur to search the web for free (via Lovable's keys!)
  const fetchWebCandidatesFree = async (reqs: JobRequirements): Promise<any[]> => {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const oldUrl = isLocal 
      ? "https://bqfksdoevseeknyiglur.supabase.co/functions/v1/search-candidates"
      : "/api/search-candidates";
    const oldAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZmtzZG9ldnNlZWtueWlnbHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDQ0NDEsImV4cCI6MjA5MDQ4MDQ0MX0.40mAdlNjKTp5ydyYvR6icObQENOosKM26dKyplzxkWA";
    
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (isLocal) {
        headers["apikey"] = oldAnonKey;
        headers["Authorization"] = `Bearer ${oldAnonKey}`;
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }

      const res = await fetch(oldUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          requirements: reqs,
          query: reqs.jobTitles?.[0] || ""
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.candidates) {
          return data.candidates.map((c: any) => ({
            id: c.id,
            name: c.name,
            current_role: c.currentRole || c.current_role || "Kompetens inom elnät / elkraft",
            company: c.company || "Okänt bolag",
            years_of_experience: Number(c.yearsOfExperience || c.years_of_experience || 3),
            skills: c.skills || [],
            location: c.location || "Sverige",
            linkedin_url: c.linkedin || c.linkedin_url || "",
            email: c.email || "Not available",
            phone: c.phone || "Not available",
            avatar_url: c.avatarUrl || "",
            profile_image_url: c.profileImageUrl || "",
            summary: c.summary || "",
            source: c.source || "Web",
            sourceCategory: c.sourceCategory || (c.linkedin?.includes("linkedin.com") ? "LinkedIn" : "Öppen webb")
          }));
        }
      }
    } catch (err) {
      console.error("Free web search failed:", err);
    }
    
    return [];
  };

  // Save candidate from free web search into Supabase DB + local fallback
  const saveWebCandidateToDb = async (candidate: any) => {
    const linkedinUrl = candidate.linkedin || candidate.linkedin_url || "";
    const currentRole = candidate.currentRole || candidate.current_role || "Projektör";
    const yearsOfExperience = Number(candidate.yearsOfExperience || candidate.years_of_experience || 3);
    const canonicalKey = linkedinUrl || `web-manual-${candidate.name.replace(/\s+/g, "-").toLowerCase()}`;
    
    const newCandidateObj = {
      id: candidate.id,
      name: candidate.name,
      currentRole: currentRole,
      company: candidate.company,
      yearsOfExperience: yearsOfExperience,
      skills: candidate.skills || [],
      location: candidate.location,
      linkedin: linkedinUrl,
      email: candidate.email === "Klicka för att hämta" ? "Not available" : candidate.email,
      phone: candidate.phone === "Klicka för att hämta" ? "Not available" : candidate.phone,
      avatarUrl: "",
      profileImageUrl: "",
      summary: candidate.summary || "",
      source: linkedinUrl || "Web",
      sourceCategory: "Intern databas" as any,
      evidenceSnippets: [],
      networkSignals: []
    };

    const currentLocalCands = readLocalCandidates();
    const nextLocalCands = [newCandidateObj, ...currentLocalCands.filter(c => c.linkedin !== newCandidateObj.linkedin || c.name !== newCandidateObj.name)];
    saveLocalCandidates(nextLocalCands);

    let dbSuccess = false;
    try {
      const { error } = await supabase.from("candidates").upsert({
        canonical_key: canonicalKey,
        name: candidate.name,
        current_role: currentRole,
        company: candidate.company,
        years_of_experience: yearsOfExperience,
        skills: candidate.skills || [],
        location: candidate.location,
        linkedin_url: linkedinUrl || null,
        email: candidate.email === "Klicka för att hämta" ? null : candidate.email,
        phone: candidate.phone === "Klicka för att hämta" ? null : candidate.phone,
        data_confidence: { level: "Hög", score: 85, reasons: ["Hämtad från extern sökning"] } as any,
        last_seen_at: new Date().toISOString()
      }, { onConflict: "canonical_key" });
      
      if (!error) dbSuccess = true;
    } catch (e) {
      console.error(e);
    }

    toast({
      title: "Sparad!",
      description: `Kandidaten ${candidate.name} sparades lokalt${dbSuccess ? " och i databasen!" : "!"}`,
    });

    setWebResults(prev => prev.map(c => c.id === candidate.id ? { ...c, sourceCategory: "Intern databas" } : c));
  };

  // Zero-API-Cost combined local + client-side web search
  const searchRealCandidates = async (reqs: JobRequirements) => {
    setIsSearchingWeb(true);
    setSearchError(null);
    setSelectedCandidateIds(new Set());
    setSearchProgress({ completed: 0, total: 2, queries: ["Söker i lokala kandidatpoolen..."] });
    
    try {
      let candidates: any[] = [];
      
      // Try fetching candidates from Supabase DB first
      try {
        const { data, error } = await supabase
          .from("candidates")
          .select("*");

        if (!error && data) {
          candidates = data.map((c: any) => ({
            id: c.id,
            name: c.name,
            currentRole: c.current_role || "Unknown role",
            company: c.company || "Unknown company",
            yearsOfExperience: Number(c.years_of_experience || 3),
            skills: c.skills || [],
            location: c.location || "Sverige",
            linkedin: c.linkedin_url || "",
            email: c.email || "Not available",
            phone: c.phone || "Not available",
            avatarUrl: c.avatar_url || "",
            profileImageUrl: c.profile_image_url || "",
            summary: "",
            source: c.linkedin_url || "Intern databas",
            sourceCategory: "Intern databas" as any,
            evidenceSnippets: [],
            networkSignals: []
          }));
        } else {
          throw new Error("Supabase tables not initialized");
        }
      } catch (dbErr) {
        // Fallback to localStorage candidate pool (100% offline/local!)
        candidates = readLocalCandidates();
      }

      setSearchProgress(prev => ({ completed: 1, total: 2, queries: [...prev.queries, "Söker på LinkedIn & RocketReach (0 kr API)..."] }));
      
      // Search web candidates using free DuckDuckGo web sourcing
      let webCandidates: any[] = [];
      try {
        const foundWeb = await fetchWebCandidatesFree(reqs);
        webCandidates = foundWeb.map(c => ({
          id: c.id,
          name: c.name,
          currentRole: c.current_role,
          company: c.company,
          yearsOfExperience: c.years_of_experience,
          skills: c.skills,
          location: c.location,
          linkedin: c.linkedin_url,
          email: c.email,
          phone: c.phone,
          avatarUrl: c.avatar_url,
          profileImageUrl: c.profile_image_url,
          summary: c.summary,
          source: c.linkedin_url || "Web",
          sourceCategory: c.sourceCategory,
          evidenceSnippets: [],
          networkSignals: []
        }));
      } catch (webErr) {
        console.warn("Free web search failed, using local only", webErr);
      }

      // Merge local and web results
      const combinedCandidates = [...candidates, ...webCandidates];

      // Rank matching candidates relative to job requirements in browser
      const scored = rankCandidates(combinedCandidates, reqs);
      setWebResults(scored);
      setShowShortlistOnly(false);

      // Save search history
      const title = searchTitleFromText(jobDescription || quickProfile);
      const newHistoryEntry: SearchHistoryEntry = {
        id: `${Date.now()}`,
        title,
        candidateCount: scored.length,
        createdAt: new Date().toLocaleString("sv-SE"),
        jobDescription: jobDescription,
        managerProfile: managerProfile
      };

      const hist = readLocalHistory();
      const nextHist = [newHistoryEntry, ...hist.filter(h => h.title !== title)].slice(0, 10);
      saveLocalHistory(nextHist);
      setSearchHistory(nextHist);

      // Try saving search history record to Supabase DB
      try {
        await supabase.from("recruitment_searches").insert({
          title,
          job_description: enrichedJobDescription,
          manager_profile: managerProfile as any,
          parsed_requirements: reqs as any,
          role_category: managerProfile.engagement || null,
        });
      } catch (dbErr) {
        // Ignore DB save failure in offline mode
      }

      setSearchProgress({ completed: 2, total: 2, queries: ["Klar!"] });
      toast({
        title: `Matchning klar!`,
        description: `Genomsökte lokala poolen och webben. Hittade totalt ${scored.length} matchningar.`,
      });
    } catch (err: unknown) {
      console.error(err);
      const message = await getFunctionErrorMessage(err);
      setSearchError(message);
      toast({ title: "Sökningen misslyckades", description: message, variant: "destructive" });
    } finally {
      setIsSearchingWeb(false);
    }
  };

  const handleAnalyze = async () => {
    if (!enrichedJobDescription.trim()) {
      toast({ title: "Vänligen ange en arbetsbeskrivning", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    setRequirements(null);
    setWebResults([]);
    setSearchError(null);
    setSelectedCandidateIds(new Set());

    try {
      // 0 API Cost: Run job requirements extraction locally
      const reqs = cleanJobRequirements(parseJobDescriptionLocally(enrichedJobDescription));
      setRequirements(reqs);
      await searchRealCandidates(reqs);
    } catch (err: unknown) {
      console.error(err);
      toast({
        title: "Analysen misslyckades",
        description: "Ett internt fel uppstod vid tolkningen.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRequirementsChange = (nextRequirements: JobRequirements) => {
    setRequirements(cleanJobRequirements(nextRequirements));
    setSelectedCandidateIds(new Set());
  };

  const handleSearchWithRequirements = async (nextRequirements: JobRequirements) => {
    const cleanedRequirements = cleanJobRequirements(nextRequirements);
    setRequirements(cleanedRequirements);
    setSelectedCandidateIds(new Set());
    await searchRealCandidates(cleanedRequirements);
  };

  const handleCandidateSelection = (id: string, selected: boolean) => {
    setSelectedCandidateIds((current) => {
      const next = new Set(current);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectVisible = () => {
    setSelectedCandidateIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        filteredWebResults.forEach((candidate) => next.delete(candidateId(candidate)));
      } else {
        filteredWebResults.forEach((candidate) => next.add(candidateId(candidate)));
      }
      return next;
    });
  };

  const handleExportSelected = () => {
    if (selectedCandidates.length === 0) {
      toast({ title: "Välj minst en kandidat för export", variant: "destructive" });
      return;
    }
    downloadCandidatesCsv(selectedCandidates, pipelineByCandidate, feedbackByCandidate, notesByCandidate);
    toast({ title: `Exporterade ${selectedCandidates.length} kandidater` });
  };

  const handleSendSelectedToCinode = async () => {
    toast({ title: "Cinode-export är avstängd i noll-kostnadsläget" });
  };

  const handleSaveSelectedToShortlist = async () => {
    if (selectedCandidates.length === 0) {
      toast({ title: "Välj minst en kandidat till kortlistan", variant: "destructive" });
      return;
    }

    setShortlist((current) => {
      const byId = new Map(current.map((candidate) => [candidateId(candidate), candidate]));
      selectedCandidates.forEach((candidate) => byId.set(candidateId(candidate), candidate));
      return Array.from(byId.values());
    });

    selectedCandidates.forEach((candidate) => {
      setPipelineByCandidate(prev => ({ ...prev, [candidate.id]: "Intressant" as PipelineStatus }));
    });
    
    toast({ title: `Sparade ${selectedCandidates.length} kandidater i kortlistan` });
  };

  const handleClearShortlist = () => {
    setShortlist([]);
    setShowShortlistOnly(false);
    toast({ title: "Kortlistan är rensad" });
  };

  const handleEnrich = async (candidate: any) => {
    toast({
      title: "Kontaktuppgifter",
      description: `E-post och telefon för ${candidate.name} kan sökas manuellt via hens LinkedIn-profil: ${candidate.linkedin || "Ingen länk tillgänglig"}.`,
    });
  };

  const handlePipelineChange = async (id: string, status: PipelineStatus) => {
    setPipelineByCandidate((current) => ({ ...current, [id]: status }));
    setSavingStatus(prev => ({ ...prev, [id]: "saving" }));

    const candidate = [...webResults, ...shortlist].find((item) => candidateId(item) === id);
    if (candidate) addLog(candidate, `Pipeline ändrad till ${status}`);

    try {
      const { data: searchIdData } = await supabase
        .from("recruitment_searches")
        .select("id")
        .eq("title", searchTitleFromText(jobDescription || quickProfile))
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (searchIdData) {
        await supabase
          .from("search_candidates")
          .update({ pipeline_status: status as any })
          .eq("search_id", searchIdData.id)
          .eq("candidate_id", id);
      }
    } catch (e) {}
    
    setSavingStatus(prev => ({ ...prev, [id]: "saved" }));
    setTimeout(() => setSavingStatus(prev => ({ ...prev, [id]: "idle" })), 1000);
  };

  const handleFeedbackChange = async (id: string, feedback: FeedbackTag) => {
    setFeedbackByCandidate((current) => ({ ...current, [id]: feedback }));
    setSavingStatus(prev => ({ ...prev, [id]: "saving" }));

    const candidate = [...webResults, ...shortlist].find((item) => candidateId(item) === id);
    if (candidate) addLog(candidate, `Feedback: ${feedback}`);

    try {
      const { data: searchIdData } = await supabase
        .from("recruitment_searches")
        .select("id")
        .eq("title", searchTitleFromText(jobDescription || quickProfile))
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (searchIdData) {
        await supabase
          .from("search_candidates")
          .update({ feedback: feedback as any })
          .eq("search_id", searchIdData.id)
          .eq("candidate_id", id);
      }
    } catch (e) {}

    setSavingStatus(prev => ({ ...prev, [id]: "saved" }));
    setTimeout(() => setSavingStatus(prev => ({ ...prev, [id]: "idle" })), 1000);
  };

  const handleNoteChange = async (id: string, note: string) => {
    setNotesByCandidate((current) => ({ ...current, [id]: note }));
    setSavingStatus(prev => ({ ...prev, [id]: "saving" }));

    try {
      const { data: searchIdData } = await supabase
        .from("recruitment_searches")
        .select("id")
        .eq("title", searchTitleFromText(jobDescription || quickProfile))
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (searchIdData) {
        const { data: searchCand } = await supabase
          .from("search_candidates")
          .select("id")
          .eq("search_id", searchIdData.id)
          .eq("candidate_id", id)
          .single();

        if (searchCand) {
          await supabase
            .from("candidate_notes")
            .insert({
              search_candidate_id: searchCand.id,
              body: note,
            });
        }
      }
    } catch (e) {}

    setSavingStatus(prev => ({ ...prev, [id]: "saved" }));
    setTimeout(() => setSavingStatus(prev => ({ ...prev, [id]: "idle" })), 1000);
  };

  const handleCopyOutreach = async (candidate: ScoredCandidate) => {
    const message = `Hej ${candidate.name.split(" ")[0]},

Jag hittade din profil när vi på NEKTAB letade efter kompetens inom ${candidate.matchedSkills.slice(0, 3).join(", ") || candidate.currentRole}.

Din bakgrund som ${candidate.currentRole} på ${candidate.company} ser relevant ut för ett uppdrag hos oss. Vore du öppen för en kort kontakt för att höra mer?

Vänliga hälsningar,
${recruiterName || "NEKTAB"}`;

    await navigator.clipboard.writeText(message);
    addLog(candidate, "Kopierade LinkedIn-meddelande");
    toast({ title: "LinkedIn-meddelande kopierat" });
  };

  // Add Candidate to the local CSV/Database pool (Supabase + localStorage)
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandName.trim()) {
      toast({ title: "Namn krävs", variant: "destructive" });
      return;
    }

    const skillsArray = newCandSkills
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const canonicalKey = newCandLinkedin.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "") || 
      `${newCandName.toLowerCase().replace(/\s+/g, "").trim()}|${newCandCompany.toLowerCase().replace(/\s+/g, "").trim()}`;

    const newCandidateObj = {
      id: `local-${Date.now()}`,
      name: newCandName.trim(),
      currentRole: newCandRole.trim() || "Projektör",
      company: newCandCompany.trim() || "Okänt bolag",
      yearsOfExperience: newCandYoe ? Number(newCandYoe) : 3,
      skills: skillsArray,
      location: newCandLocation.trim() || "Sverige",
      linkedin: newCandLinkedin.trim() || "",
      email: newCandEmail.trim() || "Not available",
      phone: newCandPhone.trim() || "Not available",
      avatarUrl: "",
      profileImageUrl: "",
      summary: "",
      source: newCandLinkedin.trim() || "Manuell registrering",
      sourceCategory: "Intern databas" as any,
      evidenceSnippets: [],
      networkSignals: []
    };

    // Save to localStorage pool (always acts as cache)
    const currentLocalCands = readLocalCandidates();
    const nextLocalCands = [newCandidateObj, ...currentLocalCands.filter(c => c.linkedin !== newCandidateObj.linkedin || c.name !== newCandidateObj.name)];
    saveLocalCandidates(nextLocalCands);

    // Try saving to database
    let dbSuccess = false;
    try {
      const { error } = await supabase.from("candidates").upsert({
        canonical_key: canonicalKey,
        name: newCandName.trim(),
        current_role: newCandRole.trim() || "Projektör",
        company: newCandCompany.trim() || "Okänt bolag",
        years_of_experience: newCandYoe ? Number(newCandYoe) : 3,
        skills: skillsArray,
        location: newCandLocation.trim() || "Sverige",
        linkedin_url: newCandLinkedin.trim() || null,
        email: newCandEmail.trim() || null,
        phone: newCandPhone.trim() || null,
        data_confidence: { level: "Hög", score: 90, reasons: ["Manuell registrering"] } as any,
        last_seen_at: new Date().toISOString()
      }, { onConflict: "canonical_key" });
      if (!error) dbSuccess = true;
    } catch (e) {}

    toast({ title: `Kandidaten ${newCandName} sparades lokalt${dbSuccess ? " och i databasen!" : "!"}` });
    
    // Reset form
    setNewCandName("");
    setNewCandRole("");
    setNewCandCompany("");
    setNewCandLocation("");
    setNewCandSkills("");
    setNewCandYoe("");
    setNewCandLinkedin("");
    setNewCandEmail("");
    setNewCandPhone("");
    setShowAddForm(false);
    
    if (showDatabaseOnly) {
      const cands = await fetchDatabaseCandidates();
      setDatabaseCandidates(cands);
    } else if (requirements) {
      await searchRealCandidates(requirements);
    }
  };

  // CSV Bulk Import to Local pool & Supabase
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvText = event.target?.result as string;
        const lines = csvText.split(/\r?\n/).filter(Boolean);
        if (lines.length <= 1) {
          toast({ title: "CSV-filen är tom", variant: "destructive" });
          return;
        }

        const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
        const nameIdx = headers.indexOf("namn");
        const roleIdx = headers.indexOf("roll");
        const companyIdx = headers.indexOf("bolag");
        const skillsIdx = headers.indexOf("kompetenser");
        const yoeIdx = headers.indexOf("erfarenhet");
        const locIdx = headers.indexOf("plats");
        const linkedinIdx = headers.indexOf("linkedin");
        const emailIdx = headers.indexOf("e-post");
        const phoneIdx = headers.indexOf("telefon");

        if (nameIdx === -1) {
          toast({ title: "CSV saknar 'Namn'-kolumn", variant: "destructive" });
          return;
        }

        let count = 0;
        const currentLocal = readLocalCandidates();
        const importedList = [];

        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
          if (cells.length < headers.length) continue;

          const name = cells[nameIdx];
          if (!name) continue;

          const role = roleIdx !== -1 ? cells[roleIdx] : "Projektör";
          const company = companyIdx !== -1 ? cells[companyIdx] : "Okänt bolag";
          const rawSkills = skillsIdx !== -1 ? cells[skillsIdx] : "";
          const skills = rawSkills ? rawSkills.split(";").map(s => s.trim()) : [];
          const yoe = yoeIdx !== -1 ? Number(cells[yoeIdx] || 3) : 3;
          const location = locIdx !== -1 ? cells[locIdx] : "Sverige";
          const linkedin = linkedinIdx !== -1 ? cells[linkedinIdx] : "";
          const email = emailIdx !== -1 ? cells[emailIdx] : "";
          const phone = phoneIdx !== -1 ? cells[phoneIdx] : "";

          const canonicalKey = linkedin.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "") || 
            `${name.toLowerCase().replace(/\s+/g, "").trim()}|${company.toLowerCase().replace(/\s+/g, "").trim()}`;

          const candObj = {
            id: `import-${Date.now()}-${i}`,
            name,
            currentRole: role,
            company,
            yearsOfExperience: yoe,
            skills,
            location,
            linkedin,
            email: email || "Not available",
            phone: phone || "Not available",
            avatarUrl: "",
            profileImageUrl: "",
            summary: "",
            source: linkedin || "CSV Bulk Import",
            sourceCategory: "Intern databas" as any,
            evidenceSnippets: [],
            networkSignals: []
          };

          importedList.push(candObj);

          // Attempt database save
          try {
            await supabase.from("candidates").upsert({
              canonical_key: canonicalKey,
              name,
              current_role: role,
              company,
              years_of_experience: yoe,
              skills,
              location,
              linkedin_url: linkedin || null,
              email: email || null,
              phone: phone || null,
              data_confidence: { level: "Hög", score: 80, reasons: ["CSV-import"] } as any,
              last_seen_at: new Date().toISOString()
            }, { onConflict: "canonical_key" });
          } catch (e) {}

          count++;
        }

        // Save imported list to local storage
        saveLocalCandidates([...importedList, ...currentLocal]);
        toast({ title: `Bulkimporterade ${count} kandidater till poolen!` });
        
        if (showDatabaseOnly) {
          const cands = await fetchDatabaseCandidates();
          setDatabaseCandidates(cands);
        } else if (requirements) {
          await searchRealCandidates(requirements);
        }
      } catch (err: any) {
        toast({ title: "CSV-import misslyckades", description: err.message, variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const handleSaveRoleTemplate = () => {
    if (!jobDescription.trim()) {
      toast({ title: "Fyll i en annons först", variant: "destructive" });
      return;
    }
    const name = (templateName || searchTitleFromText(jobDescription)).trim();
    const template: RoleTemplate = {
      id: `${Date.now()}`,
      name,
      jobDescription,
      managerProfile,
    };
    const nextTemplates = [template, ...roleTemplates.filter((item) => item.name.toLowerCase() !== name.toLowerCase())].slice(0, 12);
    setRoleTemplates(nextTemplates);
    localStorage.setItem("nektab-local-templates", JSON.stringify(nextTemplates));
    setTemplateName("");
    toast({ title: `Sparade rollmallen ${name}` });
  };

  if (sessionLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#1E252B]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 4. Render Auth Interface if no active session
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1E252B] p-4 font-sans text-white">
        <div className="w-full max-w-md bg-[#252E38]/90 p-8 shadow-[0_12px_40px_rgba(0,0,0,0.25)] border border-white/5 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-[#5FC891]/60" />
          <div className="flex flex-col items-center text-center">
            <img src="/nektab-logo-rgb.png" alt="NEKTAB" className="h-10 w-auto brightness-0 invert" />
            <p className="brand-kicker mt-6 text-primary tracking-[0.08em] uppercase text-xs font-bold">Candidate Intelligence</p>
            <h2 className="mt-2 text-2xl font-normal text-white">
              {authMode === "signin" ? "Strategisk kompetenssökning" : "Skapa chefs-konto"}
            </h2>
          </div>

          <form onSubmit={handleAuth} className="mt-8 space-y-4">
            {authMode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs text-white/60 font-bold uppercase tracking-wider">Namn</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Ditt namn"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11 w-full border border-white/10 bg-white/5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:bg-white/10 transition-all text-white placeholder:text-white/30"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-white/60 font-bold uppercase tracking-wider">E-post</label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-3.5 h-4 w-4 text-white/40" />
                <input
                  type="email"
                  placeholder="namn@nektab.se"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="h-11 w-full border border-white/10 bg-white/5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:bg-white/10 transition-all text-white placeholder:text-white/30"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-white/60 font-bold uppercase tracking-wider">Lösenord</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-white/40" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="h-11 w-full border border-white/10 bg-white/5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:bg-white/10 transition-all text-white placeholder:text-white/30"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={authLoading} className="site-button w-full h-11 bg-primary text-black hover:bg-primary/95 font-bold mt-4 flex items-center justify-center gap-2 transition-all rounded-none">
              {authLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {authMode === "signin" ? "Logga in" : "Registrera"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-white/50">
            {authMode === "signin" ? (
              <p>
                Saknar du konto?{" "}
                <button onClick={() => setAuthMode("signup")} className="text-primary hover:underline font-bold">
                  Skapa ett här
                </button>
              </p>
            ) : (
              <p>
                Har du redan ett konto?{" "}
                <button onClick={() => setAuthMode("signin")} className="text-primary hover:underline font-bold">
                  Logga in här
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const renderXRaySearchPanel = (reqs: JobRequirements, compact = false) => {
    const titles = reqs.jobTitles?.length ? reqs.jobTitles : [];
    const skills = reqs.keySkills?.length ? reqs.keySkills : [];
    const loc = reqs.location || "";
    
    const titlePart = titles.length > 0 
      ? `(${titles.map(t => `"${t}"`).join(" OR ")})`
      : "";
    
    const skillsPart = skills.slice(0, 3).map(s => `"${s}"`).join(" ");
    const locPart = loc ? `"${loc}"` : "";
    
    const baseQuery = [titlePart, skillsPart, locPart].filter(Boolean).join(" ");
    
    const linkedinQuery = `site:linkedin.com/in ${baseQuery} -intitle:"jobs" -intitle:"hiring" -intitle:"rekryterare" -intitle:"recruiter"`;
    const rocketreachQuery = `site:rocketreach.co ${baseQuery} -intitle:"jobs" -intitle:"hiring"`;
    const githubQuery = `site:github.com ${titles[0] ? `"${titles[0]}"` : ""} ${skills.slice(0, 2).map(s => `"${s}"`).join(" ")} ${locPart} -intitle:"jobs"`;

    const linkedinUrl = `https://www.google.com/search?q=${encodeURIComponent(linkedinQuery)}`;
    const rocketreachUrl = `https://www.google.com/search?q=${encodeURIComponent(rocketreachQuery)}`;
    const githubUrl = `https://www.google.com/search?q=${encodeURIComponent(githubQuery)}`;

    const copyToClipboard = (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      toast({
        title: "Kopierad!",
        description: `Söksträng för ${label} har kopierats till urklipp.`,
      });
    };

    if (compact) {
      return (
        <Card className="bg-[#f0f4f1] border border-primary/20 rounded-none shadow-sm mt-4 mb-4">
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  Sök externt med Google X-Ray (Helt kostnadsfritt)
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Hittar du inte rätt kandidat lokalt? Sök på LinkedIn, RocketReach eller GitHub helt utan API-kostnader.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  type="button"
                  size="sm" 
                  className="bg-primary text-black hover:bg-primary/90 rounded-none font-bold text-xs"
                  onClick={() => window.open(linkedinUrl, "_blank")}
                >
                  Sök LinkedIn <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Button>
                <Button 
                  type="button"
                  size="sm" 
                  variant="outline"
                  className="border-primary text-foreground hover:bg-primary/10 rounded-none font-bold bg-white text-xs"
                  onClick={() => window.open(rocketreachUrl, "_blank")}
                >
                  Sök RocketReach <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-white border border-border rounded-none shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Search className="h-5 w-5 text-primary" />
            Externa sökverktyg (X-Ray Search)
          </h3>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Eftersom du valt att köra applikationen med <strong>0 kr i API-kostnad</strong> kan vi inte göra automatiska anrop till betaltjänster. 
            Istället kan du söka efter kandidater på webben helt gratis med Google X-Ray Search. Klicka på länkarna nedan för att söka:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="border border-border p-4 bg-muted/10 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  LinkedIn
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Sök profiler direkt på LinkedIn via Googles indexering för att hitta rätt kompetens.
                </p>
              </div>
              <div className="space-y-2">
                <Button 
                  type="button"
                  className="w-full bg-primary text-black hover:bg-primary/90 rounded-none font-bold text-xs h-9"
                  onClick={() => window.open(linkedinUrl, "_blank")}
                >
                  Öppna sökning <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-muted rounded-none font-bold text-xs h-9"
                  onClick={() => copyToClipboard(linkedinQuery, "LinkedIn")}
                >
                  Kopiera söksträng
                </Button>
              </div>
            </div>

            <div className="border border-border p-4 bg-muted/10 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  RocketReach
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Sök efter profiler på RocketReach för att hitta e-postadresser och kontaktuppgifter.
                </p>
              </div>
              <div className="space-y-2">
                <Button 
                  type="button"
                  className="w-full bg-primary text-black hover:bg-primary/90 rounded-none font-bold text-xs h-9"
                  onClick={() => window.open(rocketreachUrl, "_blank")}
                >
                  Öppna sökning <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-muted rounded-none font-bold text-xs h-9"
                  onClick={() => copyToClipboard(rocketreachQuery, "RocketReach")}
                >
                  Kopiera söksträng
                </Button>
              </div>
            </div>

            <div className="border border-border p-4 bg-muted/10 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  GitHub
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Sök efter utvecklare eller tekniker som har publicerat relaterade projekt och kod.
                </p>
              </div>
              <div className="space-y-2">
                <Button 
                  type="button"
                  className="w-full bg-primary text-black hover:bg-primary/90 rounded-none font-bold text-xs h-9"
                  onClick={() => window.open(githubUrl, "_blank")}
                >
                  Öppna sökning <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-muted rounded-none font-bold text-xs h-9"
                  onClick={() => copyToClipboard(githubQuery, "GitHub")}
                >
                  Kopiera söksträng
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 border-l-4 border-primary p-4 mt-6 text-xs text-foreground space-y-2">
            <p className="font-bold flex items-center gap-1.5">
              💡 Hur lägger jag till dem i appen?
            </p>
            <p className="leading-relaxed">
              När du hittar en intressant profil via Googles sökresultat:
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>Klicka på <strong>"Lägg till kandidat"</strong> i sidomenyn eller fliken i appen.</li>
              <li>Klistra in kandidatens namn, titel, länk och kompetenser.</li>
              <li>Kandidaten sparas direkt i er gemensamma databas och kan matchas mot framtida kravspecifikationer!</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="site-shell min-h-screen bg-[#fafafa]">

      <header className="site-header bg-white border-b border-border transition-all">
        <div className="container flex h-[70px] items-center justify-between gap-5 lg:h-[90px]">
          <div className="flex min-w-0 items-center gap-4">
            <img
              src="/nektab-logo-rgb.png"
              alt="NEKTAB"
              className="h-7 w-auto sm:h-9 lg:h-11"
            />
          </div>
          <nav className="hidden items-center gap-7 lg:flex">
            <a className="site-nav-link text-foreground" href="https://nektab.se/vad-vi-gor/">Vad vi gör</a>
            <a className="site-nav-link text-foreground" href="https://nektab.se/karriar/">Karriär</a>
            <a className="site-nav-link text-foreground" href="https://nektab.se/bli-var-partner/">Bli vår partner</a>
            <button
              onClick={handleSignOut}
              className="site-nav-link text-foreground flex items-center gap-1.5 font-bold hover:text-primary transition-all"
            >
              <LogOut className="h-4 w-4" /> Logga ut
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="site-hero flex min-h-[460px] items-center pt-[90px] text-white bg-[#1E252B] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="container py-12 text-center relative z-10">
            <div className="mx-auto max-w-4xl">
              <p className="brand-kicker text-primary uppercase tracking-wider font-bold text-xs">NEKTAB Candidate Intelligence</p>
              <h1 className="mt-4 text-4xl font-normal leading-tight text-white sm:text-5xl lg:text-6xl tracking-tight">
                Hitta rätt kompetens för starkare elnät
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base text-white/85 sm:text-lg">
                Matcha din kravprofil direkt mot databasen – helt utan externa API-kostnader för sökning eller skrapning.
              </p>
            </div>
          </div>
        </section>

        <section className="site-section relative z-20 bg-transparent pb-10">
          <div className="container">
            <div className="site-panel mx-auto -mt-28 max-w-5xl bg-white p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-border">
              <div className="line-heading">
                <p className="brand-kicker text-primary uppercase tracking-wider text-xs font-bold">Elektrifiering av rekrytering</p>
                <h2 className="mt-1 text-2xl font-bold md:text-3xl text-foreground">Matcha mot intern databas</h2>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Matcha jobbannonsen mot lokala kandidater, lägg till nya manuellt, eller gör en bulkimport via CSV.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => setShowAddForm(true)} className="site-button bg-primary text-black hover:bg-primary/95 font-bold gap-2">
                  <Plus className="h-4 w-4" /> Lägg till kandidat
                </Button>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvImport}
                    id="csv-file-upload"
                    className="hidden"
                  />
                  <label htmlFor="csv-file-upload" className="inline-flex h-11 items-center justify-center border border-primary px-5 text-sm font-bold text-foreground cursor-pointer hover:bg-primary/10 transition-all gap-2">
                    <Upload className="h-4 w-4" /> Bulkimportera CSV
                  </label>
                </div>
                <Button 
                  onClick={handleToggleDatabase} 
                  disabled={isLoadingDatabase}
                  className="inline-flex h-11 items-center justify-center border border-primary px-5 text-sm font-bold text-foreground bg-transparent hover:bg-primary/10 transition-all gap-2 rounded-none"
                >
                  {isLoadingDatabase ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Database className="h-4 w-4 text-primary" />
                  )}
                  {showDatabaseOnly ? "Dölj intern databas" : "Visa sparade i databasen"}
                </Button>
              </div>

              {showAddForm && (
                <div className="mt-6 border border-border p-6 bg-[#fafafa] relative">
                  <button onClick={() => setShowAddForm(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                  <h3 className="brand-kicker text-primary uppercase text-xs font-bold tracking-wider mb-4">Skapa kandidatprofil</h3>
                  <form onSubmit={handleAddCandidate} className="grid gap-4 md:grid-cols-2">
                    <input value={newCandName} onChange={e => setNewCandName(e.target.value)} placeholder="Namn (obligatoriskt)" className="h-10 border border-border bg-white px-3 text-sm outline-none" required />
                    <input value={newCandRole} onChange={e => setNewCandRole(e.target.value)} placeholder="Nuvarande roll" className="h-10 border border-border bg-white px-3 text-sm outline-none" />
                    <input value={newCandCompany} onChange={e => setNewCandCompany(e.target.value)} placeholder="Nuvarande företag" className="h-10 border border-border bg-white px-3 text-sm outline-none" />
                    <input value={newCandLocation} onChange={e => setNewCandLocation(e.target.value)} placeholder="Plats (t.ex. Stockholm)" className="h-10 border border-border bg-white px-3 text-sm outline-none" />
                    <input value={newCandYoe} onChange={e => setNewCandYoe(e.target.value)} type="number" placeholder="Års erfarenhet" className="h-10 border border-border bg-white px-3 text-sm outline-none" />
                    <input value={newCandLinkedin} onChange={e => setNewCandLinkedin(e.target.value)} placeholder="LinkedIn URL" className="h-10 border border-border bg-white px-3 text-sm outline-none" />
                    <input value={newCandEmail} onChange={e => setNewCandEmail(e.target.value)} type="email" placeholder="E-post" className="h-10 border border-border bg-white px-3 text-sm outline-none" />
                    <input value={newCandPhone} onChange={e => setNewCandPhone(e.target.value)} placeholder="Telefon" className="h-10 border border-border bg-white px-3 text-sm outline-none" />
                    <textarea value={newCandSkills} onChange={e => setNewCandSkills(e.target.value)} placeholder="Kompetenser (separera med kommatecken, t.ex. CAD, Luftledning, Beredning)" className="h-20 border border-border bg-white p-3 text-sm outline-none md:col-span-2" />
                    <Button type="submit" className="site-button bg-primary text-black hover:bg-primary/95 font-bold md:col-span-2">Spara profil</Button>
                  </form>
                </div>
              )}

              <div className="mt-6 border border-primary/20 bg-primary/5 p-4 rounded-none">
                <label htmlFor="quick-profile" className="brand-kicker text-primary uppercase text-xs font-bold tracking-wider">
                  Snabbprofil utan annons
                </label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input
                    id="quick-profile"
                    value={quickProfile}
                    onChange={(event) => setQuickProfile(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleQuickProfile();
                    }}
                    placeholder="T.ex. Senior kraftledningsprojektör, beredare eller CAD"
                    className="min-h-12 flex-1 border border-border bg-white px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                  />
                  <Button type="button" onClick={handleQuickProfile} className="site-button min-h-12 bg-primary text-black hover:bg-primary/95 font-bold gap-2">
                    <Search className="h-4 w-4" />
                    Fyll annonsruta
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_PROFILE_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setQuickProfile(suggestion);
                        setJobDescription(buildQuickJobDescription(suggestion));
                        clearResults();
                      }}
                      className="border border-primary/30 bg-white px-3 py-1 text-xs font-bold text-foreground transition-all hover:bg-primary/10"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-4 border border-border bg-[#fafafa] p-4 lg:grid-cols-3">
                <div>
                  <p className="brand-kicker flex items-center gap-2 text-primary uppercase text-xs font-bold tracking-wider">
                    <FileText className="h-3.5 w-3.5" />
                    Sparade roller
                  </p>
                  <div className="mt-3 max-h-24 flex flex-wrap gap-2 overflow-y-auto">
                    {roleTemplates.length > 0 ? roleTemplates.map((template) => (
                       <button
                        key={template.id}
                        type="button"
                        onClick={() => applySavedSearch(template)}
                        className="border border-primary/30 bg-white px-3 py-1 text-xs font-bold text-foreground hover:bg-primary/20 transition-all"
                      >
                        {template.name}
                      </button>
                    )) : (
                      <span className="text-xs text-muted-foreground">Spara vanliga roller för snabb återanvändning.</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="brand-kicker flex items-center gap-2 text-primary uppercase text-xs font-bold tracking-wider">
                    <History className="h-3.5 w-3.5" />
                    Senaste sökningar
                  </p>
                  <div className="mt-3 max-h-32 space-y-2 overflow-y-auto">
                    {searchHistory.length > 0 ? searchHistory.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => applySavedSearch(entry)}
                        className="block w-full border border-border bg-white p-2 text-left text-xs hover:border-primary transition-all"
                      >
                        <span className="block font-bold text-foreground">{entry.title}</span>
                        <span className="text-muted-foreground">{entry.createdAt}</span>
                      </button>
                    )) : (
                      <p className="text-xs text-muted-foreground">Historik sparas automatiskt i databasen.</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="brand-kicker flex items-center gap-2 text-primary uppercase text-xs font-bold tracking-wider">
                    <User className="h-3.5 w-3.5" />
                    Mina inställningar
                  </p>
                  <div className="mt-3 space-y-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Din signatur (e-post/LinkedIn)</label>
                      <input 
                        type="text"
                        value={recruiterName}
                        onChange={(e) => {
                          setRecruiterName(e.target.value);
                          localStorage.setItem("nektab-recruiter-name", e.target.value);
                        }}
                        placeholder="T.ex. Andreas Strandberg"
                        className="h-9 w-full border border-border bg-white px-3 text-xs outline-none focus:border-primary font-bold text-foreground"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div 
                className={`mt-6 border relative transition-all ${isDraggingFile ? "border-dashed border-primary bg-primary/5 ring-2 ring-primary/25 animate-pulse" : "border-border bg-white"}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="absolute right-3 bottom-3 z-10 flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold px-2.5 py-1.5 border border-border shadow-sm transition-all">
                    <Upload className="h-3 w-3" /> Släpp eller Välj fil
                    <input type="file" onChange={handleFileChange} accept=".txt,.md,.rtf,.json" className="hidden" />
                  </label>
                </div>
                <textarea
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="Klistra in din arbetsbeskrivning här (eller dra och släpp en textfil)..."
                  className="min-h-[230px] w-full resize-y rounded-none bg-transparent p-4 pb-12 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 border-0"
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <Button onClick={handleAnalyze} disabled={isAnalyzing || isSearchingWeb} size="lg" className="site-button bg-primary text-black hover:bg-primary/95 font-bold gap-2">
                  {isAnalyzing || isSearchingWeb ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Analyserar och söker...</>
                  ) : (
                    <><Search className="h-4 w-4" />Analysera & hitta lokala kandidater</>
                  )}
                </Button>
              </div>

              <div className="mt-6 border border-border bg-[#fafafa] p-4">
                <p className="brand-kicker text-primary uppercase text-xs font-bold tracking-wider">Chefens kravprofil</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {[
                    ["mustHave", "Måste ha"],
                    ["niceToHave", "Meriterande"],
                    ["disqualifiers", "Diskvalificerande"],
                    ["geography", "Geografi"],
                    ["seniority", "Senioritet"],
                    ["engagement", "Konsult/anställd"],
                  ].map(([key, label]) => (
                    <input
                      key={key}
                      value={managerProfile[key as keyof ManagerProfile]}
                      onChange={(event) => setManagerProfile((current) => ({ ...current, [key]: event.target.value }))}
                      placeholder={label}
                      className="h-10 border border-border bg-white px-3 text-sm outline-none focus:border-primary"
                    />
                  ))}
                </div>
              </div>

              {isSearchingWeb && searchProgress.total > 0 && (
                <div className="mt-4 border border-primary/20 bg-primary/5 p-4 text-sm relative overflow-hidden transition-all animate-pulse">
                  <div className="flex items-center justify-between gap-3 relative z-10">
                    <span className="font-bold text-foreground">
                      Matchar kandidater...
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {searchProgress.queries[0]}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden bg-white/60 relative z-10">
                    <div
                      className="h-full bg-primary transition-all duration-500 w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {(requirements || webResults.length > 0 || shortlist.length > 0 || showDatabaseOnly || searchError) && (
          <section className="site-section relative -mt-10 bg-[#f5f5f2] pt-20 pb-20">
            <div className={`container grid gap-7 ${showSidePanel ? "lg:grid-cols-[330px_minmax(0,1fr)]" : "lg:grid-cols-1"}`}>
              {showSidePanel && (
                <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start transition-all">
                  {requirements && (
                    <JobRequirementsPanel
                      requirements={requirements}
                      onChange={handleRequirementsChange}
                      onSearchAgain={handleSearchWithRequirements}
                      isSearching={isSearchingWeb}
                      onHoverSkill={setHoveredRequirementSkill}
                    />
                  )}
                  <CandidateFilters filters={filters} onChange={setFilters} availableSkills={allSkills} />
                </aside>
              )}

              <div className="min-h-0 space-y-4">
                <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-border bg-white/95 px-5 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="brand-kicker text-primary uppercase text-xs font-bold tracking-wider">Matchade träffar</p>
                    <h2 className="text-2xl font-bold">
                      {showDatabaseOnly 
                        ? "Sparade i databasen" 
                        : (showShortlistOnly ? "Kortlista" : "Kandidater")} ({filteredWebResults.length})
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleToggleDatabase}
                      disabled={isLoadingDatabase}
                      className="rounded-full border-primary text-foreground font-bold normal-case h-9"
                    >
                      {isLoadingDatabase ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Database className="h-4 w-4 text-primary" />
                      )}
                      {showDatabaseOnly ? "Visa sökresultat" : "Visa intern databas"}
                    </Button>
                    {shortlist.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowShortlistOnly(!showShortlistOnly);
                          setShowDatabaseOnly(false);
                          setSelectedCandidateIds(new Set());
                        }}
                        className="rounded-full border-primary text-foreground font-bold normal-case h-9"
                      >
                        <BookmarkCheck className="h-4 w-4" />
                        {showShortlistOnly ? "Visa alla" : "Visa kortlista"}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectVisible}
                      disabled={filteredWebResults.length === 0}
                      className="rounded-full border-primary text-foreground font-bold normal-case h-9"
                    >
                      {allVisibleSelected ? "Avmarkera synliga" : "Markera synliga"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveSelectedToShortlist}
                      disabled={selectedCandidates.length === 0}
                      className="rounded-full border-primary text-foreground font-bold normal-case h-9"
                    >
                      <BookmarkPlus className="h-4 w-4" />
                      Spara valda
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleExportSelected}
                      disabled={selectedCandidates.length === 0}
                      className="rounded-full border-primary text-foreground font-bold normal-case h-9"
                    >
                      <Download className="h-4 w-4" />
                      Exportera ({selectedCandidates.length})
                    </Button>
                    {shortlist.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearShortlist}
                        className="h-9 gap-1 px-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                      >
                        <Trash2 className="h-4 w-4" /> Rensa
                      </Button>
                    )}
                  </div>
                </div>

                {searchError && (
                  <div className="flex gap-3 border-l-4 border-destructive bg-white p-4 text-sm text-foreground shadow-sm">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <div>
                      <p className="brand-kicker text-destructive font-bold uppercase text-xs tracking-wider">Sökningen misslyckades</p>
                      <p className="mt-1">{searchError}</p>
                    </div>
                  </div>
                )}

                {comparedCandidates.length >= 2 && (
                  <div className="overflow-x-auto bg-white p-6 shadow-sm border border-border">
                    <p className="brand-kicker text-primary uppercase text-xs font-bold tracking-wider">Jämför markerade kandidater ({comparedCandidates.length})</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      {comparedCandidates.map((candidate) => (
                        <div key={candidate.id} className="border border-border p-4 bg-muted/20 flex flex-col justify-between space-y-4">
                          <div>
                            <h4 className="font-bold text-base text-foreground">{candidate.name}</h4>
                            <p className="text-xs text-muted-foreground leading-tight mt-1">{candidate.currentRole} på {candidate.company}</p>
                            
                            <div className="mt-3 flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">Matchpoäng:</span>
                              <span className="font-bold text-primary">{candidate.score}/100</span>
                            </div>

                            <div className="mt-3 space-y-1">
                              <p className="text-[11px] font-bold text-foreground">Matchade kompetenser:</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {candidate.matchedSkills.slice(0, 3).map(skill => (
                                  <span key={skill} className="bg-primary/10 text-foreground text-[10px] px-1.5 py-0.5 font-bold">{skill}</span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-border space-y-1">
                            <p className="text-[10px] text-muted-foreground">Erfarenhet: <strong className="text-foreground">{candidate.yearsOfExperience} år</strong></p>
                            <p className="text-[10px] text-muted-foreground">Plats: <strong className="text-foreground">{candidate.location}</strong></p>
                            {candidate.redFlags.length > 0 && (
                              <p className="text-[10px] text-red-500 font-bold">Flaggor: {candidate.redFlags.slice(0, 2).join(", ")}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!searchError && !isSearchingWeb && requirements && filteredWebResults.length === 0 && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="bg-white p-5 text-sm text-muted-foreground shadow-sm border border-border">
                      Inga kandidater matchar kraven i den lokala poolen för tillfället.
                    </div>
                    {renderXRaySearchPanel(requirements)}
                  </div>
                )}

                {requirements && filteredWebResults.length > 0 && renderXRaySearchPanel(requirements, true)}

                {/* Sökstatistik / Analytics summary cards */}
                {requirements && filteredWebResults.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                    <Card className="bg-white border border-border rounded-none shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-[10px] uppercase font-extrabold text-muted-foreground tracking-wider">Antal matchningar</p>
                        <p className="text-2xl font-bold mt-1 text-foreground">{filteredWebResults.length}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">I pool & webb</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-white border border-border rounded-none shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-[10px] uppercase font-extrabold text-muted-foreground tracking-wider">Genomsnittlig match</p>
                        <p className="text-2xl font-bold mt-1 text-primary">
                          {Math.round(filteredWebResults.reduce((acc, curr) => acc + curr.score, 0) / filteredWebResults.length)}%
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">Relevans för rollen</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-white border border-border rounded-none shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-[10px] uppercase font-extrabold text-muted-foreground tracking-wider">Toppkandidat</p>
                        <p className="text-2xl font-bold mt-1 text-foreground">
                          {Math.max(...filteredWebResults.map(c => c.score))}%
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">Högsta enskilda poäng</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-white border border-border rounded-none shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-[10px] uppercase font-extrabold text-muted-foreground tracking-wider">Direkt kontaktbara</p>
                        <p className="text-2xl font-bold mt-1 text-foreground">
                          {filteredWebResults.filter(c => 
                            (c.email && c.email !== "Not available" && c.email !== "Klicka för att hämta") || 
                            (c.phone && c.phone !== "Not available" && c.phone !== "Klicka för att hämta") || 
                            c.linkedin
                          ).length} st
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">Med e-post/tele/LinkedIn</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="candidate-scroll-panel space-y-4">

                  {filteredWebResults.map((candidate, i) => (
                    <div key={candidate.id} className="relative group transition-all">
                      {savingStatus[candidate.id] && (
                        <div className="absolute right-3 top-3 z-30 bg-primary/95 text-black font-bold text-xs px-2.5 py-1 flex items-center gap-1.5 rounded-none shadow-sm animate-fade-in">
                          {savingStatus[candidate.id] === "saving" ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> Sparar...</>
                          ) : (
                            <><Check className="h-3 w-3" /> Sparat</>
                          )}
                        </div>
                      )}
                      <CandidateCard
                        candidate={candidate}
                        rank={i + 1}
                        selected={selectedCandidateIds.has(candidateId(candidate))}
                        compact={filters.viewMode === "compact"}
                        pipelineStatus={pipelineByCandidate[candidateId(candidate)] || "Ny"}
                        feedback={feedbackByCandidate[candidateId(candidate)]}
                        note={notesByCandidate[candidateId(candidate)] || ""}
                        recruiterName={recruiterName}
                        onPipelineChange={(status) => handlePipelineChange(candidateId(candidate), status)}
                        onFeedbackChange={(feedback) => handleFeedbackChange(candidateId(candidate), feedback)}
                        onNoteChange={(note) => handleNoteChange(candidateId(candidate), note)}
                        onCopyOutreach={() => handleCopyOutreach(candidate)}
                        onEnrich={() => handleEnrich(candidate)}
                        onSelectedChange={(selected) => handleCandidateSelection(candidateId(candidate), selected)}
                        onSaveToDb={() => saveWebCandidateToDb(candidate)}
                        hoveredSkill={hoveredRequirementSkill}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="bg-[#1E252B] text-white">
        <div className="container grid gap-8 py-10 md:grid-cols-[1.3fr_1fr_1fr] md:py-14">
          <div>
            <img
              src="/nektab-logo-rgb.png"
              alt="NEKTAB"
              className="h-9 w-auto brightness-0 invert"
            />
            <p className="mt-5 max-w-sm text-sm text-white/75">
              Vi gör elnätet starkare tillsammans. Med expertis och partnerskap utformar våra konsulter hållbara elnät.
            </p>
            <p className="mt-4 flex items-start gap-2 text-sm text-white/80">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              NEKTAB är certifierade enligt SSF 1101, Cybersäkerhet bas.
            </p>
            <a
              href="https://www.sbsc.se/foretagcertifikat/26-114/cybersakerhet-bas/nektab-nordisk-elkraftteknik-ab/"
              target="_blank"
              rel="noopener"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-black transition-colors hover:bg-primary/90"
            >
              Till certifikat
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div>
            <p className="brand-kicker text-primary uppercase text-xs font-bold tracking-wider">Internt verktyg</p>
            <p className="mt-3 text-sm text-white/75">
              Använd kandidatdata med tydligt rekryteringssyfte, verifiera alltid källor och exportera bara profiler som är aktuella för processen.
            </p>
          </div>

          <div className="md:text-right">
            <p className="text-sm text-white/75">Copyright © 2026 NEKTAB</p>
            <a
              href="https://nektab.se/cookies-integritetspolicy/"
              target="_blank"
              rel="noopener"
              className="mt-3 inline-flex text-sm font-bold text-primary hover:text-white"
            >
              Cookie- & Integritetspolicy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
