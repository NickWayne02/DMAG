import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import dmagLogo from "@/assets/dmag-logo.png";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SettingsDialog } from "@/components/settings-dialog";
import { useT } from "@/lib/i18n";
import { useAppSettings } from "@/hooks/use-app-settings";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "DMAG · Авторизация" },
      { name: "description", content: "Вход в корпоративную систему" },
    ],
  }),
  component: AuthPage,
});

// Hidden super-admin secret. Never shown in UI.
const SUPER_ADMIN_SECRET = "Evgen-Ruslan-2026";

function isEmailString(str: string) {
  return str.includes("@");
}

function isPhoneString(str: string) {
  const digits = str.replace(/[^0-9]/g, "");
  return digits.length >= 7 && /^\+?[0-9\s\-()]+$/.test(str);
}

function AuthPage() {
  const navigate = useNavigate();
  const t = useT();
  const { data: appSettings } = useAppSettings();

  const [mode, setMode] = useState<"login" | "signup">("login");
  
  // Form fields
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  
  // New fields for signup
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    if (confirm === SUPER_ADMIN_SECRET) {
      setBusy(true);
      try {
        let email = trimmedLogin;
        if (!isEmailString(email)) email = `${email}@dmag.de`;
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

    if (mode === "signup" && password !== confirm) {
      toast.error(t("auth.errMismatch"));
      return;
    }

    // Ensure no stale super-admin flags remain for normal employee sessions.
    window.sessionStorage.removeItem("dmag_dev_admin");
    window.sessionStorage.removeItem("dmag_super_admin");

    setBusy(true);
    try {
      const isEmail = isEmailString(trimmedLogin);
      const isPhone = isPhoneString(trimmedLogin);

      if (mode === "signup") {
        if (!isEmail && !isPhone) {
          throw new Error("Введите корректный Email или номер телефона");
        }
        
        const signUpOpts: any = {
          password,
          options: { 
            data: { 
              first_name: firstName, 
              last_name: lastName, 
              username: username,
              birth_date: birthDate,
              full_name: `${firstName} ${lastName}`.trim()
            } 
          },
        };
        
        if (isEmail) signUpOpts.email = trimmedLogin;
        if (isPhone) signUpOpts.phone = trimmedLogin;

        const { error } = await supabase.auth.signUp(signUpOpts);
        if (error) throw error;
        toast.success(t("auth.created") || "Аккаунт создан! Проверьте почту/СМС для подтверждения.");
      } else {
        // Login mode
        if (isEmail) {
          const { error } = await supabase.auth.signInWithPassword({ email: trimmedLogin, password });
          if (error) throw error;
        } else if (isPhone) {
          const { error } = await supabase.auth.signInWithPassword({ phone: trimmedLogin, password });
          if (error) throw error;
        } else {
          // Assume it's a username
          const { data: userEmail, error: rpcError } = await supabase.rpc("get_email_by_username", { p_username: trimmedLogin });
          let emailToUse = userEmail;
          
          if (!emailToUse) {
            // Legacy fallback
            emailToUse = `${trimmedLogin}@dmag.de`;
          }
          
          const { error } = await supabase.auth.signInWithPassword({ email: emailToUse, password });
          if (error) throw error;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("auth.errGeneric");
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-linear-to-br from-primary/5 via-background to-primary/10 relative">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 [&_button]:bg-primary! [&_button]:text-primary-foreground! [&_button]:shadow-md! hover:[&_button]:bg-primary/90!">
        <LanguageSwitcher />
        <SettingsDialog />
      </div>
      <Card className="w-full max-w-md p-8 rounded-2xl shadow-xl border-0 relative mt-8">
        <div className="flex flex-col items-center mb-6">
          <img
            src={appSettings?.app_logo_url || dmagLogo}
            alt="Logo"
            className="w-35 h-auto rounded-xl shadow-md"
          />
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")}>
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="login">{t("auth.tabLogin")}</TabsTrigger>
            <TabsTrigger value="signup">{t("auth.tabSignup")}</TabsTrigger>
          </TabsList>

          <TabsContent value={mode}>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">{t("auth.firstName") || "Имя"}</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Имя"
                        className="h-12 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">{t("auth.lastName") || "Фамилия"}</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Фамилия"
                        className="h-12 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="username">{t("auth.username") || "Имя пользователя"}</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Имя пользователя"
                      className="h-12 rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="birthDate">{t("auth.birthDate") || "Дата рождения"}</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="h-12 rounded-xl"
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="login">
                  {mode === "login" 
                    ? (t("auth.loginOrEmailOrPhone") || "Имя пользователя, Телефон или Email")
                    : (t("auth.emailOrPhone") || "Телефон или Email")}
                </Label>
                <Input
                  id="login"
                  type="text"
                  autoComplete="username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder={mode === "login" ? "Имя пользователя, Email или Телефон" : "Email или телефон"}
                  className="h-12 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl pr-10"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">{t("auth.confirm")}</Label>
                  <div className="relative">
                    <Input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="h-12 rounded-xl pr-10"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

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

        <div className="mt-4 text-center">
          <Button
            type="button"
            variant="link"
            onClick={() => toast.info(t("auth.recover"))}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Забыли пароль?
          </Button>
        </div>
      </Card>
    </div>
  );
}
