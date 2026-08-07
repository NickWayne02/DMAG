import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth, primaryRole } from "@/hooks/use-auth";
import { EmployeeMobile } from "@/components/employee-mobile";

export const Route = createFileRoute("/_authenticated/employee-dashboard")({
  component: EmployeeDashboardRoute,
});

function EmployeeDashboardRoute() {
  const { loading, user, roles } = useAuth();
  const navigate = useNavigate();
  const role = primaryRole(roles);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const mobileRole =
    role === "brigadier"
      ? "brigadier"
      : role === "super_admin"
        ? "super_admin"
        : role === "admin"
          ? "admin"
          : "employee";
  const canOpenReports = role === "admin" || role === "super_admin";
  return (
    <EmployeeMobile
      role={mobileRole}
      canSwitchToAdmin={canOpenReports}
      onSwitchToAdmin={() => {
        window.sessionStorage.removeItem("dmag_site_open");
        window.sessionStorage.removeItem("dmag_report_open");
        window.sessionStorage.removeItem("dmag_chat_open");
        navigate({ to: "/admin-dashboard" });
      }}
    />
  );
}
