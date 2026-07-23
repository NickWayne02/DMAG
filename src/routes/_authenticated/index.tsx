import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth, primaryRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/")({
  component: AuthedHome,
});

function AuthedHome() {
  const { loading, user, roles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    // Everyone (including admin/super_admin) lands in the employee view;
    // admins see a "Reports" button there to open the management dashboard.
    void roles;
    navigate({ to: "/employee-dashboard", replace: true });
  }, [loading, user, roles, navigate]);

  return (
    <div className="min-h-screen grid place-items-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
