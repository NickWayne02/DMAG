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
  Map as MapIcon,
  MapPin,
  ExternalLink,
  RefreshCw,
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
import { getCurrentPosition } from "@/lib/geocode";

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

export function EmployeeDesktopView() {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const { settings } = useSettings();
  const mode = settings.mode;
  const { tName } = useLanguage();

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

  const [myCoords, setMyCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapType, setMapType] = useState<"m" | "k">("m"); // "m" = map, "k" = satellite

  const handleRefreshCoords = () => {
    toast.info("Обновление геопозиции...");
    getCurrentPosition()
      .then((pos: any) => {
        if (pos && pos.latitude && pos.longitude) {
          setMyCoords(pos);
        }
      })
      .catch(() => {});
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground">
      <header
        className="border-b shadow-sm relative"
        style={{
          background: "var(--header-gradient)",
          borderColor: "var(--neon-border)",
          color: "white",
        }}
      >
        <div className="max-w-7xl w-full mx-auto px-8 py-4 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div
                className="cursor-pointer relative group"
                onClick={openAvatarBrowser}
                title="Сменить фото"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-12 h-12 rounded-full object-cover border group-hover:opacity-80 transition-opacity"
                    style={{ borderColor: "rgba(255,255,255,0.3)" }}
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl border group-hover:opacity-80 transition-opacity"
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      borderColor: "rgba(255,255,255,0.3)",
                    }}
                  >
                    {name.substring(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">
                  {tr(`role.${role}`)}
                </p>
                <h1 className="font-bold text-xl">{name}</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 [&_button]:text-inherit [&_svg]:text-inherit [&_span]:text-inherit">
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <SettingsDialog />
            </div>
            {canSwitchToAdmin && (
              <Button
                variant="outline"
                className="bg-transparent hover:bg-black/10 dark:hover:bg-white/20 border-current"
                onClick={onSwitchToAdmin}
              >
                {tr("header.openAdmin")}
              </Button>
            )}
            <Button variant="ghost" className="hover:bg-red-500/20" onClick={signOut}>
              <LogOut className="w-5 h-5 mr-2" />
              {tr("header.signOut")}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-[1920px] w-full mx-auto">
        {/* Left Sidebar */}
        <aside
          className="w-72 shrink-0 flex flex-col p-8 border-r overflow-y-auto"
          style={{
            borderColor: "var(--neon-border)",
            background: "color-mix(in oklab, var(--neon-surface) 20%, transparent)",
          }}
        >
          <h2
            className="text-xl font-bold mb-6 pb-2 border-b"
            style={{ borderColor: "var(--neon-border)", color: "var(--neon-text)" }}
          >
            {tr("navigation")}
          </h2>
          <div className="space-y-3">
            <button
              type="button"
              className="w-full flex items-center p-3 rounded-xl transition hover:brightness-110 active:scale-[0.98]"
              style={{
                background: "var(--neon-surface)",
                border: "1px solid var(--neon-border)",
              }}
              onClick={openMyShifts}
            >
              <NeonIcon color="var(--neon-cyan)" glow="var(--neon-glow-cyan)">
                <CalendarDays className="h-5 w-5" />
              </NeonIcon>
              <span
                className="ml-4 flex-1 text-left text-sm font-semibold uppercase tracking-wider"
                style={{ color: "var(--neon-text)" }}
              >
                {tr("header.myShifts")}
              </span>
              <ChevronRight className="h-5 w-5 ml-auto" style={{ color: "var(--neon-text-dim)" }} />
            </button>

            <button
              type="button"
              className="w-full flex items-center p-3 rounded-xl transition hover:brightness-110 active:scale-[0.98]"
              style={{
                background: "var(--neon-surface)",
                border: "1px solid var(--neon-border)",
              }}
              onClick={() => setSiteOpen(true)}
            >
              <NeonIcon color="var(--neon-cyan)" glow="var(--neon-glow-cyan)">
                <Navigation className="h-5 w-5" />
              </NeonIcon>
              <span
                className="ml-4 flex-1 text-left text-sm font-semibold uppercase tracking-wider"
                style={{ color: "var(--neon-text)" }}
              >
                {tr("site.select")}
              </span>
              <ChevronRight className="h-5 w-5 ml-auto" style={{ color: "var(--neon-text-dim)" }} />
            </button>

            <button
              type="button"
              className="w-full flex items-center p-3 rounded-xl transition hover:brightness-110 active:scale-[0.98]"
              style={{
                background: "var(--neon-surface)",
                border: "1px solid var(--neon-border)",
              }}
              onClick={() => setChatOpen(true)}
            >
              <NeonIcon color="var(--neon-lime)" glow="var(--neon-glow-lime)">
                <MessagesSquare className="h-5 w-5" />
              </NeonIcon>
              <span
                className="ml-4 flex-1 text-left text-sm font-semibold uppercase tracking-wider"
                style={{ color: "var(--neon-text)" }}
              >
                {tr("tile.chat")}
              </span>
              <ChevronRight className="h-5 w-5 ml-auto" style={{ color: "var(--neon-text-dim)" }} />
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col lg:flex-row gap-8 p-8 overflow-y-auto min-w-0">
          <div className="w-full lg:w-100 xl:w-120 shrink-0 flex flex-col gap-6">
            <div className="rounded-3xl p-6 bg-card border shadow-sm flex flex-col gap-6">
              <div className="rounded-2xl px-5 py-5 border bg-muted/40 backdrop-blur">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-3 w-3 rounded-full ${status === "working" || status === "lunch" ? "animate-pulse" : ""}`}
                    style={{ background: statusAccent.color }}
                  />
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {tr("status.current")}
                  </p>
                </div>
                <p className="text-lg font-bold mt-1 mb-6" style={{ color: statusAccent.color }}>
                  {statusLabel}
                </p>

                {shiftStart ? (
                  <div className="flex items-end justify-between gap-3 mb-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        СТАРТ
                      </p>
                      <p className="text-2xl font-bold tabular-nums leading-tight text-foreground">
                        {formatClock(shiftStart)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {tr("shift.worked").toUpperCase()}
                      </p>
                      <p
                        className="text-3xl font-extrabold tabular-nums leading-tight"
                        style={{ color: statusAccent.color }}
                      >
                        {formatHMS(workMs)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end justify-between gap-3 mb-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {tr("shift.start").toUpperCase()}
                      </p>
                      <p className="text-2xl font-bold tabular-nums leading-tight text-foreground">
                        --:--
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {tr("shift.worked").toUpperCase()}
                      </p>
                      <p className="text-3xl font-extrabold tabular-nums leading-tight text-muted-foreground">
                        00:00:00
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
                  <Metric label={tr("metric.work")} value={formatHM(workMs)} tone="lime" />
                  <Metric label={tr("metric.lunch")} value={formatHM(lunchMs)} tone="amber" />
                  <Metric label={tr("metric.total")} value={formatHM(totalMs)} tone="cyan" />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <StatusButton
                  tone="lime"
                  icon={<Rocket className="h-5 w-5 shrink-0" />}
                  label={tr("btn.startWork")}
                  active={status === "working"}
                  disabled={status === "working" || status === "lunch"}
                  onClick={startWork}
                  solid={status === "idle" || status === "finished"}
                />
                <div className="grid grid-cols-2 gap-3">
                  <StatusButton
                    tone="amber"
                    icon={<Pause className="h-4 w-4 shrink-0" />}
                    label={tr("btn.startLunch")}
                    active={status === "lunch"}
                    disabled={status !== "working"}
                    onClick={startLunch}
                    solid={status === "working"}
                  />
                  <StatusButton
                    tone="cyan"
                    icon={<PlayCircle className="h-4 w-4 shrink-0" />}
                    label={tr("btn.endLunch")}
                    disabled={status !== "lunch"}
                    onClick={endLunch}
                    solid={status === "lunch"}
                  />
                  <div className="col-span-2">
                    <StatusButton
                      tone="red"
                      icon={<PowerOff className="h-4 w-4 shrink-0" />}
                      label={tr("btn.endShift")}
                      disabled={status !== "working" && status !== "lunch"}
                      onClick={endShift}
                      solid={status === "working" || status === "lunch"}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col h-full min-h-125">
            {selectedSite ? (
              <NeonCard className="h-full flex flex-col">
                <div className="flex flex-col h-full">
                  <div
                    className="flex items-start gap-6 mb-6 pb-4 border-b"
                    style={{ borderColor: "var(--neon-border)" }}
                  >
                    <div>
                      <h2 className="text-2xl font-bold" style={{ color: "var(--neon-text)" }}>
                        {tName(selectedSite.name)}
                      </h2>
                      <p className="mt-1" style={{ color: "var(--neon-text-dim)" }}>
                        {tName(selectedSite.address)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      style={{ borderColor: "var(--neon-border)", color: "var(--neon-text)" }}
                      onClick={() => setSiteOpen(true)}
                    >
                      {tr("site.change")}
                    </Button>
                  </div>

                  <div
                    className="flex-1 rounded-2xl overflow-hidden relative min-h-100 group"
                    style={{ border: "1px solid var(--neon-border)" }}
                  >
                    {/* Floating Map Controls */}
                    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 opacity-80 hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="bg-black/50 backdrop-blur-md border border-(--neon-border) hover:bg-black/70 w-10 h-10 rounded-full"
                        onClick={() => setMapType(mapType === "m" ? "k" : "m")}
                        title="Переключить вид (Схема/Спутник)"
                      >
                        {mapType === "m" ? <MapIcon className="w-5 h-5 text-white" /> : <MapPin className="w-5 h-5 text-white" />}
                      </Button>

                      <Button
                        size="icon"
                        variant="secondary"
                        className="bg-black/50 backdrop-blur-md border border-(--neon-border) hover:bg-black/70 w-10 h-10 rounded-full"
                        onClick={handleRefreshCoords}
                        title="Обновить координаты"
                      >
                        <RefreshCw className="w-5 h-5 text-white" />
                      </Button>
                      
                      <Button
                        size="icon"
                        variant="secondary"
                        className="bg-black/50 backdrop-blur-md border border-(--neon-border) hover:bg-black/70 w-10 h-10 rounded-full"
                        onClick={() => {
                          const lat = myCoords?.latitude || 0;
                          const lon = myCoords?.longitude || 0;
                          if (lat && lon) {
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((tName(selectedSite.address) || tName(selectedSite.name)).replace(/^GPS:\s*/i, ""))}&origin=${lat},${lon}`, "_blank");
                          } else {
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((tName(selectedSite.address) || tName(selectedSite.name)).replace(/^GPS:\s*/i, ""))}`, "_blank");
                          }
                        }}
                        title="Проложить маршрут"
                      >
                        <Navigation className="w-5 h-5 text-white" />
                      </Button>

                      <Button
                        size="icon"
                        variant="secondary"
                        className="bg-black/50 backdrop-blur-md border border-(--neon-border) hover:bg-black/70 w-10 h-10 rounded-full"
                        onClick={() => {
                          if (myCoords) {
                            window.open(`https://www.google.com/maps/search/?api=1&query=${myCoords.latitude},${myCoords.longitude}`, "_blank");
                          } else {
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((tName(selectedSite.address) || tName(selectedSite.name)).replace(/^GPS:\s*/i, ""))}`, "_blank");
                          }
                        }}
                        title="Открыть в Google Maps"
                      >
                        <ExternalLink className="w-5 h-5 text-white" />
                      </Button>
                    </div>

                    <iframe
                      width="100%"
                      height="100%"
                      style={{
                        border: 0,
                        filter: mapType === "m" ? "invert(100%) hue-rotate(180deg) brightness(80%) contrast(120%)" : "none",
                      }}
                      loading="lazy"
                      allowFullScreen
                      src={
                        myCoords
                          ? `https://maps.google.com/maps?q=${myCoords.latitude},${myCoords.longitude}&t=${mapType}&z=15&ie=UTF8&iwloc=&output=embed`
                          : `https://maps.google.com/maps?q=${encodeURIComponent((tName(selectedSite.address) || tName(selectedSite.name)).replace(/^GPS:\s*/i, ""))}&t=${mapType}&z=15&ie=UTF8&iwloc=&output=embed`
                      }
                    ></iframe>
                  </div>
                </div>
              </NeonCard>
            ) : (
              <div
                className="flex-1 rounded-3xl flex flex-col items-center justify-center text-center p-12 h-full"
                style={{ border: "2px dashed var(--neon-border)" }}
              >
                <Navigation
                  className="w-20 h-20 mb-8 opacity-20"
                  style={{ color: "var(--neon-text)" }}
                />
                <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--neon-text)" }}>
                  {tr("site.notSelected.title")}
                </h2>
                <p className="mb-8 max-w-md text-lg" style={{ color: "var(--neon-text-dim)" }}>
                  {tr("site.notSelected.desc")}
                </p>
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg rounded-2xl"
                  onClick={() => setSiteOpen(true)}
                >
                  {tr("site.select")}
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer
        className="w-full mt-auto py-8 text-center"
        style={{
          background: "rgba(0,0,0,0.15)",
          color: "var(--neon-text-dim)",
          borderTop: "1px solid var(--neon-border)",
        }}
      >
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white">DMAG</span>
            <span className="text-sm opacity-60">
              © {new Date().getFullYear()}{" "}
              {tr("footer.allRightsReserved") === "footer.allRightsReserved"
                ? "Все права защищены"
                : tr("footer.allRightsReserved")}
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm">
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
              {tr("footer.terms") === "footer.terms" ? "Условия использования" : tr("footer.terms")}
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
          <div className="text-xs opacity-40">
            {tr("footer.version") === "footer.version" ? "Версия" : tr("footer.version")} 2.0.1
          </div>
        </div>
      </footer>

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
        onSelect={pickSite}
        selectedId={selectedSite?.id}
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
      className="rounded-xl px-2 py-2 text-center"
      style={{
        background: "rgba(255,255,255,0.03)",
        boxShadow: "inset 0 0 0 1px var(--neon-border)",
        WebkitTextSizeAdjust: "100%",
        textSizeAdjust: "100%",
      }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.2em] mb-1"
        style={{ color: "var(--neon-text-dim)", whiteSpace: "nowrap" }}
      >
        {label}
      </p>
      <p
        className="text-sm font-bold tabular-nums"
        style={{ color: t.color, textShadow: t.glow, whiteSpace: "nowrap" }}
      >
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
  const { settings } = useSettings();
  const mode = settings.mode;
  const isSolid = settings.buttonStyle === "text" ? false : solid;

  const surface = "var(--neon-surface)";
  const bgMode = `linear-gradient(160deg, ${t.color}22, ${surface})`;
  const shadowMode = `inset 0 0 0 1px ${t.color}55, 0 6px 18px -10px ${t.color}99`;

  const disabledBg = mode === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)";
  const textShadow = mode === "neon" && !isSolid ? t.glow : "none";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl px-4 py-3 min-h-13 flex items-center justify-center gap-2 text-center font-bold uppercase tracking-wider transition w-full
        ${disabled ? (mode === "light" ? "opacity-75 cursor-not-allowed" : "opacity-40 cursor-not-allowed") : "active:scale-[0.98] hover:brightness-110"}`}
      style={{
        background: disabled ? disabledBg : isSolid ? t.color : bgMode,
        color: disabled
          ? mode === "light"
            ? "rgba(0,0,0,0.45)"
            : "var(--neon-text-dim)"
          : isSolid
            ? mode === "light"
              ? "#fff"
              : "#000"
            : t.color,
        boxShadow: disabled
          ? "inset 0 0 0 1px var(--neon-border)"
          : active
            ? `inset 0 0 0 1px ${t.color}, ${t.glow}`
            : isSolid
              ? t.glow
              : shadowMode,
        textShadow: active ? t.glow : textShadow,
      }}
    >
      {icon}
      <span className="text-xs lg:text-sm truncate">{label}</span>
    </button>
  );
}

function NeonCard({
  children,
  glowColor,
  className,
}: {
  children: React.ReactNode;
  glowColor?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-6 ${className || ""}`}
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
