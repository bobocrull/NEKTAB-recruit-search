import { useState } from "react";
import { ScoredCandidate } from "@/lib/matchingLogic";
import { downloadCandidatePdf } from "@/lib/pdfExport";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Briefcase, Clock, Database, Mail, Phone, Linkedin, Download, ChevronDown, ChevronUp, Copy, AlertTriangle, Search, Sparkles, Network, FileSearch } from "lucide-react";

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

interface CandidateCardProps {
  candidate: ScoredCandidate;
  rank: number;
  selected?: boolean;
  compact?: boolean;
  pipelineStatus?: string;
  feedback?: string;
  note?: string;
  onPipelineChange?: (status: PipelineStatus) => void;
  onFeedbackChange?: (feedback: FeedbackTag) => void;
  onNoteChange?: (note: string) => void;
  onCopyOutreach?: () => void;
  onEnrich?: () => void;
  onSelectedChange?: (selected: boolean) => void;
  onSaveToDb?: () => void;
}

export function CandidateCard({
  candidate,
  rank,
  selected = false,
  compact = false,
  pipelineStatus = "Ny",
  feedback,
  note = "",
  onPipelineChange,
  onFeedbackChange,
  onNoteChange,
  onCopyOutreach,
  onEnrich,
  onSelectedChange,
  onSaveToDb,
}: CandidateCardProps) {
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

  return (
    <Card className={`border-0 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.12)] ${selected ? "ring-2 ring-primary" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {onSelectedChange && (
            <Checkbox
              checked={selected}
              onCheckedChange={(value) => onSelectedChange(value === true)}
              aria-label={`Välj ${candidate.name} för export`}
              className="mt-3 h-5 w-5 shrink-0 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-black"
            />
          )}

          <div className="shrink-0">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className={`flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold ${scoreBg(candidate.score)} ${scoreColor(candidate.score)}`}>
                {initials || `#${rank}`}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3 overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words text-lg font-bold text-foreground">{candidate.name}</h3>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5 shrink-0" />
                  <span className="break-words">{candidate.currentRole} på {candidate.company}</span>
                </p>
              </div>
              <div className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-lg font-bold ${scoreBg(candidate.score)} ${scoreColor(candidate.score)}`}>
                {candidate.score}
              </div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{candidate.yearsOfExperience} års erfarenhet</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{candidate.location}</span>
              <span className="flex items-center gap-1"><Database className="h-3 w-3" />{candidate.sourceCategory || "Öppen webb"}</span>
              {networkSignals.length > 0 && (
                <span className="flex items-center gap-1 font-bold text-foreground">
                  <Network className="h-3 w-3" />{networkSignals.length} nätverkssignaler
                </span>
              )}
              <span className={`inline-flex items-center px-2 font-bold ${confidenceColor}`}>
                Datakvalitet: {candidate.dataConfidence.level}
              </span>
              <span className="inline-flex items-center bg-primary/10 px-2 font-bold text-foreground">
                Kontaktbar: {contactSignals.length}/3{contactSignals.length > 0 ? ` (${contactSignals.join(", ")})` : ""}
              </span>
            </div>

            <div className="border-l-4 border-primary bg-primary/5 p-3 text-sm font-bold text-foreground">
              {candidate.decisionSummary}
            </div>

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

            <div className="flex flex-wrap gap-2 text-xs">
              {linkedInUrl ? (
                <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 border border-primary px-2 py-1 font-bold text-foreground hover:bg-primary/20">
                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 border border-border px-2 py-1 text-muted-foreground">
                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn saknas
                </span>
              )}
              {isAvailable(candidate.email) ? (
                <a href={`mailto:${candidate.email}`} className="inline-flex items-center gap-1 border border-primary px-2 py-1 font-bold text-foreground hover:bg-primary/20">
                  <Mail className="h-3.5 w-3.5" /> {candidate.email}
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 border border-border px-2 py-1 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> E-post saknas
                </span>
              )}
              {isAvailable(candidate.phone) ? (
                <a href={`tel:${candidate.phone}`} className="inline-flex items-center gap-1 border border-primary px-2 py-1 font-bold text-foreground hover:bg-primary/20">
                  <Phone className="h-3.5 w-3.5" /> {candidate.phone}
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 border border-border px-2 py-1 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> Telefon saknas
                </span>
              )}
            </div>

            {(candidate.redFlags.length > 0 || feedback) && (
              <div className="flex flex-wrap gap-1.5">
                {candidate.redFlags.map((flag) => (
                  <Badge key={flag} variant="outline" className="gap-1 rounded-none border-score-low/40 text-xs font-bold text-score-low">
                    <AlertTriangle className="h-3 w-3" /> {flag}
                  </Badge>
                ))}
                {feedback && (
                  <Badge variant="outline" className="rounded-none text-xs font-bold">
                    Feedback: {feedback}
                  </Badge>
                )}
              </div>
            )}

            <div className="grid gap-2 md:grid-cols-[180px_1fr_auto] md:items-center">
              <select
                value={pipelineStatus}
                onChange={(event) => onPipelineChange?.(event.target.value as PipelineStatus)}
                className="h-9 border border-border bg-white px-3 text-xs font-bold text-foreground outline-none focus:border-primary"
              >
                {PIPELINE_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <select
                value={feedback || ""}
                onChange={(event) => {
                  if (event.target.value) {
                    onFeedbackChange?.(event.target.value as FeedbackTag);
                  }
                }}
                className="h-9 border border-border bg-white px-3 text-xs font-bold text-foreground outline-none focus:border-primary"
              >
                <option value="">Feedback</option>
                {FEEDBACK_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <Button type="button" variant="outline" size="sm" onClick={onCopyOutreach} className="h-9 gap-1 rounded-full border-primary text-xs font-bold">
                <Copy className="h-3.5 w-3.5" /> Kopiera meddelande
              </Button>
            </div>

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
            </div>

            <textarea
              value={note}
              onChange={(event) => onNoteChange?.(event.target.value)}
              placeholder="Chefens anteckning, t.ex. Ring efter semester eller intressant för Göteborg..."
              className="min-h-20 w-full border border-border bg-white p-3 text-xs text-foreground outline-none focus:border-primary"
            />

            <div className="flex flex-wrap gap-1.5">
              {candidate.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="rounded-none border-0 bg-secondary px-2 text-xs font-bold">
                  {skill}
                </Badge>
              ))}
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">{candidate.explanation}</p>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="border border-primary/20 bg-primary/5 p-3">
                <p className="brand-kicker text-primary">Matchade krav</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {candidate.matchedSkills.length > 0 ? (
                    candidate.matchedSkills.map((skill) => (
                      <Badge key={skill} className="rounded-none border-0 bg-secondary text-xs font-bold text-foreground">
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

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setContactExpanded(!contactExpanded)}
                className="h-7 gap-1 px-2 text-xs font-bold text-muted-foreground"
              >
                {contactExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Kontaktuppgifter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCandidatePdf(candidate)}
                className="h-7 gap-1 rounded-full border-primary px-3 text-xs font-bold text-foreground"
              >
                <Download className="h-3 w-3" />
                Ladda ner PDF
              </Button>
            </div>

            {contactExpanded && (
              <div className="space-y-1.5 border-l-4 border-primary bg-muted/50 p-3 text-sm">
                {isAvailable(candidate.email) && (
                  <a href={`mailto:${candidate.email}`} className="flex items-center gap-2 text-foreground transition-colors hover:text-primary">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {candidate.email}
                  </a>
                )}
                {isAvailable(candidate.phone) && (
                  <a href={`tel:${candidate.phone}`} className="flex items-center gap-2 text-foreground transition-colors hover:text-primary">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {candidate.phone}
                  </a>
                )}
                {linkedInUrl && (
                  <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground transition-colors hover:text-primary">
                    <Linkedin className="h-3.5 w-3.5 text-muted-foreground" />
                    {candidate.linkedin}
                  </a>
                )}
                {!isAvailable(candidate.email) && !isAvailable(candidate.phone) && !linkedInUrl && (
                  <p className="text-muted-foreground">Inga kontaktuppgifter hittades.</p>
                )}
                <p className="pt-2 text-xs text-muted-foreground">
                  Datakvalitet {candidate.dataConfidence.score}/100: {candidate.dataConfidence.reasons.join(", ")}.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
