import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth, primaryRole } from "@/hooks/use-auth";
import { AdminDashboard } from "@/components/admin-dashboard";

export const Route = createFileRoute("/_authenticated/admin-dashboard")({
  component: AdminDashboardRoute,
});

function AdminDashboardRoute() {
  const { loading, user, roles } = useAuth();
  const navigate = useNavigate();
  const role = primaryRole(roles);
  const isAdmin = role === "admin" || role === "super_admin";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    if (!isAdmin) {
      navigate({ to: "/employee-dashboard", replace: true });
    }
  }, [loading, user, isAdmin, navigate]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return <AdminDashboard role={role} superMode={role === "super_admin"} />;
}
