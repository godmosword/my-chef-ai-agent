import { AppSidebar } from "./AppSidebar";
import { AppTabBar } from "./AppTabBar";
import { AppMobileHeader } from "./AppMobileHeader";
import { AppDesktopHeader } from "./AppDesktopHeader";
import { AppOnboardingOverlay } from "@/components/onboarding/AppOnboardingOverlay";
import { NetworkStatus } from "@/components/patterns/NetworkStatus";
import { A2HSBanner } from "@/components/patterns/A2HSBanner";
import { SwUpdateToast } from "@/components/patterns/SwUpdateToast";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh]">
      <NetworkStatus />
      <AppSidebar />
      <div className="flex min-h-0 flex-1 flex-col">
        <AppMobileHeader />
        <AppDesktopHeader />
        <main className="mx-auto w-full max-w-content flex-1 px-4 py-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-2 md:py-6 md:pb-6">
          {children}
        </main>
      </div>
      <AppTabBar />
      <AppOnboardingOverlay />
      <A2HSBanner />
      <SwUpdateToast />
    </div>
  );
}
