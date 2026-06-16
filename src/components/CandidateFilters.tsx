import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

export interface CandidateFiltersState {
  minScore: number;
  location: string;
  requiredSkills: string[];
  sortBy: "score" | "skill" | "network" | "experience" | "name";
  viewMode: "cards" | "compact";
}

const DEFAULT_FILTERS: CandidateFiltersState = {
  minScore: 0,
  location: "",
  requiredSkills: [],
  sortBy: "score",
  viewMode: "cards",
};

export function CandidateFilters({
  filters,
  onChange,
  availableSkills,
}: {
  filters: CandidateFiltersState;
  onChange: (filters: CandidateFiltersState) => void;
  availableSkills: string[];
}) {
  const [skillInput, setSkillInput] = useState("");

  const hasActiveFilters =
    filters.minScore > 0 ||
    filters.location.trim() !== "" ||
    filters.requiredSkills.length > 0 ||
    filters.sortBy !== DEFAULT_FILTERS.sortBy ||
    filters.viewMode !== DEFAULT_FILTERS.viewMode;

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !filters.requiredSkills.includes(trimmed)) {
      onChange({ ...filters, requiredSkills: [...filters.requiredSkills, trimmed] });
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    onChange({ ...filters, requiredSkills: filters.requiredSkills.filter((s) => s !== skill) });
  };

  const suggestions = skillInput.trim()
    ? availableSkills.filter(
        (skill) =>
          skill.toLowerCase().includes(skillInput.toLowerCase()) &&
          !filters.requiredSkills.includes(skill)
      )
    : [];

  return (
    <div className="space-y-4 bg-white p-5 shadow-[0_6px_18px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between">
        <h3 className="brand-kicker flex items-center gap-1.5 text-foreground">
          <Filter className="h-3.5 w-3.5" /> Filter
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs font-bold text-muted-foreground"
            onClick={() => onChange(DEFAULT_FILTERS)}
          >
            Rensa alla
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Lägsta poäng: <span className="font-mono font-bold text-foreground">{filters.minScore}</span>
        </Label>
        <Slider
          value={[filters.minScore]}
          onValueChange={([value]) => onChange({ ...filters, minScore: value })}
          max={100}
          step={5}
          className="w-full"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Plats</Label>
        <Input
          value={filters.location}
          onChange={(event) => onChange({ ...filters, location: event.target.value })}
          placeholder="t.ex. Stockholm, Remote"
          className="h-9 rounded-none border-border text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Kompetenser</Label>
        <div className="relative">
          <Input
            value={skillInput}
            onChange={(event) => setSkillInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addSkill(skillInput);
              }
            }}
            placeholder="Skriv och tryck Enter"
            className="h-9 rounded-none border-border text-xs"
          />
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-28 overflow-y-auto border border-border bg-popover p-1 shadow-md">
              {suggestions.slice(0, 6).map((skill) => (
                <button
                  key={skill}
                  onClick={() => addSkill(skill)}
                  className="w-full px-2 py-1 text-left text-xs hover:bg-accent"
                >
                  {skill}
                </button>
              ))}
            </div>
          )}
        </div>
        {filters.requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {filters.requiredSkills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="cursor-pointer gap-1 rounded-none border-0 bg-secondary text-xs font-bold"
                onClick={() => removeSkill(skill)}
              >
                {skill}
                <X className="h-2.5 w-2.5" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Sortera</Label>
        <select
          value={filters.sortBy}
          onChange={(event) =>
            onChange({ ...filters, sortBy: event.target.value as CandidateFiltersState["sortBy"] })
          }
          className="h-9 w-full border border-border bg-white px-3 text-xs text-foreground outline-none focus:border-primary"
        >
          <option value="score">Högst totalpoäng</option>
          <option value="skill">Bäst kompetensmatch</option>
          <option value="network">Starkast nätverkssignal</option>
          <option value="experience">Mest erfarenhet</option>
          <option value="name">Namn A-Ö</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Visning</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={filters.viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ ...filters, viewMode: "cards" })}
            className={
              filters.viewMode === "cards"
                ? "site-button h-9 rounded-none px-3 text-xs"
                : "h-9 rounded-none px-3 text-xs font-bold"
            }
          >
            Kort
          </Button>
          <Button
            type="button"
            variant={filters.viewMode === "compact" ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ ...filters, viewMode: "compact" })}
            className={
              filters.viewMode === "compact"
                ? "site-button h-9 rounded-none px-3 text-xs"
                : "h-9 rounded-none px-3 text-xs font-bold"
            }
          >
            Kompakt
          </Button>
        </div>
      </div>
    </div>
  );
}
