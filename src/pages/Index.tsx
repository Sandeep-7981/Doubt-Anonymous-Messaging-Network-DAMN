import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import StudentDashboard from "@/pages/StudentDashboard";
import TeacherDashboard from "@/pages/TeacherDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import RoleSelectionPage from "@/pages/RoleSelectionPage";

export default function Index() {
  const { profile, loading, session } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (!profile?.is_profile_complete) return <RoleSelectionPage />;

  if (profile.is_blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-destructive mb-2">Account Blocked</p>
          <p className="text-muted-foreground">Your account has been blocked by an admin. Contact your class teacher.</p>
        </div>
      </div>
    );
  }

  switch (profile.role) {
    case "teacher": return <TeacherDashboard />;
    case "admin": return <AdminDashboard />;
    default: return <StudentDashboard />;
  }
}
