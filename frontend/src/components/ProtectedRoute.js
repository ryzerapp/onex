import React, { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const redirectState = useMemo(() => ({ from: location }), [location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="route-loader">
        <Loader2 className="animate-spin text-[#8CFF2E]" size={20} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={redirectState} />;
  return children;
};

export default ProtectedRoute;
