import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const BRANCHES = ["CSE", "ECE", "IT", "EEE", "MECH", "CIVIL"];
const SECTIONS = ["A", "B", "C", "D"];

export default function RoleSelectionPage() {
  const [branch, setBranch] = useState("");
  const [section, setSection] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!branch || !section) {
      toast.error("Please select branch and section");
      return;
    }
    setIsLoading(true);
    try {
      // Only update role if it's not already set (avoid trigger blocks for teachers/admins)
      const updates = {
        branch,
        section,
        is_profile_complete: true,
        ...(profile?.role ? {} : { role: "student" as const }),
      };
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user!.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile setup complete!");
      navigate("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-foreground">Complete Your Profile</h1>
          <p className="text-muted-foreground mt-1">Select your branch and section</p>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Class details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSubmit} className="w-full" disabled={isLoading || !branch || !section}>
              {isLoading ? "Saving..." : "Continue"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
