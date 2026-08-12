import React, { useMemo } from "react";
import type { ScoredCandidate } from "@/lib/matchingLogic";
import { Users, Percent, Award, PhoneCall } from "lucide-react";

interface AnalyticsDashboardProps {
  candidatePool: ScoredCandidate[];
  requirements: any;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  candidatePool,
  requirements,
}) => {
  const stats = useMemo(() => {
    if (!candidatePool.length) {
      return { count: 0, avgScore: 0, topScore: 0, contactable: 0 };
    }
    const count = candidatePool.length;
    const totalScore = candidatePool.reduce((sum, c) => sum + (c.score || 0), 0);
    const avgScore = Math.round(totalScore / count);
    const topScore = Math.max(...candidatePool.map((c) => c.score || 0));
    const contactable = candidatePool.filter(
      (c) => c.email?.trim() || c.phone?.trim() || c.linkedin?.trim()
    ).length;

    return { count, avgScore, topScore, contactable };
  }, [candidatePool]);

  if (!requirements) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in mb-6">
      {/* Total Candidates */}
      <div className="glass-panel p-5 relative overflow-hidden flex items-center justify-between">
        <div>
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider">Antal matchningar</p>
          <h3 className="text-3xl font-light mt-1 text-white">{stats.count}</h3>
        </div>
        <div className="p-3 bg-primary/10 rounded-full border border-primary/20">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/40 to-transparent" />
      </div>

      {/* Average Score */}
      <div className="glass-panel p-5 relative overflow-hidden flex items-center justify-between">
        <div>
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider">Genomsnittlig match</p>
          <h3 className="text-3xl font-light mt-1 text-white">{stats.avgScore}%</h3>
        </div>
        <div className="p-3 bg-primary/10 rounded-full border border-primary/20">
          <Percent className="h-6 w-6 text-primary" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/40 to-transparent" />
      </div>

      {/* Top Score */}
      <div className="glass-panel p-5 relative overflow-hidden flex items-center justify-between">
        <div>
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider">Toppkandidat</p>
          <h3 className="text-3xl font-light mt-1 text-white">{stats.topScore}%</h3>
        </div>
        <div className="p-3 bg-primary/10 rounded-full border border-primary/20">
          <Award className="h-6 w-6 text-primary" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/40 to-transparent" />
      </div>

      {/* Contactable */}
      <div className="glass-panel p-5 relative overflow-hidden flex items-center justify-between">
        <div>
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider">Direkt kontaktbara</p>
          <h3 className="text-3xl font-light mt-1 text-white">{stats.contactable}</h3>
        </div>
        <div className="p-3 bg-primary/10 rounded-full border border-primary/20">
          <PhoneCall className="h-6 w-6 text-primary" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/40 to-transparent" />
      </div>
    </div>
  );
};
