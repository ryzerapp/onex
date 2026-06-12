import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import { Toaster } from "sonner";

const AppLayout = () => {
  return (
    <div className="min-h-screen flex" data-testid="app-layout">
      <Sidebar />
      <main className="flex-1 lg:ml-[280px] min-h-screen px-6 md:px-10 lg:px-12 py-8 lg:py-10 onex-scroll">
        <div className="max-w-[1480px] mx-auto fade-in-up">
          <Outlet />
        </div>
      </main>
      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
};

export default AppLayout;
