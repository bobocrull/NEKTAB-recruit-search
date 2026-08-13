import { useState } from "react";
import { ScoredCandidate } from "@/lib/matchingLogic";
import { downloadCandidatePdf } from "@/lib/pdfExport";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Briefcase, Clock, Database, Mail, Phone, Linkedin, Download, ChevronDown, ChevronUp, Copy, AlertTriangle, Search, Sparkles, Network, FileSearch, GraduationCap } from "lucide-react";

type PipelineStatus = "Ny" | "Intressant" | "Kontakta" | "Avvakta" | "Ej relevant" | "Skickad till Cinode";
type FeedbackTag = "Relevant" | "Inte relevant" | "Fel bransch" | "För junior" | "Fel geografi" | "Saknar nyckelkompetens";

const PIPELINE_STATUSES: PipelineStatus[] = ["Ny", "Intressant", "Kontakta", "Avvakta", "Ej relevant", "Skickad till Cinode"];
const FEEDBACK_OPTIONS: FeedbackTag[] = ["Relevant", "Inte relevant", "Fel bransch", "För junior", "Fel geografi", "Saknar nyckelkompetens"];

function scoreColor(score: number): string {
  if (score >= 70) return "text-score-high";
  if (score >= 45) return "text-score-medium";
  return "text-score-low";
}

function scoreBg(score: number): string {
  if (score >= 70) return "bg-score-high/10";
  if (score >= 45) return "bg-score-medium/10";
  return "bg-score-low/10";
}

function isAvailable(value?: string): value is string {
  return Boolean(value && !["not available", "unknown", "n/a"].includes(value.trim().toLowerCase()));
}

