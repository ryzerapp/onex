import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import ReferralCapture from "@/components/ReferralCapture";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import MyProgress from "@/pages/MyProgress";
import BenefitsLadder from "@/pages/BenefitsLadder";
import DubaiProperties from "@/pages/DubaiProperties";
import AllocationInterests from "@/pages/AllocationInterests";
import WebinarEvents from "@/pages/WebinarEvents";
import InviteEarn from "@/pages/InviteEarn";
import Leaderboard from "@/pages/Leaderboard";
import CommunityUpdates from "@/pages/CommunityUpdates";
import CoOwnerBenefits from "@/pages/CoOwnerBenefits";
import SupportCenter from "@/pages/SupportCenter";
import Settings from "@/pages/Settings";
import Activity from "@/pages/Activity";
import GoogleAuthCallback from "@/pages/GoogleAuthCallback";

const AppRouter = () => {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <>
      <ReferralCapture />
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/progress" element={<MyProgress />} />
        <Route path="/benefits-ladder" element={<BenefitsLadder />} />
        <Route path="/properties" element={<DubaiProperties />} />
        <Route path="/allocation-interests" element={<AllocationInterests />} />
        <Route path="/webinars" element={<WebinarEvents />} />
        <Route path="/invite" element={<InviteEarn />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/community" element={<CommunityUpdates />} />
        <Route path="/co-owner-benefits" element={<CoOwnerBenefits />} />
        <Route path="/support" element={<SupportCenter />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/activity" element={<Activity />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </>
  );
};

function App() {
  return (
    <div className="App" data-testid="app-root">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
