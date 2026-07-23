import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminDashboard } from "@/components/admin-dashboard";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: DevAdminRoute,
});

function DevAdminRoute() {
  const navigate = useNavigate();
  const [state, setState] = useState<{ allowed: boolean; isSuper: boolean }>({
    allowed: false,
    isSuper: false,
  });

  useEffect(() => {
    const isDevAdmin = window.sessionStorage.getItem("dmag_dev_admin") === "true";
    const isSuper = window.sessionStorage.getItem("dmag_super_admin") === "true";
    if (!isDevAdmin && !isSuper) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    setState({ allowed: true, isSuper });
  }, [navigate]);

  if (!state.allowed) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminDashboard
      role={state.isSuper ? "super_admin" : "admin"}
      devMode
      superMode={state.isSuper}
    />
  );
}
