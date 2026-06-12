import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/api";

const AuthContext = createContext(null);

const bootstrapAuth = async (apply) => {
  if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
    apply({ user: undefined, skip: true });
    return;
  }
  try {
    const { data } = await api.get("/auth/me");
    apply({ user: data.user });
  } catch (e) {
    apply({ user: null });
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(undefined);
  const loading = user === undefined;

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      return data.user;
    } catch (e) {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    bootstrapAuth(({ user: u, skip }) => {
      if (skip) return;
      setUser(u);
    });
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch (e) { /* ignore */ }
    setUser(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user: user || null, setUser, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
