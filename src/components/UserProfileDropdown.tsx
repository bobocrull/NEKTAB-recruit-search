import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, LogOut, Key, FolderHeart, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface UserProfileDropdownProps {
  session: any;
  onSignOut: () => void;
  onShowSaved: () => void;
  supabase: any;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  session,
  onSignOut,
  onShowSaved,
  supabase,
}) => {
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const email = session?.user?.email || "chef@nektab.se";
  const fullName = session?.user?.user_metadata?.full_name || "";
  const initials = fullName
    ? fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : email.substring(0, 2).toUpperCase();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({
        title: "För kort lösenord",
        description: "Lösenordet måste vara minst 6 tecken långt.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Lösenorden matchar inte",
        description: "Vänligen kontrollera att du skrivit samma i båda fälten.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({
        title: "Lösenordet har ändrats!",
        description: "Ditt nya lösenord har sparats i ditt konto.",
      });
      setIsPasswordOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        title: "Kunde inte ändra lösenord",
        description: err.message || "Ett oväntat fel uppstod.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 outline-none group focus:outline-none">
            <Avatar className="h-9 w-9 border-2 border-primary/20 group-hover:border-primary/80 transition-all shadow-sm">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs uppercase">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col items-start text-left lg:flex">
              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-all">
                {fullName || "Nektab Chef"}
              </span>
              <span className="text-[10px] text-muted-foreground max-w-[120px] truncate">
                {email}
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 mt-2 border border-border bg-white/95 backdrop-blur-md shadow-lg rounded-xl p-1 animate-fade-in">
          <DropdownMenuLabel className="px-3 py-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Inloggad som</span>
              <span className="text-sm font-semibold text-foreground truncate">{email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 border-border" />
          
          <DropdownMenuItem
            onClick={onShowSaved}
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg cursor-pointer transition-all"
          >
            <FolderHeart className="h-4 w-4 text-primary" />
            Visa sparade kandidater
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setIsPasswordOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg cursor-pointer transition-all"
          >
            <Key className="h-4 w-4 text-muted-foreground" />
            Byt lösenord
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1 border-border" />

          <DropdownMenuItem
            onClick={onSignOut}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer transition-all font-medium"
          >
            <LogOut className="h-4 w-4" />
            Logga ut
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-border rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Ändra ditt lösenord
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Skriv in ditt nya önskade lösenord nedan. Lösenordet måste bestå av minst 6 tecken.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordChange} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Nytt Lösenord</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Minst 6 tecken"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Bekräfta Nytt Lösenord</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Skriv lösenordet igen"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordOpen(false)}
                disabled={loading}
              >
                Avbryt
              </Button>
              <Button type="submit" disabled={loading} className="bg-primary text-black hover:bg-primary/95">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Spara nytt lösenord"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
