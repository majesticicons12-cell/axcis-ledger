import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    setChecking(true);
    supabase
      .from("profiles")
      .select("onboarded")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setOnboarded(!!data?.onboarded);
        setChecking(false);
      });
  }, [user]);

  if (loading || (user && checking)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (onboarded === false && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
