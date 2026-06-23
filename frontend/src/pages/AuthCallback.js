import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const AuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = React.useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const exchange = async () => {
      const hash = location.hash || window.location.hash || "";
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const sessionId = params.get("session_id");
      if (!sessionId) {
        navigate("/login", { replace: true });
        return;
      }
      try {
        let ref = null;
        try { ref = sessionStorage.getItem("onex_ref"); } catch (e) { /* noop */ }
        const { data } = await api.post("/auth/session", { session_id: sessionId, ref });
        try { sessionStorage.removeItem("onex_ref"); } catch (e) { /* noop */ }
        setUser(data.user);
        // Strip the fragment and go to dashboard
        window.history.replaceState({}, document.title, "/dashboard");
        navigate("/dashboard", { replace: true, state: { user: data.user } });
      } catch (e) {
        navigate("/login", { replace: true });
      }
    };
    exchange();
  }, [location.hash, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center" data-testid="auth-callback">
      <div className="flex items-center gap-3 text-zinc-400">
        <Loader2 className="animate-spin" size={18} />
        <span>Signing you in…</span>
      </div>
    </div>
  );
};

export default AuthCallback;
