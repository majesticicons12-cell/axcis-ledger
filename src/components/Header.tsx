import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const onLanding = location.pathname === "/";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-grad shadow-glow transition-smooth group-hover:scale-105">
            <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-display text-xl font-bold tracking-tight">Axcis Ledger</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">your personal CA</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm md:flex">
          {onLanding ? (
            <>
              <a href="#features" className="text-muted-foreground transition-smooth hover:text-foreground">Features</a>
              <a href="#how" className="text-muted-foreground transition-smooth hover:text-foreground">How it works</a>
              <a href="#pricing" className="text-muted-foreground transition-smooth hover:text-foreground">Pricing</a>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="text-muted-foreground transition-smooth hover:text-foreground">Dashboard</Link>
              <Link to="/chat" className="text-muted-foreground transition-smooth hover:text-foreground">Ask AI</Link>
              <Link to="/calculator" className="text-muted-foreground transition-smooth hover:text-foreground">Tax Calc</Link>
              <Link to="/tracker" className="text-muted-foreground transition-smooth hover:text-foreground">Tracker</Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {onLanding && <Button size="sm" variant="ghost" onClick={() => navigate("/dashboard")}>Dashboard</Button>}
              <Button size="sm" variant="outline" onClick={async () => { await signOut(); navigate("/"); }}>Sign out</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => navigate("/auth")}>Sign in</Button>
              <Button size="sm" onClick={() => navigate("/auth")} className="bg-emerald-grad shadow-soft hover:opacity-90">Get started</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
