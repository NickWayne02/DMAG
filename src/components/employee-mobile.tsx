import { useState, useEffect } from "react";
import type { AppRole } from "@/hooks/use-auth";
import { EmployeeProvider } from "./employee/context";
import { EmployeeMobileView } from "./employee/mobile-view";
import { EmployeeDesktopView } from "./employee/desktop-view";

export function EmployeeMobile(props: {
  role: AppRole;
  canSwitchToAdmin?: boolean;
  onSwitchToAdmin?: () => void;
}) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 980px)");
    setIsDesktop(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return (
    <EmployeeProvider {...props}>
      {isDesktop ? <EmployeeDesktopView /> : <EmployeeMobileView />}
    </EmployeeProvider>
  );
}
