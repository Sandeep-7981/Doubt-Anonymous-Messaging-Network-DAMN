import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const roleLabel = profile?.role === "admin" ? "Admin" : profile?.role === "teacher" ? "Teacher" : "Student";
  const roleBadgeClass = profile?.role === "admin"
    ? "bg-destructive/10 text-destructive"
    : profile?.role === "teacher"
    ? "bg-teacher/10 text-teacher"
    : "bg-primary/10 text-primary";

  return (
    <header className="sticky top-0 z-40 glass border-b border-border/50">
      <div className="container flex items-center justify-between h-14 px-3 sm:px-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
            <BookOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm sm:text-lg text-foreground truncate">
            <span className="sm:hidden">DoubtFlow</span>
            <span className="hidden sm:inline">Doubt Anonymous Messaging Network</span>
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {profile && (
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 sm:py-1 rounded-full ${roleBadgeClass}`}>
                {roleLabel}
              </span>
              {profile.branch && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {profile.branch}-{profile.section}
                </span>
              )}
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out" className="h-10 w-10">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
