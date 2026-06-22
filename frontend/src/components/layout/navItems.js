import {
  Home, Sprout, Crown, Building2, Target, Calendar,
  Gift, Trophy, MessageSquare, Diamond, Headphones, Settings as SettingsIcon,
} from "lucide-react";

/** Single source of truth for the nav. Used by Sidebar, MobileDrawer and BottomNav. */
export const navGroups = [
  {
    label: "My Journey",
    items: [
      { to: "/dashboard", icon: Home, name: "Dashboard", testId: "sidebar-dashboard-link" },
      { to: "/progress", icon: Sprout, name: "My Progress", testId: "sidebar-progress-link" },
      { to: "/benefits-ladder", icon: Crown, name: "Benefits Ladder", testId: "sidebar-benefits-ladder-link" },
    ],
  },
  {
    label: "Discover",
    items: [
      { to: "/properties", icon: Building2, name: "Dubai Properties", testId: "sidebar-properties-link" },
      { to: "/allocation-interests", icon: Target, name: "Allocation Interests", testId: "sidebar-allocation-link" },
      { to: "/webinars", icon: Calendar, name: "Webinar Events", testId: "sidebar-webinars-link" },
    ],
  },
  {
    label: "Community",
    items: [
      { to: "/invite", icon: Gift, name: "Invite & Earn", testId: "sidebar-invite-link" },
      { to: "/leaderboard", icon: Trophy, name: "Leaderboard", testId: "sidebar-leaderboard-link" },
      { to: "/community", icon: MessageSquare, name: "Community Updates", testId: "sidebar-community-link" },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/co-owner-benefits", icon: Diamond, name: "Co-Owner Benefits", testId: "sidebar-co-owner-benefits-link" },
      { to: "/support", icon: Headphones, name: "Support Center", testId: "sidebar-support-link" },
      { to: "/settings", icon: SettingsIcon, name: "Settings", testId: "sidebar-settings-link" },
    ],
  },
];

/** Bottom-nav (mobile) — five most-used tabs. */
export const bottomNavItems = [
  { to: "/dashboard", icon: Home, name: "Home", testId: "bottom-nav-dashboard" },
  { to: "/properties", icon: Building2, name: "Properties", testId: "bottom-nav-properties" },
  { to: "/webinars", icon: Calendar, name: "Events", testId: "bottom-nav-webinars" },
  { to: "/invite", icon: Gift, name: "Invite", testId: "bottom-nav-invite" },
  // 5th item ("More") opens the drawer — handled in BottomNav itself.
];
