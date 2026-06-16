import { useEffect, useState } from "react";
import { JobRequirements } from "@/lib/matchingLogic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Target, MapPin, Briefcase, Building2, Layers, Pencil, Plus, Save, Search, X } from "lucide-react";

interface JobRequirementsPanelProps {
  requirements: JobRequirements;
  onChange?: (requirements: JobRequirements) => void;
  onSearchAgain?: (requirements: JobRequirements) => void;
  isSearching?: boolean;
}

type ListKey = "keySkills" | "jobTitles" | "targetCompanies" | "industries";

const editableLists: Array<{ key: ListKey; label: string; icon?: "briefcase" | "building" }> = [
  { key: "keySkills", label: "Kompetenser" },
  { key: "jobTitles", label: "Titlar", icon: "briefcase" },
  { key: "targetCompanies", label: "Meriterande bolagsmiljö", icon: "building" },
  { key: "industries", label: "Bransch", icon: "building" },
];

function cleanRequirementValue(value: string) {
  return value
    .replace(/\uFFFD/g, "")
    .replace(/\s+(på|till|och|eller|med|inom)$/i, "")
    .replace(/^(på|till|och|eller|med|inom)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanList(value: string[]) {
  const stopWords = new Set(["på", "till", "och", "eller", "med", "inom", "från", "for", "of", "and"]);
  return Array.from(
    new Set(
      value
        .map(cleanRequirementValue)
        .filter((item) => item.length > 1 && !stopWords.has(item.toLowerCase()))
    )
  );
}

export function JobRequirementsPanel({
  requirements,
  onChange,
  onSearchAgain,
  isSearching = false,
}: JobRequirementsPanelProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<JobRequirements>(requirements);
  const [newValues, setNewValues] = useState<Record<ListKey, string>>({
    keySkills: "",
    jobTitles: "",
    targetCompanies: "",
    industries: "",
  });

  useEffect(() => {
    setDraft(requirements);
  }, [requirements]);

  const current = editing ? draft : requirements;

  const addValue = (key: ListKey) => {
    const values = newValues[key]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (values.length === 0) return;
    setDraft((prev) => ({ ...prev, [key]: cleanList([...(prev[key] || []), ...values]) }));
    setNewValues((prev) => ({ ...prev, [key]: "" }));
  };

  const removeValue = (key: ListKey, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: prev[key].filter((item) => item !== value) }));
  };

  const saveDraft = () => {
    const next = {
      ...draft,
      keySkills: cleanList(draft.keySkills),
      jobTitles: cleanList(draft.jobTitles),
      targetCompanies: cleanList(draft.targetCompanies),
      industries: cleanList(draft.industries),
      location: draft.location?.trim() || null,
      seniorityLevel: draft.seniorityLevel?.trim() || "mid",
      yearsOfExperience: draft.yearsOfExperience ? Number(draft.yearsOfExperience) : null,
    };
    setDraft(next);
    onChange?.(next);
    setEditing(false);
  };

  const searchAgain = () => {
    const next = editing ? draft : requirements;
    const cleaned = {
      ...next,
      keySkills: cleanList(next.keySkills),
      jobTitles: cleanList(next.jobTitles),
      targetCompanies: cleanList(next.targetCompanies),
      industries: cleanList(next.industries),
      location: next.location?.trim() || null,
    };
    onChange?.(cleaned);
    onSearchAgain?.(cleaned);
  };

  return (
    <Card className="border-0 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.08)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="brand-kicker flex min-w-0 items-center gap-2 text-lg leading-tight">
            <Target className="h-4 w-4 text-primary" />
            Extraherade Krav
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing((value) => !value)}
            className="h-9 shrink-0 rounded-full border-primary px-3 text-xs font-bold normal-case"
          >
            <Pencil className="h-3.5 w-3.5" />
            {editing ? "Avbryt" : "Redigera"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-start gap-2">
          <Layers className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <span className="font-medium">Senioritet:</span>{" "}
            {editing ? (
              <div className="mt-2 grid grid-cols-[1fr_82px] gap-2">
                <select
                  value={draft.seniorityLevel || "mid"}
                  onChange={(event) => setDraft((prev) => ({ ...prev, seniorityLevel: event.target.value }))}
                  className="h-9 border border-border bg-white px-2 text-xs outline-none focus:border-primary"
                >
                  {["junior", "mid", "senior", "lead", "principal"].map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={0}
                  value={draft.yearsOfExperience ?? ""}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      yearsOfExperience: event.target.value ? Number(event.target.value) : null,
                    }))
                  }
                  placeholder="år"
                  className="h-9 rounded-none border-border text-xs"
                />
              </div>
            ) : (
              <>
                <span className="capitalize text-muted-foreground">{current.seniorityLevel || "Ej specificerat"}</span>
                {current.yearsOfExperience && (
                  <span className="text-muted-foreground"> · {current.yearsOfExperience}+ år</span>
                )}
              </>
            )}
          </div>
        </div>

        {editableLists.map(({ key, label, icon }) => {
          const values = current[key] || [];
          const Icon = icon === "briefcase" ? Briefcase : icon === "building" ? Building2 : null;
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center gap-2">
                {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {values.length > 0 ? values.map((value) => (
                  <Badge key={value} className="gap-1 rounded-none border-0 bg-secondary text-xs font-bold text-foreground hover:bg-primary/25">
                    {value}
                    {editing && (
                      <button type="button" onClick={() => removeValue(key, value)} aria-label={`Ta bort ${value}`}>
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                )) : (
                  <span className="text-xs text-muted-foreground">Inget angivet.</span>
                )}
              </div>
              {editing && (
                <div className="flex gap-2">
                  <Input
                    value={newValues[key]}
                    onChange={(event) => setNewValues((prev) => ({ ...prev, [key]: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addValue(key);
                      }
                    }}
                    placeholder={`Lägg till ${label.toLowerCase()}`}
                    className="h-9 rounded-none border-border text-xs"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => addValue(key)} className="h-9 rounded-full border-primary px-3">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              {key === "targetCompanies" && values.length > 0 && !editing && (
                <p className="pl-5 text-xs leading-relaxed text-muted-foreground">
                  Listan begränsar inte sökningen. Den används som en positiv signal i poängen när en kandidat verkar komma från relevant bolag eller bransch.
                </p>
              )}
            </div>
          );
        })}

        <div className="flex items-start gap-2">
          <MapPin className="mt-2 h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex-1">
            {editing ? (
              <Input
                value={draft.location || ""}
                onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="Plats"
                className="h-9 rounded-none border-border text-xs"
              />
            ) : (
              <span className="text-muted-foreground">{current.location || "Ingen plats angiven"}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {editing && (
            <Button type="button" onClick={saveDraft} className="site-button h-9 w-full gap-2">
              <Save className="h-4 w-4" />
              Spara krav
            </Button>
          )}
          <Button
            type="button"
            onClick={searchAgain}
            disabled={isSearching}
            variant="outline"
            className="h-9 w-full rounded-full border-2 border-primary bg-transparent font-bold normal-case text-foreground hover:bg-primary hover:text-black"
          >
            <Search className="h-4 w-4" />
            {isSearching ? "Söker..." : "Sök igen med krav"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
