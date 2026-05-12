import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Phone, Mail, MessageCircle, Loader2 } from "lucide-react";

type Step = "signin" | "signup" | "forgot" | "whatsapp-reset" | "whatsapp-otp";

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("signin");
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false);

  // WhatsApp reset flow state
  const [resetPhone, setResetPhone] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetStep, setResetStep] = useState<"send" | "verify">("send");

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const getAuthErrorMsg = (err: Error): string => {
    const m = err.message.toLowerCase();
    if (m.includes("email not confirmed") || m.includes("email_not_confirmed")) {
      return "Email not confirmed yet. Check your inbox (and spam) for the confirmation link, then try again.";
    }
    if (m.includes("invalid login credentials")) {
      return "Wrong email/phone or password. If you just signed up, check your email to confirm your account first.";
    }
    if (m.includes("user already registered")) {
      return "An account with this email/phone already exists. Try signing in.";
    }
    if (m.includes("rate limit")) {
      return "Too many attempts — please wait a minute and try again.";
    }
    return err.message;
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: unknown) {
      toast.error(getAuthErrorMsg(err instanceof Error ? err : new Error("Something went wrong")));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { display_name: name || email.split("@")[0] },
        },
      });
      if (error) throw error;
      setJustSignedUp(true);
      toast.success("Account created! Check your email to confirm signup.", { duration: 8000 });
    } catch (err: unknown) {
      toast.error(getAuthErrorMsg(err instanceof Error ? err : new Error("Something went wrong")));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ phone, password });
      if (error) throw error;
    } catch (err: unknown) {
      toast.error(getAuthErrorMsg(err instanceof Error ? err : new Error("Something went wrong")));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        phone,
        password,
        options: { data: { display_name: name || phone } },
      });
      if (error) throw error;
      toast.success("Account created! You can now sign in.", { duration: 5000 });
    } catch (err: unknown) {
      toast.error(getAuthErrorMsg(err instanceof Error ? err : new Error("Something went wrong")));
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsAppOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPhone.trim()) { toast.error("Enter your phone number"); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-reset`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ action: "send", phone: resetPhone }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error || "Failed to send code");
      }
      setResetStep("verify");
      toast.success("OTP sent via WhatsApp!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyWhatsAppOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim() || !newPassword.trim()) { toast.error("Enter the code and your new password"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-reset`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", phone: resetPhone, otp: resetCode, newPassword }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error || "Invalid code");
      }
      toast.success("Password changed! Sign in with your new password.");
      setStep("signin");
      setPhone(resetPhone);
      setResetPhone("");
      setResetCode("");
      setNewPassword("");
      setResetStep("send");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleSupabaseReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Enter your email"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setResetSent(true);
      toast.success("Password reset link sent to your email.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    if (!email.trim()) { toast.error("Enter your email first"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("Confirmation email resent! Check your inbox.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password screen ──
  if (step === "forgot") {
    return (
      <div className="app-shell flex min-h-screen flex-col px-6 pt-safe pb-safe">
        <div className="pt-4">
          <button onClick={() => { setStep("signin"); setResetSent(false); }} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-smooth active:bg-secondary" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-12">
          <h1 className="text-3xl font-bold">Reset password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {resetSent ? "Check your email for the reset link." : "Choose how to reset your password."}
          </p>
        </div>
        {!resetSent && (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl bg-card p-4 shadow-soft">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Mail className="h-4 w-4 text-primary" /> Via email
              </div>
              <form onSubmit={handleSupabaseReset} className="space-y-3">
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="h-11 rounded-xl bg-secondary" />
                <Button type="submit" className="w-full rounded-xl bg-primary-grad font-semibold shadow-glow" disabled={loading}>
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
            </div>
            <button onClick={() => { setStep("whatsapp-reset"); setResetPhone(resetPhone || phone); }} className="flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left transition-smooth active:scale-[0.99]">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">Reset via WhatsApp</div>
                <div className="text-xs text-muted-foreground">Get a code on WhatsApp to set a new password</div>
              </div>
            </button>
          </div>
        )}
        {resetSent && (
          <p className="mt-4 text-xs text-muted-foreground">Didn't receive it? Check your spam folder.</p>
        )}
      </div>
    );
  }

  // ── WhatsApp reset flow ──
  if (step === "whatsapp-reset" || step === "whatsapp-otp") {
    return (
      <div className="app-shell flex min-h-screen flex-col px-6 pt-safe pb-safe">
        <div className="pt-4">
          <button onClick={() => { setStep("forgot"); setResetStep("send"); }} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-smooth active:bg-secondary" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-12">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <MessageCircle className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold">Reset via WhatsApp</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {resetStep === "send" ? "Enter your phone number to receive a 6-digit code on WhatsApp." : "Enter the code you received and your new password."}
          </p>
        </div>
        {resetStep === "send" ? (
          <form onSubmit={handleSendWhatsAppOtp} className="mt-8 space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Phone number (with country code)</Label>
              <Input type="tel" required value={resetPhone} onChange={(e) => setResetPhone(e.target.value)} placeholder="+919876543210" className="mt-1 h-12 rounded-xl bg-card" />
            </div>
            <Button type="submit" className="h-12 w-full rounded-xl bg-primary-grad font-semibold shadow-glow" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Send code via WhatsApp"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyWhatsAppOtp} className="mt-8 space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">6-digit code from WhatsApp</Label>
              <Input type="text" required maxLength={6} value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" className="mt-1 h-12 rounded-xl bg-card text-center text-2xl font-bold tracking-widest" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">New password (min 6 chars)</Label>
              <Input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="mt-1 h-12 rounded-xl bg-card" />
            </div>
            <Button type="submit" className="h-12 w-full rounded-xl bg-primary-grad font-semibold shadow-glow" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : "Change password & sign in"}
            </Button>
            <button type="button" onClick={() => setResetStep("send")} className="w-full text-center text-xs text-muted-foreground underline">
              Wrong number? Go back
            </button>
          </form>
        )}
      </div>
    );
  }

  // ── Main sign in / sign up screen ──
  return (
    <div className="app-shell flex min-h-screen flex-col px-6 pt-safe pb-safe">
      <div className="pt-4">
        <Link to="/" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-smooth active:bg-secondary" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="mt-6">
        <h1 className="text-3xl font-bold">
          {step === "signup" ? "Create account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === "signup" ? "Your AI Chartered Accountant awaits." : "Sign in to continue to AXCIS Ledger."}
        </p>
      </div>

      {/* Login method toggle */}
      <div className="mt-6 flex gap-1 rounded-2xl bg-card p-1">
        <button onClick={() => setLoginMethod("email")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-smooth ${loginMethod === "email" ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"}`}>
          <Mail className="h-3.5 w-3.5" /> Email
        </button>
        <button onClick={() => setLoginMethod("phone")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-smooth ${loginMethod === "phone" ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"}`}>
          <Phone className="h-3.5 w-3.5" /> Phone
        </button>
      </div>

      <div className="mt-6 flex flex-1 flex-col">
        {/* Google OAuth - only shown for email sign in */}
        {loginMethod === "email" && (
          <>
            <Button variant="outline" className="h-12 w-full rounded-xl border-border/60 bg-card" onClick={async () => {
              try {
                const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard` } });
                if (error) throw error;
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Google sign-in failed");
              }
            }}>
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
          </>
        )}

        {/* Email form */}
        {loginMethod === "email" && (
          <form onSubmit={step === "signin" ? handleEmailSignIn : handleEmailSignUp} className="space-y-4">
            {step === "signup" && (
              <div>
                <Label htmlFor="name" className="text-xs text-muted-foreground">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-1 h-12 rounded-xl bg-card" />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="mt-1 h-12 rounded-xl bg-card" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs text-muted-foreground">Password</Label>
                {step === "signin" && (
                  <button type="button" onClick={() => setStep("forgot")} className="text-xs font-medium text-primary hover:underline">Forgot password?</button>
                )}
              </div>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1 h-12 rounded-xl bg-card" />
            </div>
            {justSignedUp && step === "signin" && (
              <div className="rounded-xl bg-warning/10 p-3 text-xs text-warning">
                Your email may not be confirmed yet. Check your inbox/spam for the confirmation link.{' '}
                <button type="button" onClick={resendConfirmation} className="font-semibold underline">Resend</button>
              </div>
            )}
            <Button type="submit" className="h-12 w-full rounded-xl bg-primary-grad text-base font-semibold shadow-glow" disabled={loading}>
              {loading ? "Please wait..." : step === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
        )}

        {/* Phone form */}
        {loginMethod === "phone" && (
          <form onSubmit={step === "signin" ? handlePhoneSignIn : handlePhoneSignUp} className="space-y-4">
            <div>
              <Label htmlFor="phone" className="text-xs text-muted-foreground">Phone number (with country code)</Label>
              <Input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" className="mt-1 h-12 rounded-xl bg-card" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="phone-password" className="text-xs text-muted-foreground">Password</Label>
                {step === "signin" && (
                  <button type="button" onClick={() => { setStep("forgot"); setResetPhone(phone); }} className="text-xs font-medium text-primary hover:underline">Forgot password?</button>
                )}
              </div>
              <Input id="phone-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1 h-12 rounded-xl bg-card" />
            </div>
            <Button type="submit" className="h-12 w-full rounded-xl bg-primary-grad text-base font-semibold shadow-glow" disabled={loading}>
              {loading ? "Please wait..." : step === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
        )}

        {/* Toggle signin / signup */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {step === "signup" ? "Already have an account?" : "New here?"}{" "}
          <button onClick={() => { setStep(step === "signup" ? "signin" : "signup"); setJustSignedUp(false); }} className="font-medium text-primary">
            {step === "signup" ? "Sign in" : "Create account"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
