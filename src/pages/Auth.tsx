import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm signup.", { duration: 6000 });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Enter your email first"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setResetSent(true);
      toast.success("Password reset link sent to your email");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (resetMode) {
    return (
      <div className="app-shell flex min-h-screen flex-col px-6 pt-safe pb-safe">
        <div className="pt-4">
          <button
            onClick={() => { setResetMode(false); setResetSent(false); }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-smooth active:bg-secondary"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-12">
          <h1 className="text-3xl font-bold">Reset password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {resetSent
              ? "Check your email for the reset link. It may take a few minutes."
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>
        {!resetSent && (
          <form onSubmit={handleResetPassword} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="reset-email" className="text-xs text-muted-foreground">Email</Label>
              <Input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="mt-1 h-12 rounded-xl bg-card"
              />
            </div>
            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-primary-grad text-base font-semibold shadow-glow"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen flex-col px-6 pt-safe pb-safe">
      <div className="pt-4">
        <Link
          to="/"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-smooth active:bg-secondary"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="mt-6">
        <h1 className="text-3xl font-bold">
          {mode === "signup" ? "Create account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Your AI Chartered Accountant awaits."
            : "Sign in to continue to AXCIS Ledger."}
        </p>
      </div>

      <div className="mt-8 flex flex-1 flex-col">
        <Button
          variant="outline"
          className="h-12 w-full rounded-xl border-border/60 bg-card"
          onClick={handleGoogle}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name" className="text-xs text-muted-foreground">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1 h-12 rounded-xl bg-card"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="mt-1 h-12 rounded-xl bg-card"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs text-muted-foreground">Password</Label>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => setResetMode(true)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 h-12 rounded-xl bg-card"
            />
          </div>
          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-primary-grad text-base font-semibold shadow-glow"
            disabled={loading}
          >
            {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <button
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="font-medium text-primary"
          >
            {mode === "signup" ? "Sign in" : "Create account"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
