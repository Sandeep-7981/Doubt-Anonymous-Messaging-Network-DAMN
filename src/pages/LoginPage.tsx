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
import { BookOpen, LogIn, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signIn(email, password);
      toast.success("Welcome back!");
      navigate("/");
    } catch (err: any) {
      const raw = err?.message || "Login failed";
      let friendly = raw;
      if (/invalid login credentials/i.test(raw)) {
        friendly = "Invalid email or password. Please try again.";
      } else if (/blocked/i.test(raw)) {
        friendly = "Your account has been blocked by the admin. Please contact the admin to regain access.";
      }
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
          <h1 className="font-bold text-foreground text-2xl font-serif shadow-none rounded-xl">Doubt Anonymous Messaging Network</h1>
          <p className="text-muted-foreground mt-1">Your classroom doubt-solving platform</p>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" inputMode="email" placeholder="Roll-no@gvpce.ac.in" value={email} onChange={e => setEmail(e.target.value)} required className="h-11 text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className="h-11 text-base" />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                <LogIn className="w-4 h-4 mr-2" />
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline font-medium">Sign up</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>

      {/* Loading dialog */}
      <Dialog open={isLoading}>
        <DialogContent className="sm:max-w-xs" onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing you in...
            </DialogTitle>
            <DialogDescription>Please wait while we verify your credentials.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Error dialog */}
      <Dialog open={!!errorMsg} onOpenChange={open => !open && setErrorMsg(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Login failed
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
