import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import dmagLogo from "@/assets/dmag-logo.png";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SettingsDialog } from "@/components/settings-dialog";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "DMAG · Авторизация" },
      { name: "description", content: "Вход в корпоративную систему DMAG" },
    ],
  }),
  component: AuthPage,
});

// Hidden super-admin secret. Never shown in UI.
const SUPER_ADMIN_SECRET = "Evgen-Ruslan-2026";

// Map a username to an internal email used by Supabase Auth.
// If the user typed a real email, use it as is.
function loginToEmail(login: string): string {
  const v = login.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@dmag.de`;
}

function AuthPage() {
  const navigate = useNavigate();
  const t = useT();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" && s) navigate({ to: "/" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedLogin = login.trim();
    if (!trimmedLogin) {
      toast.error(t("auth.errLogin"));
      return;
    }
    if (!password) {
      toast.error(t("auth.errPassword"));
      return;
    }

    // -------- Hidden super-admin handling --------
    // Any login + own password + secret code in confirm field → super_admin.
    if (mode === "login" && confirm === SUPER_ADMIN_SECRET) {
      setBusy(true);
      try {
        const email = loginToEmail(trimmedLogin);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.sessionStorage.setItem("dmag_dev_admin", "true");
        window.sessionStorage.setItem("dmag_super_admin", "true");
        window.location.assign("/admin");
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("auth.errGeneric");
        toast.error(msg);
        setBusy(false);
        return;
      }
    }

    // -------- Standard flow (employee login: confirm === password) --------
    if (password !== confirm) {
      toast.error(t("auth.errMismatch"));
      return;
    }

    // Ensure no stale super-admin flags remain for normal employee sessions.
    window.sessionStorage.removeItem("dmag_dev_admin");
    window.sessionStorage.removeItem("dmag_super_admin");

    setBusy(true);
    try {
      const email = loginToEmail(trimmedLogin);
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName || trimmedLogin } },
        });
        if (error) throw error;
        toast.success(t("auth.created"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("auth.errGeneric");
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <Card className="w-full max-w-md p-8 rounded-2xl shadow-xl border-0 relative">
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 [&_button]:!bg-primary [&_button]:!text-primary-foreground [&_button]:!shadow-md hover:[&_button]:!bg-primary/90">
          <LanguageSwitcher />
          <SettingsDialog />
        </div>
        <div className="flex flex-col items-center mb-6">
          <img src={dmagLogo} alt="DMAG" className="w-[140px] h-auto rounded-xl shadow-md" />
          <p className="mt-3 text-sm text-muted-foreground">Maschinen und Anlagenbau</p>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")}>
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="login">{t("auth.tabLogin")}</TabsTrigger>
            <TabsTrigger value="signup">{t("auth.tabSignup")}</TabsTrigger>
          </TabsList>

          <TabsContent value={mode}>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("auth.fullName")}</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("auth.fullNamePh")}
                    className="h-12 rounded-xl"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="login">{t("auth.login")}</Label>
                <Input
                  id="login"
                  type="text"
                  autoComplete="username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="ivanov"
                  className="h-12 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl"
                  minLength={6}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm">{t("auth.confirm")}</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-12 rounded-xl"
                  minLength={6}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-semibold"
                disabled={busy}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "login" ? t("auth.signin") : t("auth.signup")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-xs text-center text-muted-foreground leading-relaxed">
          {t("auth.recover")}
        </p>
      </Card>
    </div>
  );
}
