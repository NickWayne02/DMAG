import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PresenceProvider } from "@/hooks/use-presence";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", data.user.id)
      .single();

    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      setTimeout(() => {
        toast.error(
          "Ваш аккаунт находится на рассмотрении. Ожидайте подтверждения от администратора.",
          {
            duration: 10000,
          },
        );
      }, 500);
      throw redirect({ to: "/auth" });
    }

    return { user: data.user };
  },
  component: () => (
    <PresenceProvider>
      <Outlet />
    </PresenceProvider>
  ),
});
