import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookOpen, UserPlus, AlertCircle } from "lucide-react";

const ALLOWED_DOMAIN = "@gvpce.ac.in";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.toLowerCase().trim().endsWith(ALLOWED_DOMAIN)) {
      setErrorMsg(
        `Only college emails ending in ${ALLOWED_DOMAIN} are allowed to sign up. Please use your official Roll-no${ALLOWED_DOMAIN} email.`,
      );
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    setIsLoading(true);
    try {
      await signUp(email.trim(), password, name);
      toast.success("Account created! Please check your email to confirm.");
      navigate("/login");
    } catch (err: any) {
      const raw = err?.message || "Signup failed";
      const friendly = /gvpce\.ac\.in/i.test(raw)
        ? `Only ${ALLOWED_DOMAIN} email addresses are allowed.`
        : raw;
      setErrorMsg(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4"
          >
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Join DoubtFlow</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Create your account to get started</p>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Use your college email ({ALLOWED_DOMAIN})</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required className="h-11 text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" inputMode="email" placeholder={`Roll-no${ALLOWED_DOMAIN}`} value={email} onChange={e => setEmail(e.target.value)} required className="h-11 text-base" />
                <p className="text-xs text-muted-foreground">Only {ALLOWED_DOMAIN} emails are accepted.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="h-11 text-base" />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                <UserPlus className="w-4 h-4 mr-2" />
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>

      {/* Error popup */}
      <Dialog open={!!errorMsg} onOpenChange={open => !open && setErrorMsg(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Signup blocked
            </DialogTitle>
            <DialogDescription className="pt-2">{errorMsg}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setErrorMsg(null)} className="w-full">OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