function normalizeLinkedInUrl(value?: string): string | null {
  if (!isAvailable(value)) return null;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function getOutreachMessage(candidate: ScoredCandidate, recruiterName: string): string {
  return `Hej ${candidate.name.split(" ")[0]},

Jag hittade din profil när vi på NEKTAB letade efter kompetens inom ${candidate.matchedSkills.slice(0, 3).join(", ") || candidate.currentRole}.

Din bakgrund som ${candidate.currentRole} på ${candidate.company} ser relevant ut för ett uppdrag hos oss. Vore du öppen för en kort kontakt för att höra mer?

Vänliga hälsningar,
${recruiterName || "NEKTAB"}`;
}

interface CandidateCardProps {
  candidate: ScoredCandidate;
  rank: number;
  selected?: boolean;
  compact?: boolean;
  pipelineStatus?: string;
  feedback?: string;
  note?: string;
  recruiterName?: string;
  onPipelineChange?: (status: PipelineStatus) => void;
  onFeedbackChange?: (feedback: FeedbackTag) => void;
  onNoteChange?: (note: string) => void;
  onCopyOutreach?: () => void;
  onEnrich?: () => void;
  onSelectedChange?: (selected: boolean) => void;
  onSaveToDb?: () => void;
  hoveredSkill?: string | null;
  onOutreachClick?: (candidate: ScoredCandidate) => void;
}

export function CandidateCard({
  candidate,
  rank,
  selected = false,
  compact = false,
  pipelineStatus = "Ny",
  feedback,
  note = "",
  recruiterName = "",
  onPipelineChange,
  onFeedbackChange,
  onNoteChange,
  onCopyOutreach,
  onEnrich,
  onSelectedChange,
  onSaveToDb,
  hoveredSkill = null,
  onOutreachClick,
}: CandidateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contactExpanded, setContactExpanded] = useState(false);
  const [scoreExpanded, setScoreExpanded] = useState(false);
  const linkedInUrl = normalizeLinkedInUrl(candidate.linkedin);
  const imageUrl = candidate.avatarUrl || candidate.profileImageUrl || candidate.imageUrl;
  const networkSignals = candidate.networkSignals || [];
  const evidenceSnippets = candidate.evidenceSnippets || [];
  const initials = candidate.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const confidenceColor =
    candidate.dataConfidence.level === "Hög"
      ? "bg-score-high/10 text-score-high"
      : candidate.dataConfidence.level === "Medel"
        ? "bg-score-medium/10 text-score-medium"
        : "bg-score-low/10 text-score-low";
  const publicSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${candidate.name} ${candidate.company} LinkedIn`)}`;
  const contactSignals = [
    linkedInUrl && "LinkedIn",
    isAvailable(candidate.email) && "e-post",
    isAvailable(candidate.phone) && "telefon",
  ].filter(Boolean);
  const strongestMatches = candidate.matchedSkills.slice(0, 3);
  const mainGaps = candidate.missingSkills.slice(0, 2);

  const CRITICAL_WARNINGS = ["LinkedIn saknas", "Kontaktuppgifter saknas", "Låg datakvalitet"];
  const criticalFlags = candidate.redFlags.filter(flag => CRITICAL_WARNINGS.includes(flag));
  const insightFlags = candidate.redFlags.filter(flag => !CRITICAL_WARNINGS.includes(flag));

  const scoreStrokeColor = (score: number) => {
    if (score >= 70) return "#15b8a6"; // teal/primary
    if (score >= 45) return "#f59e0b"; // amber
    return "#ef4444"; // red
  };
  
  const isHighlighted = Boolean(
    hoveredSkill && (
      candidate.matchedSkills.some(s => s.toLowerCase() === hoveredSkill.toLowerCase()) ||
      candidate.currentRole.toLowerCase().includes(hoveredSkill.toLowerCase()) ||
      candidate.skills.some(s => s.toLowerCase() === hoveredSkill.toLowerCase())
    )
  );

  const strokeDashoffset = ((100 - candidate.score) / 100) * 138;

  return (
    <Card className={`border border-border bg-white shadow-sm transition-all duration-300 hover:shadow-md ${selected ? "ring-1 ring-primary shadow-sm" : ""} ${isHighlighted ? "ring-2 ring-primary bg-primary/5 shadow-md scale-[1.01]" : ""}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {onSelectedChange && (
            <Checkbox
              checked={selected}
              onCheckedChange={(value) => onSelectedChange(value === true)}
              aria-label={`Välj ${candidate.name} för export`}
              className="mt-1.5 h-4 w-4 shrink-0 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-black"
            />
          )}

          <div className="min-w-0 flex-1 space-y-2.5 overflow-hidden">
            {/* Header: Name, Score & Source */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words text-base sm:text-lg font-bold text-foreground flex flex-wrap items-center gap-2">
                  <span>{candidate.name}</span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase bg-muted/70 px-1.5 py-0.5 rounded">
                    {candidate.sourceCategory || "Öppen webb"}
                  </span>
                </h3>
                
                {/* Role and Company */}
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground/80 mt-0.5">
                  <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="break-words">{candidate.currentRole} på {candidate.company}</span>
                </p>

                {/* Education */}
                {candidate.education && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <GraduationCap className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="break-words font-medium">{candidate.education}</span>
                  </p>
                )}
              </div>

              {/* Match Score pill */}
              <div className={`text-xs font-mono font-extrabold uppercase px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 ${scoreBg(candidate.score)} ${scoreColor(candidate.score)}`}>
                <Sparkles className="h-3 w-3" />
                {candidate.score}% Match
              </div>
            </div>

            {/* Core Metadata Row: Experience & Location */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-muted-foreground/70" /> {candidate.yearsOfExperience} år</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground/70" /> {candidate.location}</span>
              
              {/* Inline Active Contact Icons (only if available) */}
              <div className="flex items-center gap-1.5 ml-auto">
                {linkedInUrl && (
                  <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted text-[#0A66C2] transition-colors" title="Öppna LinkedIn">
                    <Linkedin className="h-3.5 w-3.5" />
                  </a>
                )}
                {isAvailable(candidate.email) && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      if (onOutreachClick) {
                        onOutreachClick(candidate);
                      } else {
                        window.location.href = `mailto:${candidate.email}?subject=${encodeURIComponent("Karriärsmöjlighet hos NEKTAB")}&body=${encodeURIComponent(getOutreachMessage(candidate, recruiterName))}`;
                      }
                    }} 
                    className="p-1 rounded-full hover:bg-muted text-[#EA4335] transition-colors" 
                    title="Skicka e-post"
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </button>
                )}
                {isAvailable(candidate.phone) && (
                  <a href={`tel:${candidate.phone}`} className="p-1 rounded-full hover:bg-muted text-[#34A853] transition-colors" title="Ring telefon">
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Critical Flags at top level (if any) */}
            {criticalFlags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {criticalFlags.map((flag) => (
                  <Badge key={flag} variant="outline" className="gap-1 rounded-none border-amber-300 bg-amber-50/50 text-[10px] font-bold text-amber-700 px-2 py-0.5">
                    <AlertTriangle className="h-2.5 w-2.5 text-amber-600" /> {flag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap gap-2 items-center justify-between pt-2 border-t border-border/60 mt-2">
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={pipelineStatus}
                  onChange={(event) => onPipelineChange?.(event.target.value as PipelineStatus)}
                  className="h-8 border border-border bg-white rounded-md px-2 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                >
                  {PIPELINE_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                
                {feedback && (
                  <Badge variant="outline" className="rounded-full text-[10px] font-bold py-0.5 px-2 bg-slate-50 border-slate-200">
                    Feedback: {feedback}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onOutreachClick ? onOutreachClick(candidate) : onCopyOutreach?.()} 
                  className="h-8 gap-1.5 rounded-md border-primary/40 hover:border-primary text-xs font-semibold hover:bg-primary/5 transition-all"
                >
                  <Copy className="h-3 w-3" /> Outreach
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsExpanded(!isExpanded)} 
                  className="h-8 gap-0.5 text-xs font-semibold text-primary hover:text-primary/80 hover:bg-transparent"
                >
                  {isExpanded ? (
                    <><ChevronUp className="h-3.5 w-3.5" /> Stäng</>
                  ) : (
                    <><ChevronDown className="h-3.5 w-3.5" /> Detaljer</>
                  )}
                </Button>
              </div>
            </div>

            {/* Expanded Content Area */}
            {isExpanded && (
              <div className="space-y-4 pt-4 border-t border-border mt-3 animate-fade-in text-sm">
                
                {/* Row: Feedback Selector & Quality info */}
                <div className="flex flex-wrap gap-4 items-center justify-between bg-muted/40 p-2.5 rounded-lg border border-border/50 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Kategorisera feedback:</span>
                    <select
                      value={feedback || ""}
                      onChange={(event) => onFeedbackChange?.(event.target.value as FeedbackTag)}
                      className="h-8 border border-border bg-white rounded-md px-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="">Ingen feedback vald</option>
                      {FEEDBACK_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="text-muted-foreground">
                    Datakvalitet {candidate.dataConfidence.score}/100: <span className="font-bold text-foreground">{candidate.dataConfidence.level}</span>
                  </div>
                </div>

                {/* Missing Contact details Search helpers (only if missing) */}
                {(!linkedInUrl || !isAvailable(candidate.email) || !isAvailable(candidate.phone)) && (
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/40 text-xs space-y-2">
                    <p className="font-bold text-foreground/80 flex items-center gap-1.5">
                      <Search className="h-3 w-3 text-muted-foreground" />
                      Sök saknade uppgifter på webben
                    </p>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {!linkedInUrl && (
                        <a 
                          href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${candidate.name} ${candidate.company}`)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 bg-white border border-border px-2.5 py-1 text-foreground hover:bg-muted font-medium transition-colors"
                        >
                          Sök LinkedIn
                        </a>
                      )}
                      {!isAvailable(candidate.email) && (
                        <a 
                          href={`https://www.google.com/search?q=${encodeURIComponent(`"${candidate.name}" "${candidate.company}" email OR epost`)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 bg-white border border-border px-2.5 py-1 text-foreground hover:bg-muted font-medium transition-colors"
                        >
                          Sök E-post
                        </a>
                      )}
                      {!isAvailable(candidate.phone) && (
                        <a 
                          href={`https://www.google.com/search?q=${encodeURIComponent(`"${candidate.name}" "${candidate.company}" telefon OR mobil OR nummer OR phone`)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 bg-white border border-border px-2.5 py-1 text-foreground hover:bg-muted font-medium transition-colors"
                        >
                          Sök Telefon
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Sökobservationer (insights) */}
                {insightFlags.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-extrabold text-muted-foreground tracking-wider">Sökanalys & Observationer</p>
                    <div className="flex flex-wrap gap-1.5">
                      {insightFlags.map((flag) => {
                        const isNetwork = flag.includes("Nätverk");
                        return (
                          <Badge key={flag} variant="outline" className="gap-1.5 rounded-none border-slate-300 bg-slate-50 text-xs font-bold text-slate-700 px-2.5 py-1">
                            {isNetwork ? (
                              <Network className="h-3 w-3 text-slate-500" />
                            ) : (
                              <FileSearch className="h-3 w-3 text-slate-500" />
                            )}
                            {flag}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Decision Summary */}
                {candidate.decisionSummary && (
                  <div className="border-l-4 border-primary bg-primary/5 p-3 text-sm font-bold text-foreground">
                    {candidate.decisionSummary}
                  </div>
                )}

                {/* Score Summary breakdown box */}
                <div className="grid gap-2 border border-border bg-[#fafafa] p-3 text-xs md:grid-cols-2">
                  <div>
                    <p className="font-bold text-foreground">Starkast signal</p>
                    <p className="mt-1 text-muted-foreground">
                      {strongestMatches.length > 0 ? strongestMatches.join(", ") : "Ingen tydlig kravmatch ännu"}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Att kontrollera</p>
                    <p className="mt-1 text-muted-foreground">
                      {mainGaps.length > 0 ? mainGaps.join(", ") : "Inga uppenbara kravluckor"}
                    </p>
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className="flex flex-wrap gap-2">
                  <a
                    href={publicSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1 rounded-full border border-primary px-3 text-xs font-bold text-foreground hover:bg-primary/20"
                  >
                    <Search className="h-3.5 w-3.5" /> Sök LinkedIn/Google
                  </a>
                  <Button type="button" variant="outline" size="sm" onClick={onEnrich} className="h-9 gap-1 rounded-full border-primary text-xs font-bold">
                    <Sparkles className="h-3.5 w-3.5" /> Berika kontakt
                  </Button>
                  {onSaveToDb && candidate.sourceCategory !== "Intern databas" && (
                    <Button type="button" variant="default" size="sm" onClick={onSaveToDb} className="h-9 gap-1 rounded-full bg-primary text-black hover:bg-primary/95 text-xs font-bold">
                      <Database className="h-3.5 w-3.5" /> Spara i databas
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadCandidatePdf(candidate)}
                    className="h-9 gap-1 rounded-full border-primary px-3 text-xs font-bold text-foreground"
                  >
                    <Download className="h-3 w-3" />
                    Ladda ner PDF
                  </Button>
                </div>

                {/* Chefens anteckningar */}
                <div className="space-y-1">
                  <p className="text-xs font-bold text-foreground">Chefens anteckningar</p>
                  <textarea
                    value={note}
                    onChange={(event) => onNoteChange?.(event.target.value)}
                    placeholder="Chefens anteckning, t.ex. Ring efter semester eller intressant för Göteborg..."
                    className="min-h-20 w-full border border-border bg-white p-3 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                {/* Competencies */}
                <div className="space-y-1">
                  <p className="text-xs font-bold text-foreground">Kompetenser</p>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((skill) => (
                      <Badge 
                        key={skill} 
                        variant="secondary" 
                        className={`rounded-none border-0 px-2 py-0.5 text-xs font-bold transition-all duration-200 ${
                          hoveredSkill && skill.toLowerCase() === hoveredSkill.toLowerCase()
                            ? "bg-primary text-black scale-110 shadow-sm"
                            : "bg-secondary text-foreground"
                        }`}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">{candidate.explanation}</p>

                {/* Matched vs Missing details */}
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="border border-primary/20 bg-primary/5 p-3">
                    <p className="brand-kicker text-primary">Matchade krav</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {candidate.matchedSkills.length > 0 ? (
                        candidate.matchedSkills.map((skill) => (
                          <Badge 
                            key={skill} 
                            className={`rounded-none border-0 text-xs font-bold transition-all duration-200 ${
                              hoveredSkill && skill.toLowerCase() === hoveredSkill.toLowerCase()
                                ? "bg-primary text-black scale-110 shadow-sm"
                                : "bg-secondary text-foreground"
                            }`}
                          >
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Inga tydliga kompetenskrav matchade.</span>
                      )}
                    </div>
                  </div>
                  <div className="border border-border bg-[#fafafa] p-3">
                    <p className="brand-kicker text-muted-foreground">Saknade krav</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {candidate.missingSkills.length > 0 ? (
                        candidate.missingSkills.map((skill) => (
                          <Badge key={skill} variant="outline" className="rounded-none text-xs font-bold">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Inga saknade krav i kompetensdelen.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Poängfördelning & sources */}
                {!compact && candidate.skillEvidence.length > 0 && (
                  <div className="border border-border bg-white p-3">
                    <p className="brand-kicker text-primary">Var matchningen hittades</p>
                    <div className="mt-2 grid gap-2 text-xs text-muted-foreground">
                      {candidate.skillEvidence.map((item) => (
                        <div key={`${item.skill}-${item.source}-${item.value}`} className="border border-border bg-[#fafafa] p-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="max-w-full break-words font-bold text-foreground">{item.skill}</span>
                            <span className="shrink-0 bg-primary/15 px-2 py-0.5 font-bold uppercase tracking-[0.04em] text-foreground">
                              {item.source}
                            </span>
                          </div>
                          <p className="mt-1 break-words text-muted-foreground">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!compact && (networkSignals.length > 0 || evidenceSnippets.length > 0) && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {networkSignals.length > 0 && (
                      <div className="border border-primary/20 bg-primary/5 p-3">
                        <p className="brand-kicker flex items-center gap-1.5 text-primary">
                          <Network className="h-3.5 w-3.5" />
                          Nätverkssignaler
                        </p>
                        <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                          {networkSignals.map((signal) => (
                            <div key={`${signal.label}-${signal.reason}`} className="border border-primary/20 bg-white p-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-foreground">{signal.label}</span>
                                <span className="bg-primary/15 px-2 py-0.5 font-bold text-foreground">{signal.strength}</span>
                              </div>
                              <p className="mt-1">{signal.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {evidenceSnippets.length > 0 && (
                      <div className="border border-border bg-[#fafafa] p-3">
                        <p className="brand-kicker flex items-center gap-1.5 text-muted-foreground">
                          <FileSearch className="h-3.5 w-3.5" />
                          Källutdrag
                        </p>
                        <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                          {evidenceSnippets.slice(0, 3).map((snippet) => (
                            <p key={snippet} className="border border-border bg-white p-2">"{snippet}"</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!compact && (
                  <div className="border border-border bg-[#fafafa] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="brand-kicker text-primary">Poängfördelning</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setScoreExpanded(!scoreExpanded)}
                        className="h-7 gap-1 px-2 text-xs font-bold text-muted-foreground"
                      >
                        {candidate.scoreBreakdown.reduce((sum, item) => sum + item.weightedScore, 0)} / 100
                        {scoreExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    </div>
                    {scoreExpanded && (
                      <div className="mt-2 space-y-2">
                        {candidate.scoreBreakdown.map((item) => (
                          <div key={item.label} className="grid gap-2 text-xs sm:grid-cols-[120px_1fr_92px] sm:items-center">
                            <div className="font-bold text-foreground">{item.label}</div>
                            <div className="min-w-0">
                              <div className="h-2 overflow-hidden bg-white">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${Math.min(100, Math.max(0, item.rawScore))}%` }}
                                />
                              </div>
                              <p className="mt-1 break-words text-muted-foreground">{item.reason}</p>
                            </div>
                            <div className="font-mono font-bold text-foreground sm:text-right">
                              {item.weightedScore} p
                              <span className="block font-sans font-normal text-muted-foreground">
                                {item.rawScore}/100 x {item.weight}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="border-l-4 border-primary bg-muted/50 p-3 text-xs text-muted-foreground">
                  Datakvalitet {candidate.dataConfidence.score}/100: {candidate.dataConfidence.reasons.join(", ")}.
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
