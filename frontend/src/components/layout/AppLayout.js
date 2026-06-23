import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import MobileTopBar from "@/components/layout/MobileTopBar";
import MobileDrawer from "@/components/layout/MobileDrawer";
import BottomNav from "@/components/layout/BottomNav";
import { Toaster } from "sonner";

const AppLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col lg:block bg-[#0A0A0B]" data-testid="app-layout">
      {/* Mobile chrome */}
      <MobileTopBar onOpenMenu={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Desktop sidebar (hidden on mobile) */}
      <Sidebar />

      <main
        className="flex-1 lg:ml-[280px] min-h-screen px-4 md:px-8 lg:px-12 pt-4 lg:pt-10 pb-24 lg:pb-10 onex-scroll mobile-safe-bottom"
      >
        <div className="max-w-[1480px] mx-auto fade-in-up">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <BottomNav onOpenMore={() => setDrawerOpen(true)} />

      <Toaster theme="dark" position="top-center" richColors toastOptions={{ style: { marginTop: "env(safe-area-inset-top)" } }} />
    </div>
  );
};

export default AppLayout;
