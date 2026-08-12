import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, Mail, Send } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import type { ScoredCandidate } from "@/lib/matchingLogic";

interface OutreachEditorProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: ScoredCandidate | null;
  recruiterName: string;
  requirements: any;
}

const TEMPLATES = [
  {
    id: "first_contact",
    name: "Första kontakt (Matchning)",
    subject: "Karriärmöjlighet hos NEKTAB - {RollTitel}",
    body: `Hej {KandidatNamn},

Jag hoppas att allt är bra med dig!

Mitt namn är {RekryterarNamn} och jag arbetar med kompetenssourcing på NEKTAB. Vi söker just nu en duktig {RollTitel} och när jag granskade din profil blev jag väldigt imponerad av din bakgrund, särskilt din erfarenhet inom {MatchadeKompetenser} och ditt arbete hos {NuvarandeBolag}.

Vårt system indikerar en mycket stark kompetensmatchning med vad vi letar efter. Skulle du vara öppen för ett kort, förutsättningslöst telefonsamtal eller en fika för att höra mer om vad vi på NEKTAB har att erbjuda?

Med vänliga hälsningar,
{RekryterarNamn}
NEKTAB
{RekryterarEmail}`
  },
  {
    id: "follow_up",
    name: "Uppföljning (Tidigare kontakt)",
    subject: "Uppföljning gällande din profil - NEKTAB",
    body: `Hej {KandidatNamn},

Hoppas du har en fin vecka!

Vi hördes av för ett tag sedan, eller så har jag haft din intressanta profil sparad i vår interna databas. Vi på NEKTAB expanderar nu inom elnätssektorn och har flera spännande projekt på gång där din kompetens inom {MatchadeKompetenser} skulle spela en nyckelroll.

Har din situation förändrats, eller är du nyfiken på att ta ett kort samtal om vad som händer hos oss just nu?

Varma hälsningar,
{RekryterarNamn}
NEKTAB`
  },
  {
    id: "interview",
    name: "Inbjudan till intervju",
    subject: "Intervjuförfrågan: {RollTitel} hos NEKTAB",
    body: `Hej {KandidatNamn},

Tack för ditt intresse för NEKTAB och rollen som {RollTitel}!

Vi har granskat din matchningsprofil och träffat dig i vårt urval som en mycket intressant kandidat. Vi vill gärna bjuda in dig till en första digital intervju för att lära känna varandra lite bättre och berätta mer om uppdraget.

Intervjun beräknas ta cirka 30-45 minuter. Vilka av följande tider skulle passa dig bäst under nästa vecka?
[Förslag på tider]

Ser fram emot att höra från dig!

Vänliga hälsningar,
{RekryterarNamn}
NEKTAB`
  }
];

export const OutreachEditor: React.FC<OutreachEditorProps> = ({
  isOpen,
  onClose,
  candidate,
  recruiterName,
  requirements,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState("first_contact");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!candidate) return;

    const template = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];
    const candidateName = candidate.name.split(" ")[0];
    const rollTitel = requirements?.jobTitles?.[0] || candidate.currentRole || "Konsult/Ingenjör";
    const company = candidate.company || "nuvarande arbetsgivare";
    const matchedSkillsText = candidate.matchedSkills?.slice(0, 3).join(", ") || "elkraft";

    const emailSubject = template.subject
      .replace(/{KandidatNamn}/g, candidateName)
      .replace(/{RollTitel}/g, rollTitel)
      .replace(/{NuvarandeBolag}/g, company);

    const emailBody = template.body
      .replace(/{KandidatNamn}/g, candidateName)
      .replace(/{RekryterarNamn}/g, recruiterName || "NEKTAB Sourcing")
      .replace(/{RollTitel}/g, rollTitel)
      .replace(/{NuvarandeBolag}/g, company)
      .replace(/{MatchadeKompetenser}/g, matchedSkillsText)
      .replace(/{RekryterarEmail}/g, recruiterName ? `${recruiterName.toLowerCase().replace(/\s+/g, ".")}@nektab.se` : "info@nektab.se");

    setSubject(emailSubject);
    setBody(emailBody);
    setCopied(false);
  }, [candidate, selectedTemplateId, recruiterName, requirements]);

  if (!candidate) return null;

  const handleCopy = async () => {
    try {
      const fullText = `Ämne: ${subject}\n\n${body}`;
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast({ title: "Kopierad till urklipp!", description: "Meddelandet kan nu klistras in i ditt e-postprogram." });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: "Kunde inte kopiera", variant: "destructive" });
    }
  };

  const handleSendEmail = () => {
    const mailtoUrl = `mailto:${candidate.email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#252E38] text-white border-white/5 font-sans p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-normal text-white flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Skapa outreach-meddelande till {candidate.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mallväljare */}
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-bold uppercase tracking-wider">Välj mall</label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="w-full bg-slate-900/50 border-white/10 text-white rounded-none">
                <SelectValue placeholder="Välj en mall..." />
              </SelectTrigger>
              <SelectContent className="bg-[#252E38] text-white border-white/5">
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="hover:bg-primary/10 hover:text-white focus:bg-primary/10 focus:text-white">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ämnesrad */}
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-bold uppercase tracking-wider">Ämnesrad</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-10 px-3 bg-slate-900/50 border border-white/10 text-sm rounded-none outline-none focus:border-primary transition-all text-white"
            />
          </div>

          {/* Meddelandetext */}
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-bold uppercase tracking-wider">Meddelande</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full bg-slate-900/50 border-white/10 text-sm rounded-none outline-none focus:border-primary transition-all text-white p-3 font-sans resize-none"
            />
          </div>

          {/* Knappar */}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className="border-white/10 text-white hover:bg-white/5 hover:text-white rounded-none flex items-center gap-2 h-11 px-5"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-primary animate-bounce" />
                  Kopierad!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-white/60" />
                  Kopiera text
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={handleSendEmail}
              className="bg-primary text-black hover:bg-primary/95 font-bold rounded-none flex items-center gap-2 h-11 px-5"
            >
              <Send className="h-4 w-4" />
              Öppna e-post (mailto)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
