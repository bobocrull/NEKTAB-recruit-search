import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, MapPin, Briefcase, Award } from "lucide-react";
import type { ScoredCandidate } from "@/lib/matchingLogic";

interface CompareCandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: ScoredCandidate[];
}

export const CompareCandidatesModal: React.FC<CompareCandidatesModalProps> = ({
  isOpen,
  onClose,
  candidates,
}) => {
  if (candidates.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl bg-[#252E38] text-white border-white/5 font-sans p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-normal text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Jämför valda kandidater ({candidates.length})
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <Table className="border-collapse w-full">
            <TableHeader className="bg-slate-900/50">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="w-1/4 text-white/50 text-xs font-bold uppercase tracking-wider">Kriterie</TableHead>
                {candidates.map((c) => (
                  <TableHead key={c.id} className="text-white text-sm font-semibold border-l border-white/5 p-4 min-w-[200px]">
                    <div className="flex items-center gap-3">
                      {c.avatarUrl || c.profileImageUrl || c.imageUrl ? (
                        <img
                          src={c.avatarUrl || c.profileImageUrl || c.imageUrl}
                          alt={c.name}
                          className="h-10 w-10 rounded-full object-cover border border-primary/30"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold border border-primary/20 text-sm">
                          {c.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-white leading-tight">{c.name}</h4>
                        <p className="text-xs text-white/40 mt-0.5">{c.company}</p>
                      </div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Match Score */}
              <TableRow className="border-white/5 hover:bg-white/5 transition-all">
                <TableCell className="font-bold text-xs uppercase tracking-wider text-white/60">Match Score</TableCell>
                {candidates.map((c) => (
                  <TableCell key={c.id} className="border-l border-white/5 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-light text-primary">{c.score}%</span>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${c.score}%` }} />
                      </div>
                    </div>
                  </TableCell>
                ))}
              </TableRow>

              {/* Titel & Företag */}
              <TableRow className="border-white/5 hover:bg-white/5 transition-all">
                <TableCell className="font-bold text-xs uppercase tracking-wider text-white/60">Nuvarande roll</TableCell>
                {candidates.map((c) => (
                  <TableCell key={c.id} className="border-l border-white/5 p-4 text-sm">
                    <div className="flex items-start gap-1.5">
                      <Briefcase className="h-4 w-4 text-white/30 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-white">{c.currentRole || "Ej specificerad"}</p>
                        <p className="text-xs text-white/50 mt-0.5">{c.company || "Okänt bolag"}</p>
                      </div>
                    </div>
                  </TableCell>
                ))}
              </TableRow>

              {/* Erfarenhet */}
              <TableRow className="border-white/5 hover:bg-white/5 transition-all">
                <TableCell className="font-bold text-xs uppercase tracking-wider text-white/60">Erfarenhet</TableCell>
                {candidates.map((c) => (
                  <TableCell key={c.id} className="border-l border-white/5 p-4 text-sm text-white/80">
                    {c.yearsOfExperience !== null ? `${c.yearsOfExperience} år` : "Okänt"}
                  </TableCell>
                ))}
              </TableRow>

              {/* Plats */}
              <TableRow className="border-white/5 hover:bg-white/5 transition-all">
                <TableCell className="font-bold text-xs uppercase tracking-wider text-white/60">Plats</TableCell>
                {candidates.map((c) => (
                  <TableCell key={c.id} className="border-l border-white/5 p-4 text-sm text-white/80">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-white/30 shrink-0" />
                      <span>{c.location || "Okänt"}</span>
                    </div>
                  </TableCell>
                ))}
              </TableRow>

              {/* Matchade Kompetenser */}
              <TableRow className="border-white/5 hover:bg-white/5 transition-all">
                <TableCell className="font-bold text-xs uppercase tracking-wider text-white/60">Matchade kompetenser</TableCell>
                {candidates.map((c) => (
                  <TableCell key={c.id} className="border-l border-white/5 p-4">
                    <div className="flex flex-wrap gap-1">
                      {c.matchedSkills && c.matchedSkills.length > 0 ? (
                        c.matchedSkills.map((s) => (
                          <Badge key={s} variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-[10px] rounded-none py-0.5 px-1.5 flex items-center gap-1 font-normal">
                            <Check className="h-3 w-3" />
                            {s}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-white/30 italic">Inga direkta träffar</span>
                      )}
                    </div>
                  </TableCell>
                ))}
              </TableRow>

              {/* Saknade Kompetenser */}
              <TableRow className="border-white/5 hover:bg-white/5 transition-all">
                <TableCell className="font-bold text-xs uppercase tracking-wider text-white/60">Saknade kompetenser</TableCell>
                {candidates.map((c) => (
                  <TableCell key={c.id} className="border-l border-white/5 p-4">
                    <div className="flex flex-wrap gap-1">
                      {c.missingSkills && c.missingSkills.length > 0 ? (
                        c.missingSkills.map((s) => (
                          <Badge key={s} variant="outline" className="bg-white/5 text-white/50 border-white/10 text-[10px] rounded-none py-0.5 px-1.5 flex items-center gap-1 font-normal">
                            <X className="h-3 w-3 text-white/20" />
                            {s}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-primary/80 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          Alla krav uppfyllda
                        </span>
                      )}
                    </div>
                  </TableCell>
                ))}
              </TableRow>

              {/* Red Flags */}
              <TableRow className="border-white/5 hover:bg-white/5 transition-all">
                <TableCell className="font-bold text-xs uppercase tracking-wider text-white/60">Red flags / risker</TableCell>
                {candidates.map((c) => (
                  <TableCell key={c.id} className="border-l border-white/5 p-4 text-xs">
                    {c.redFlags && c.redFlags.length > 0 ? (
                      <div className="space-y-1">
                        {c.redFlags.map((flag) => (
                          <div key={flag} className="text-red-400 font-medium flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                            {flag}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-primary/70">Inga flaggor</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
