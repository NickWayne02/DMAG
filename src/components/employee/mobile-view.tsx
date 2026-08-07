import { useEffect, useMemo, useState, createContext, useContext } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { type AppRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Rocket,
  Pause,
  PlayCircle,
  PowerOff,
  Navigation,
  ScanLine,
  MessagesSquare,
  LogOut,
  CarFront,
  Loader2,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import { ShiftCalendarDialog } from "@/components/shift-calendar-dialog";
import { AdminEditableCalendarDialog } from "@/components/admin-editable-calendar-dialog";
import type { ShiftDetail } from "@/lib/shift-export";
import { SiteSelectorDialog, type Site } from "@/components/site-selector-dialog";
import { PhotoReportDialog } from "@/components/photo-report-dialog";
import { FullChatApp } from "@/components/full-chat-app";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SettingsDialog } from "@/components/settings-dialog";
import { PrivacyModal, TermsModal, SupportModal } from "./footer-modals";
import { useT, useLanguage } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";

const LOCALE_MAP: Record<string, string> = {
  ru: "ru-RU",
  en: "en-US",
  de: "de-DE",
  ro: "ro-RO",
  bg: "bg-BG",
  pl: "pl-PL",
  uk: "uk-UA",
  uz: "uz-UZ",
  tg: "tg-TJ",
};

const SITE_STORAGE_KEY = "dmag.selectedSite";
const SHIFT_STORAGE_KEY = "dmag.shift.current";

type PersistedShift = {
  status: "idle" | "working" | "lunch" | "finished";
  shiftStart: number | null;
  shiftEnd: number | null;
  lunchStart: number | null;
  lunchAccumMs: number;
  lunchIntervals: Array<{ start: number; end: number }>;
  shiftId: string | null;
  autoLunchApplied: boolean;
};

function loadPersistedShift(): PersistedShift | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SHIFT_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedShift;
    if (!p || p.status === "finished" || p.status === "idle") return null;
    return p;
  } catch {
    return null;
  }
}

const roleLabel: Record<AppRole, string> = {
  super_admin: "Супер-админ",
  admin: "Администратор",
  brigadier: "Бригадир",
  employee: "Сотрудник",
};

type ShiftStatus = "idle" | "working" | "lunch" | "finished";

type GpsRequest = {
  reason: "start" | "end";
  label: string;
};

const STATUS_META: Record<ShiftStatus, { label: string; dotClass: string; textClass: string }> = {
  idle: {
    label: "Смена не начата",
    dotClass: "bg-white/40",
    textClass: "text-white",
  },
  working: {
    label: "🟢 Работа идёт",
    dotClass: "bg-[color:var(--success)]",
    textClass: "text-[color:var(--success)]",
  },
  lunch: {
    label: "🟡 Обед",
    dotClass: "bg-[color:var(--warning)]",
    textClass: "text-[color:var(--warning)]",
  },
  finished: {
    label: "✓ Смена завершена",
    dotClass: "bg-white/40",
    textClass: "text-white",
  },
};

const CRIT_META: Record<
  "info" | "important" | "urgent",
  { label: string; color: string; light: string }
> = {
  info: { label: "Информация", color: "#4CAF50", light: "#E8F5E9" },
  important: { label: "Важно", color: "#FFB300", light: "#FFF8E1" },
  urgent: { label: "Срочно", color: "#F44336", light: "#FFEBEE" },
};

