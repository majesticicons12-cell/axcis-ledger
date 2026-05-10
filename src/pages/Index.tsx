import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Sparkles } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="app-shell flex min-h-screen flex-col items-center justify-between px-6 py-12 pt-safe pb-safe">
      {/* Top spacer */}
      <div />

      {/* Brand block */}
      <div className="flex flex-col items-center text-center">
        <h1 className="text-6xl font-extrabold tracking-tight">AXCIS</h1>
        <p className="mt-3 text-sm font-medium text-muted-foreground">
          Intelligence Without Limits
        </p>

        <div className="my-10 h-px w-24 bg-border" />

        <h2 className="text-3xl font-bold">AXCIS Ledger</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your Personal CA. ₹199/month
        </p>

        <div className="mt-10 flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-4 py-2 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          AI-powered · Built for India
        </div>
      </div>

      {/* CTA buttons */}
      <div className="flex w-full flex-col gap-3">
        <Link
          to="/auth"
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary-grad text-base font-semibold text-primary-foreground shadow-glow transition-smooth active:scale-[0.98]"
        >
          Get Started <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/auth"
          className="flex h-14 w-full items-center justify-center rounded-2xl border border-border/60 bg-card text-sm font-medium text-foreground transition-smooth active:scale-[0.98]"
        >
          I already have an account
        </Link>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          By continuing, you agree to our Terms & Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Index;
