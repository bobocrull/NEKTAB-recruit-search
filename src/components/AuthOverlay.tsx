import React from "react";
import { Button } from "@/components/ui/button";
import { Lock, MailIcon, User, ArrowRight, Loader2 } from "lucide-react";

interface AuthOverlayProps {
  session: any;
  sessionLoading: boolean;
  authMode: "signin" | "signup" | "forgot";
  setAuthMode: (mode: "signin" | "signup" | "forgot") => void;
  authEmail: string;
  setAuthEmail: (email: string) => void;
  authPassword: string;
  setAuthPassword: (password: string) => void;
  fullName: string;
  setFullName: (name: string) => void;
  authLoading: boolean;
  handleAuth: (e: React.FormEvent) => void;
  handleForgotPassword: (e: React.FormEvent) => void;
  
  recoveryMode: boolean;
  newPassword: string;
  setNewPassword: (password: string) => void;
  newPasswordConfirm: string;
  setNewPasswordConfirm: (password: string) => void;
  handleUpdatePassword: (e: React.FormEvent) => void;
  onCancelRecovery: () => void;
}

export const AuthOverlay: React.FC<AuthOverlayProps> = ({
  session,
  sessionLoading,
  authMode,
  setAuthMode,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  fullName,
  setFullName,
  authLoading,
  handleAuth,
  handleForgotPassword,
  
  recoveryMode,
  newPassword,
  setNewPassword,
  newPasswordConfirm,
  setNewPasswordConfirm,
  handleUpdatePassword,
  onCancelRecovery,
}) => {
  if (sessionLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#1E252B]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Render Recovery Interface
  if (recoveryMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1E252B] p-4 font-sans text-white">
        <div className="w-full max-w-md bg-[#252E38]/90 p-8 shadow-[0_12px_40px_rgba(0,0,0,0.25)] border border-white/5 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-[#5FC891]/60" />
          <div className="flex flex-col items-center text-center">
            <img src="/nektab-logo-rgb.png" alt="NEKTAB" className="h-10 w-auto brightness-0 invert" />
            <p className="brand-kicker mt-6 text-primary tracking-[0.08em] uppercase text-xs font-bold">Candidate Intelligence</p>
            <h2 className="mt-2 text-2xl font-normal text-white">
              Välj ett nytt lösenord
            </h2>
          </div>

          <form onSubmit={handleUpdatePassword} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-white/60 font-bold uppercase tracking-wider">Nytt Lösenord</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-white/40" />
                <input
                  type="password"
                  placeholder="Minst 6 tecken"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 w-full border border-white/10 bg-white/5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:bg-white/10 transition-all text-white placeholder:text-white/30"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-white/60 font-bold uppercase tracking-wider">Bekräfta Nytt Lösenord</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-white/40" />
                <input
                  type="password"
                  placeholder="Bekräfta lösenordet"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
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
                  Spara nytt lösenord
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-white/50">
            <button 
              type="button"
              onClick={onCancelRecovery} 
              className="text-primary hover:underline font-bold"
            >
              Avbryt och gå till inloggning
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Auth Interface if no active session
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1E252B] p-4 font-sans text-white">
        <div className="w-full max-w-md bg-[#252E38]/90 p-8 shadow-[0_12px_40px_rgba(0,0,0,0.25)] border border-white/5 relative overflow-hidden backdrop-blur-md animate-fade-in">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-[#5FC891]/60" />
          <div className="flex flex-col items-center text-center">
            <img src="/nektab-logo-rgb.png" alt="NEKTAB" className="h-10 w-auto brightness-0 invert" />
            <p className="brand-kicker mt-6 text-primary tracking-[0.08em] uppercase text-xs font-bold">Candidate Intelligence</p>
            <h2 className="mt-2 text-2xl font-normal text-white">
              {authMode === "signin" && "Strategisk kompetenssökning"}
              {authMode === "signup" && "Skapa chefs-konto"}
              {authMode === "forgot" && "Återställ lösenord"}
            </h2>
          </div>

          {authMode === "forgot" ? (
            <form onSubmit={handleForgotPassword} className="mt-8 space-y-4">
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

              <Button type="submit" disabled={authLoading} className="site-button w-full h-11 bg-primary text-black hover:bg-primary/95 font-bold mt-4 flex items-center justify-center gap-2 transition-all rounded-none">
                {authLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Skicka återställningslänk
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="mt-8 space-y-4">
              {authMode === "signup" && (
                <div className="space-y-1.5 animate-slide-down">
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
                <div className="flex justify-between items-center">
                  <label className="text-xs text-white/60 font-bold uppercase tracking-wider">Lösenord</label>
                  {authMode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setAuthMode("forgot")}
                      className="text-xs text-primary/80 hover:text-primary hover:underline font-bold focus:outline-none"
                    >
                      Glömt lösenordet?
                    </button>
                  )}
                </div>
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
          )}

          <div className="mt-6 text-center text-xs text-white/50">
            {authMode === "signin" && (
              <p>
                Saknar du konto?{" "}
                <button onClick={() => setAuthMode("signup")} className="text-primary hover:underline font-bold">
                  Skapa ett här
                </button>
              </p>
            )}
            {authMode === "signup" && (
              <p>
                Har du redan ett konto?{" "}
                <button onClick={() => setAuthMode("signin")} className="text-primary hover:underline font-bold">
                  Logga in här
                </button>
              </p>
            )}
            {authMode === "forgot" && (
              <p>
                Kommer du ihåg lösenordet?{" "}
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

  return null;
};