function makeFormatHM(unitH: string, unitM: string) {
  return (ms: number) => {
    const totalMin = Math.max(0, Math.floor(ms / 60000));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}${unitH} ${m.toString().padStart(2, "0")}${unitM}`;
  };
}

function formatHMS(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatClock(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
const AUTO_LUNCH_MS = 30 * 60 * 1000;

import { useEmployeeLogic } from "./context";

export function EmployeeMobileView() {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const {
    user,
    navigate,
    tr,
    lang,
    formatHM,
    status,
    setStatus,
    shiftStart,
    setShiftStart,
    shiftEnd,
    setShiftEnd,
    lunchStart,
    setLunchStart,
    lunchAccumMs,
    setLunchAccumMs,
    lunchIntervals,
    setLunchIntervals,
    shiftId,
    setShiftId,
    autoLunchApplied,
    setAutoLunchApplied,
    autoLunchAsk,
    setAutoLunchAsk,
    travelTime,
    setTravelTime,
    gpsRequest,
    setGpsRequest,
    gpsBusy,
    setGpsBusy,
    now,
    setNow,
    siteOpen,
    setSiteOpen,
    reportOpen,
    setReportOpen,
    chatOpen,
    setChatOpen,
    selectedSite,
    setSelectedSite,
    siteReports,
    setSiteReports,
    siteReportsLoading,
    setSiteReportsLoading,
    myShiftsOpen,
    setMyShiftsOpen,
    myShifts,
    setMyShifts,
    openMyShifts,
    pickSite,
    openReport,
    startWork,
    startLunch,
    endLunch,
    endShift,
    handleGpsAllow,
    handleGpsSkip,
    signOut,
    resetShift,
    handleAutoLunchSubtract,
    handleAutoLunchKeep,
    loadReports,
    name,
    avatarUrl,
    statusAccent,
    statusLabel,
    workMs,
    lunchMs,
    totalMs,
    role,
    openAvatarBrowser,
    canSwitchToAdmin,
    onSwitchToAdmin,
  } = useEmployeeLogic();
  return (
    <div
      className="min-h-screen flex justify-center"
      style={{
        background: "var(--page-bg-glow-1), var(--page-bg-glow-2), var(--neon-bg)",
        color: "var(--neon-text)",
      }}
    >
      <div
        className="w-full max-w-md md:max-w-2xl lg:max-w-5xl min-h-screen flex flex-col relative overflow-hidden mx-auto"
        style={{
          backgroundImage:
            "linear-gradient(var(--neon-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--neon-grid-line) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        {/* Neon header */}
        <header
          className="relative px-5 pt-6 pb-8 rounded-b-4xl border-b"
          style={
            {
              background: "var(--header-gradient), var(--neon-surface)",
              borderColor: "var(--neon-border)",
              boxShadow: "var(--header-shadow)",
              "--neon-text": "white",
              "--neon-text-dim": "rgba(255, 255, 255, 0.7)",
            } as React.CSSProperties
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-end gap-2 [&_button]:text-white [&_svg]:text-white [&_span]:text-white">
              <LanguageSwitcher compact />
              <SettingsDialog />
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="hover:bg-white/10 text-white h-8 w-8"
                title={tr("header.signOut")}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="cursor-pointer relative group shrink-0"
                  onClick={openAvatarBrowser}
                  title="Сменить фото"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name}
                      className="w-10 h-10 rounded-full object-cover border group-hover:opacity-80 transition-opacity"
                      style={{ borderColor: "rgba(255,255,255,0.3)" }}
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border group-hover:opacity-80 transition-opacity"
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        borderColor: "rgba(255,255,255,0.3)",
                      }}
                    >
                      {name.substring(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 text-left flex-1">
                  <p
                    className="text-[10px] uppercase tracking-[0.2em] text-cyan-300"
                    style={{ textShadow: "var(--neon-glow-cyan)" }}
                  >
                    {tr(`role.${role}`)}
                  </p>
                  <h1 className="text-lg font-bold truncate text-white leading-tight mt-0.5">
                    {name}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 [&_button]:text-white [&_svg]:text-white [&_span]:text-white">
                {canSwitchToAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onSwitchToAdmin?.()}
                    className="hover:bg-white/10 text-white"
                    title={tr("header.openAdmin")}
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={openMyShifts}
                  className="hover:bg-white/10 text-white"
                  title={tr("header.myShifts")}
                >
                  <CalendarDays className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 lg:grid lg:grid-cols-2 lg:gap-8 lg:px-5 mt-2">
          <div className="flex flex-col">
            {/* Status & Action buttons — sticky neon control deck */}
            <section
              className="px-5 lg:px-0 sticky top-0 z-50 py-3 border-b lg:border-none lg:pt-3 lg:pb-0 lg:bg-transparent"
              style={{
                background: "color-mix(in oklab, var(--neon-bg) 85%, transparent)",
                backdropFilter: "blur(12px)",
                borderColor: "var(--neon-border)",
              }}
            >
              <div
                className="rounded-3xl p-4 border mb-3"
                style={{
                  background: "var(--neon-surface)",
                  borderColor: "var(--neon-border)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${status === "working" || status === "lunch" ? "animate-pulse" : ""}`}
                    style={{ background: statusAccent.color, boxShadow: statusAccent.glow }}
                  />
                  <p
                    className="text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: "var(--neon-text-dim)" }}
                  >
                    {tr("status.current")}
                  </p>
                </div>
                <p
                  className="text-base font-semibold mt-1"
                  style={{ color: "var(--neon-text)", textShadow: statusAccent.glow }}
                >
                  {statusLabel}
                </p>

                {shiftStart && (
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p
                        className="text-[10px] uppercase tracking-[0.2em]"
                        style={{ color: "var(--neon-text-dim)" }}
                      >
                        {tr("shift.start")}
                      </p>
                      <p
                        className="text-xl font-bold tabular-nums leading-tight"
                        style={{ color: "var(--neon-text)" }}
                      >
                        {formatClock(shiftStart)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-[10px] uppercase tracking-[0.2em]"
                        style={{ color: "var(--neon-text-dim)" }}
                      >
                        {tr("shift.worked")}
                      </p>
                      <p
                        className="text-2xl font-extrabold tabular-nums leading-tight"
                        style={{ color: "var(--neon-text)", textShadow: statusAccent.glow }}
                      >
                        {formatHMS(workMs)}
                      </p>
                    </div>
                  </div>
                )}

                {(status !== "idle" || shiftEnd) && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <Metric label={tr("metric.work")} value={formatHM(workMs)} tone="lime" />
                    <Metric label={tr("metric.lunch")} value={formatHM(lunchMs)} tone="amber" />
                    <Metric label={tr("metric.total")} value={formatHM(totalMs)} tone="cyan" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatusButton
                  tone="lime"
                  icon={<Rocket className="h-5 w-5" />}
                  label={tr("btn.startWork")}
                  active={status === "working"}
                  disabled={status === "working" || status === "lunch"}
                  onClick={startWork}
                  solid={status === "idle"}
                />
                <StatusButton
                  tone="amber"
                  icon={<Pause className="h-5 w-5" />}
                  label={tr("btn.startLunch")}
                  active={status === "lunch"}
                  disabled={status !== "working"}
                  onClick={startLunch}
                />
                <StatusButton
                  tone="cyan"
                  icon={<PlayCircle className="h-5 w-5" />}
                  label={tr("btn.endLunch")}
                  disabled={status !== "lunch"}
                  onClick={endLunch}
                />
                <StatusButton
                  tone="red"
                  icon={<PowerOff className="h-5 w-5" />}
                  label={tr("btn.endShift")}
                  disabled={status !== "working" && status !== "lunch"}
                  onClick={endShift}
                />
              </div>
            </section>

            {/* Travel time + object */}
            <section className="px-5 lg:px-0 mt-5 space-y-3">
              <button type="button" onClick={() => setSiteOpen(true)} className="w-full text-left">
                <NeonCard>
                  <div className="flex items-center gap-3">
                    <NeonIcon color="var(--neon-cyan)" glow="var(--neon-glow-cyan)">
                      <Navigation className="h-5 w-5" />
                    </NeonIcon>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: "var(--neon-text)" }}>
                        {tr("site.title")}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--neon-text-dim)" }}>
                        {selectedSite
                          ? selectedSite.address
                            ? `${selectedSite.name} · ${selectedSite.address}`
                            : selectedSite.name
                          : tr("site.notSelected")}
                      </p>
                    </div>
                    <ChevronRight
                      className="h-5 w-5 shrink-0"
                      style={{ color: "var(--neon-text-dim)" }}
                    />
                  </div>
                </NeonCard>
              </button>

              <NeonCard>
                <div className="flex items-center gap-3">
                  <NeonIcon color="var(--neon-violet)" glow="var(--neon-glow-violet)">
                    <CarFront className="h-5 w-5" />
                  </NeonIcon>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: "var(--neon-text)" }}>
                      {tr("travel.title")}
                    </p>
                    <p className="text-xs" style={{ color: "var(--neon-text-dim)" }}>
                      {tr("travel.hint")}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder={tr("travel.placeholder")}
                    value={travelTime}
                    onChange={(e) => setTravelTime(e.target.value.replace(/[^\d]/g, ""))}
                    className="h-11 rounded-xl border-0 placeholder:opacity-50"
                    style={{
                      color: "var(--neon-text)",
                      background: "color-mix(in oklab, var(--neon-surface) 90%, transparent)",
                      boxShadow: "inset 0 0 0 1px var(--neon-border)",
                    }}
                  />
                  <span className="text-sm shrink-0" style={{ color: "var(--neon-text-dim)" }}>
                    {tr("travel.unit")}
                  </span>
                </div>
              </NeonCard>

              {status === "finished" && (
                <NeonCard glowColor="var(--neon-cyan)">
                  <div className="flex items-center gap-3">
                    <CheckCircle2
                      className="h-5 w-5 shrink-0"
                      style={{
                        color: "var(--neon-cyan)",
                        filter: "drop-shadow(var(--neon-glow-cyan))",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: "var(--neon-text)" }}>
                        {tr("finished.title")}
                      </p>
                      <p className="text-xs" style={{ color: "var(--neon-text-dim)" }}>
                        {tr("finished.commercial")}: {formatHM(workMs)}
                        {travelTime
                          ? ` · ${tr("finished.travel")} ${travelTime} ${tr("travel.unit")}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-0 text-white"
                      style={{
                        background: "rgba(34,211,238,0.15)",
                        boxShadow: "inset 0 0 0 1px var(--neon-cyan)",
                      }}
                      onClick={resetShift}
                    >
                      {tr("finished.new")}
                    </Button>
                  </div>
                </NeonCard>
              )}
            </section>
          </div>{" "}
          {/* End Left Column */}
          <div className="flex flex-col lg:pt-5">
            {/* Chat tile — single, full-width neon */}
            <section className="px-5 lg:px-0 mt-4">
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="w-full rounded-2xl p-4 flex items-center gap-3 min-h-18 active:scale-[0.98] transition text-left"
                style={{
                  background: "var(--neon-surface)",
                  boxShadow:
                    "inset 0 0 0 1px var(--neon-border), 0 0 24px -8px rgba(34,211,238,0.35)",
                }}
              >
                <NeonIcon color="var(--neon-cyan)" glow="var(--neon-glow-cyan)">
                  <MessagesSquare className="h-5 w-5" />
                </NeonIcon>
                <span
                  className="flex-1 text-left text-sm font-semibold"
                  style={{ color: "var(--neon-text)" }}
                >
                  {tr("tile.chat")}
                </span>
                <ChevronRight
                  className="h-5 w-5 ml-auto"
                  style={{ color: "var(--neon-text-dim)" }}
                />
              </button>
            </section>
          </div>{" "}
          {/* End Right Column */}
        </div>{" "}
        {/* End Grid */}
        <footer
          className="mt-auto py-8 text-center border-t"
          style={{
            background: "rgba(0,0,0,0.15)",
            borderColor: "var(--neon-border)",
            color: "var(--neon-text-dim)",
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">DMAG</span>
              <span className="opacity-60 text-xs">
                © {new Date().getFullYear()}{" "}
                {tr("footer.allRightsReserved") === "footer.allRightsReserved"
                  ? "Все права защищены"
                  : tr("footer.allRightsReserved")}
              </span>
            </div>
            <div className="flex flex-col items-center gap-3 text-xs">
              <button
                onClick={() => setPrivacyOpen(true)}
                className="hover:text-white transition-colors"
              >
                {tr("footer.privacy") === "footer.privacy"
                  ? "Политика конфиденциальности"
                  : tr("footer.privacy")}
              </button>
              <button
                onClick={() => setTermsOpen(true)}
                className="hover:text-white transition-colors"
              >
                {tr("footer.terms") === "footer.terms"
                  ? "Условия использования"
                  : tr("footer.terms")}
              </button>
              <button
                onClick={() => setSupportOpen(true)}
                className="hover:text-white transition-colors"
              >
                {tr("footer.support") === "footer.support"
                  ? "Служба поддержки"
                  : tr("footer.support")}
              </button>
            </div>
            <div className="text-[10px] opacity-40 mt-2">
              {tr("footer.version") === "footer.version" ? "Версия" : tr("footer.version")} 2.0.1
            </div>
          </div>
        </footer>
      </div>

      {/* GPS request dialog — only fired on Start / End */}
      <Dialog
        open={!!gpsRequest}
        onOpenChange={(open) => {
          if (!open && !gpsBusy) setGpsRequest(null);
        }}
      >
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-2 h-12 w-12 rounded-2xl bg-primary/10 text-primary grid place-items-center">
              <Navigation className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">{tr("gps.title")}</DialogTitle>
            <DialogDescription className="text-center">{tr("gps.desc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              className="h-12 rounded-xl"
              onClick={handleGpsSkip}
              disabled={gpsBusy}
            >
              {tr("gps.skip")}
            </Button>
            <Button className="h-12 rounded-xl" onClick={handleGpsAllow} disabled={gpsBusy}>
              {gpsBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tr("gps.allow")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-lunch confirmation: >8h without any pause */}
      <Dialog open={autoLunchAsk} onOpenChange={(o) => !o && setAutoLunchAsk(false)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-2 h-12 w-12 rounded-2xl bg-(--warning)/15 text-warning grid place-items-center">
              <Pause className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">{tr("autolunch.title")}</DialogTitle>
            <DialogDescription className="text-center">{tr("autolunch.desc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-1">
            <Button className="h-12 rounded-xl" onClick={handleAutoLunchSubtract}>
              {tr("autolunch.subtract")}
            </Button>
            <Button variant="outline" className="h-12 rounded-xl" onClick={handleAutoLunchKeep}>
              {tr("autolunch.keep")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteSelectorDialog
        open={siteOpen}
        onOpenChange={setSiteOpen}
        selectedId={selectedSite?.id ?? null}
        onSelect={pickSite}
      />

      {chatOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <FullChatApp
            onClose={() => setChatOpen(false)}
            sites={selectedSite ? [selectedSite] : []}
            initialChannelType="general"
          />
        </div>
      )}

      {(role === "admin" || role === "super_admin") && user ? (
        <AdminEditableCalendarDialog
          open={myShiftsOpen}
          onClose={() => setMyShiftsOpen(false)}
          employeeId={user?.id || ""}
          employeeName={name}
        />
      ) : (
        <ShiftCalendarDialog
          open={myShiftsOpen}
          onClose={() => setMyShiftsOpen(false)}
          employeeName={name}
          shifts={myShifts}
        />
      )}

      <PrivacyModal open={privacyOpen} onOpenChange={setPrivacyOpen} />
      <TermsModal open={termsOpen} onOpenChange={setTermsOpen} />
      <SupportModal open={supportOpen} onOpenChange={setSupportOpen} />
    </div>
  );
}

const TONE_MAP: Record<string, { color: string; glow: string }> = {
  lime: { color: "var(--neon-lime)", glow: "var(--neon-glow-lime)" },
  amber: { color: "var(--neon-amber)", glow: "var(--neon-glow-amber)" },
  cyan: { color: "var(--neon-cyan)", glow: "var(--neon-glow-cyan)" },
  red: { color: "var(--neon-red)", glow: "var(--neon-glow-red)" },
  violet: { color: "var(--neon-violet)", glow: "var(--neon-glow-violet)" },
};

function Metric({
  label,
  value,
  tone = "cyan",
}: {
  label: string;
  value: string;
  tone?: "lime" | "amber" | "cyan" | "violet" | "red";
}) {
  const t = TONE_MAP[tone];
  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{
        background: "rgba(255,255,255,0.03)",
        boxShadow: "inset 0 0 0 1px var(--neon-border)",
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">{label}</p>
      <p className="text-sm font-bold tabular-nums" style={{ color: t.color, textShadow: t.glow }}>
        {value}
      </p>
    </div>
  );
}

function StatusButton({
  tone,
  icon,
  label,
  onClick,
  disabled,
  active,
  solid,
}: {
  tone: "lime" | "amber" | "cyan" | "red";
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  solid?: boolean;
}) {
  const t = TONE_MAP[tone];
  const { settings, resolvedPanels } = useSettings();
  const mode = settings.mode;

  // Per-theme visual language for action buttons.
  // light: soft pastel tint on card surface with colored ring + shadow.
  // dark:  deeper tinted background, sharper colored ring, cool shadow.
  // neon:  gradient into neon-bg with glowing border + text shadow.
  // custom: tint the user-chosen card color with the tone.
  const surface = resolvedPanels.card;
  const bgByMode: Record<string, string> = {
    light: `linear-gradient(160deg, ${t.color}22, ${surface})`,
    dark: `linear-gradient(160deg, ${t.color}2e, color-mix(in oklab, ${surface} 88%, black))`,
    neon: `linear-gradient(160deg, ${t.color}22, color-mix(in oklab, var(--neon-bg) 80%, transparent))`,
    custom: `linear-gradient(160deg, ${t.color}26, ${surface})`,
  };
  const shadowByMode: Record<string, string> = {
    light: `inset 0 0 0 1px ${t.color}55, 0 6px 18px -10px ${t.color}aa`,
    dark: `inset 0 0 0 1px ${t.color}66, 0 8px 22px -12px ${t.color}cc`,
    neon: `inset 0 0 0 1px ${t.color}66, ${active ? t.glow : `0 0 12px -4px ${t.color}88`}`,
    custom: `inset 0 0 0 1px ${t.color}55, 0 6px 18px -10px ${t.color}99`,
  };

  const textShadow = mode === "neon" && !solid ? t.glow : "none";
  const disabledBg =
    mode === "light"
      ? "color-mix(in oklab, var(--foreground) 6%, transparent)"
      : "rgba(255,255,255,0.03)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl p-4 min-h-24 flex flex-col items-start justify-between text-left font-semibold transition
        ${disabled ? "opacity-40 cursor-not-allowed" : "active:scale-[0.98]"}`}
      style={{
        background: disabled ? disabledBg : solid ? t.color : (bgByMode[mode] ?? bgByMode.dark),
        color: disabled
          ? "var(--neon-text-dim)"
          : solid
            ? mode === "light"
              ? "#fff"
              : "#000"
            : t.color,
        boxShadow: disabled
          ? "inset 0 0 0 1px var(--neon-border)"
          : solid
            ? t.glow
            : (shadowByMode[mode] ?? shadowByMode.dark),
        textShadow,
      }}
    >
      {icon}
      <span className="text-sm leading-tight uppercase tracking-wide">{label}</span>
    </button>
  );
}

function NeonCard({ children, glowColor }: { children: React.ReactNode; glowColor?: string }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "var(--neon-surface)",
        boxShadow: glowColor
          ? `inset 0 0 0 1px ${glowColor}66, 0 0 22px -6px ${glowColor}66`
          : "inset 0 0 0 1px var(--neon-border)",
      }}
    >
      {children}
    </div>
  );
}

function NeonIcon({
  children,
  color,
  glow,
}: {
  children: React.ReactNode;
  color: string;
  glow: string;
}) {
  return (
    <div
      className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
      style={{
        background: `${color}18`,
        color,
        boxShadow: `inset 0 0 0 1px ${color}55, ${glow}`,
      }}
    >
      {children}
    </div>
  );
}
