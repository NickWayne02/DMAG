import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/use-auth";
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
import type { ShiftDetail } from "@/lib/shift-export";
import { SiteSelectorDialog, type Site } from "@/components/site-selector-dialog";
import { PhotoReportDialog } from "@/components/photo-report-dialog";
import { ChatDialog } from "@/components/chat-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SettingsDialog } from "@/components/settings-dialog";
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

export function EmployeeMobile({
  role,
  canSwitchToAdmin = false,
  onSwitchToAdmin,
}: {
  role: AppRole;
  canSwitchToAdmin?: boolean;
  onSwitchToAdmin?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const tr = useT();
  const { lang, tName } = useLanguage();
  const formatHM = useMemo(() => makeFormatHM(tr("unit.h"), tr("unit.m")), [tr, lang]);

  const persisted = useMemo(() => loadPersistedShift(), []);
  const [status, setStatus] = useState<ShiftStatus>(persisted?.status ?? "idle");
  const [shiftStart, setShiftStart] = useState<number | null>(persisted?.shiftStart ?? null);
  const [shiftEnd, setShiftEnd] = useState<number | null>(persisted?.shiftEnd ?? null);
  const [lunchStart, setLunchStart] = useState<number | null>(persisted?.lunchStart ?? null);
  const [lunchAccumMs, setLunchAccumMs] = useState(persisted?.lunchAccumMs ?? 0);
  // Precise interval log for admin: each completed pause [start, end]
  const [lunchIntervals, setLunchIntervals] = useState<Array<{ start: number; end: number }>>(
    persisted?.lunchIntervals ?? [],
  );
  const [shiftId, setShiftId] = useState<string | null>(persisted?.shiftId ?? null);
  const [autoLunchApplied, setAutoLunchApplied] = useState(persisted?.autoLunchApplied ?? false);
  const [autoLunchAsk, setAutoLunchAsk] = useState(false);
  const [travelTime, setTravelTime] = useState("");
  const [gpsRequest, setGpsRequest] = useState<GpsRequest | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [siteOpen, setSiteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(SITE_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Site) : null;
    } catch {
      return null;
    }
  });

  type SiteReport = {
    id: string;
    description: string | null;
    criticality: "info" | "important" | "urgent";
    created_at: string;
    thumbUrl: string | null;
  };
  const [siteReports, setSiteReports] = useState<SiteReport[]>([]);
  const [siteReportsLoading, setSiteReportsLoading] = useState(false);
  const [myShiftsOpen, setMyShiftsOpen] = useState(false);
  const [myShifts, setMyShifts] = useState<ShiftDetail[]>([]);

  async function openMyShifts() {
    if (!user) return;
    const since = new Date();
    since.setDate(since.getDate() - 90);
    since.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("shifts")
      .select(
        "id, user_id, site_name, status, started_at, ended_at, lunch_total_ms, lunch_intervals",
      )
      .eq("user_id", user.id)
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false });
    const rows: ShiftDetail[] = (data ?? []).map((s: any) => ({
      id: s.id,
      user_id: s.user_id,
      user_name: name,
      site_name: s.site_name ?? null,
      started_at: s.started_at,
      ended_at: s.ended_at,
      lunch_intervals: Array.isArray(s.lunch_intervals) ? s.lunch_intervals : [],
      lunch_total_ms: Number(s.lunch_total_ms ?? 0),
      status: s.status,
    }));
    setMyShifts(rows);
    setMyShiftsOpen(true);
  }

  function pickSite(s: Site) {
    setSelectedSite(s);
    try {
      window.localStorage.setItem(SITE_STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }

  function openReport() {
    if (!selectedSite) {
      toast.error(tr("toast.selectSiteFirst"));
      setSiteOpen(true);
      return;
    }
    setReportOpen(true);
  }

  async function loadReports() {
    if (!selectedSite || !user) {
      setSiteReports([]);
      return;
    }
    setSiteReportsLoading(true);
    const { data, error } = await supabase
      .from("photo_reports")
      .select("id, description, criticality, photo_url, created_at")
      .eq("site_id", selectedSite.id)
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error || !data) {
      setSiteReports([]);
      setSiteReportsLoading(false);
      return;
    }
    const enriched = await Promise.all(
      data.map(async (r) => {
        let thumbUrl: string | null = null;
        if (r.photo_url) {
          const { data: signed } = await supabase.storage
            .from("photo-reports")
            .createSignedUrl(r.photo_url, 3600);
          thumbUrl = signed?.signedUrl ?? null;
        }
        return {
          id: r.id,
          description: r.description,
          criticality: r.criticality as "info" | "important" | "urgent",
          created_at: r.created_at,
          thumbUrl,
        };
      }),
    );
    setSiteReports(enriched);
    setSiteReportsLoading(false);
  }

  // tick for live timer
  useEffect(() => {
    if (status === "working" || status === "lunch") {
      const id = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(id);
    }
  }, [status]);

  // Persist shift state across route changes / reloads / offline so the timer
  // keeps ticking even after switching to admin mode until the shift ends.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (status === "idle" || status === "finished") {
      window.localStorage.removeItem(SHIFT_STORAGE_KEY);
      return;
    }
    const snapshot: PersistedShift = {
      status,
      shiftStart,
      shiftEnd,
      lunchStart,
      lunchAccumMs,
      lunchIntervals,
      shiftId,
      autoLunchApplied,
    };
    try {
      window.localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* ignore quota */
    }
  }, [
    status,
    shiftStart,
    shiftEnd,
    lunchStart,
    lunchAccumMs,
    lunchIntervals,
    shiftId,
    autoLunchApplied,
  ]);

  // Load recent reports for selected site
  useEffect(() => {
    loadReports();
  }, [selectedSite?.id, user?.id]);

  const totalMs = useMemo(() => {
    if (!shiftStart) return 0;
    const end = shiftEnd ?? now;
    return end - shiftStart;
  }, [shiftStart, shiftEnd, now]);

  const currentLunchMs = status === "lunch" && lunchStart ? now - lunchStart : 0;
  const lunchMs = lunchAccumMs + currentLunchMs;
  const workMs = Math.max(0, totalMs - lunchMs);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  // === State transitions ===
  function startWork() {
    // GPS dialog gates the actual transition
    setGpsRequest({ reason: "start", label: "Начать работу" });
  }

  function startLunch() {
    if (status !== "working") return;
    const t = Date.now();
    setLunchStart(t);
    setStatus("lunch");
    toast.warning(tr("btn.startLunch"));
    if (shiftId) {
      supabase
        .from("shifts")
        .update({
          status: "lunch",
          lunch_started_at: new Date(t).toISOString(),
        })
        .eq("id", shiftId)
        .then(() => {});
    }
  }

  function endLunch() {
    if (status !== "lunch" || !lunchStart) return;
    const end = Date.now();
    const dur = end - lunchStart;
    const newAccum = lunchAccumMs + dur;
    const newIntervals = [...lunchIntervals, { start: lunchStart, end }];
    setLunchAccumMs(newAccum);
    setLunchIntervals(newIntervals);
    setLunchStart(null);
    setStatus("working");
    toast.success(tr("status.working"));
    if (shiftId) {
      supabase
        .from("shifts")
        .update({
          status: "working",
          lunch_started_at: null,
          lunch_total_ms: newAccum,
          lunch_intervals: newIntervals,
        })
        .eq("id", shiftId)
        .then(() => {});
    }
  }

  function endShift() {
    if (status !== "working" && status !== "lunch") return;
    // Auto-lunch check: >8h total, never paused
    const total = shiftStart ? Date.now() - shiftStart : 0;
    if (
      status === "working" &&
      lunchAccumMs === 0 &&
      lunchIntervals.length === 0 &&
      total > EIGHT_HOURS_MS &&
      !autoLunchApplied
    ) {
      setAutoLunchAsk(true);
      return;
    }
    setGpsRequest({ reason: "end", label: "Закончить смену" });
  }

  function handleAutoLunchSubtract() {
    setLunchAccumMs((acc) => acc + AUTO_LUNCH_MS);
    setAutoLunchApplied(true);
    setAutoLunchAsk(false);
    toast.info(tr("toast.autoLunchApplied"));
    setGpsRequest({ reason: "end", label: "Закончить смену" });
  }

  function handleAutoLunchKeep() {
    setAutoLunchApplied(true);
    setAutoLunchAsk(false);
    setGpsRequest({ reason: "end", label: "Закончить смену" });
  }

  async function reverseGeocodeCity(coords: GeolocationCoordinates | null): Promise<string | null> {
    if (!coords || (coords.latitude === 0 && coords.longitude === 0)) return null;
    try {
      const r = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=ru`,
      );
      if (!r.ok) return null;
      const j = await r.json();
      return j.city || j.locality || j.principalSubdivision || j.countryName || null;
    } catch {
      return null;
    }
  }

  async function ensureSiteForCity(
    city: string | null,
    coords: GeolocationCoordinates | null,
  ): Promise<{ id: string; name: string } | null> {
    if (!city) return null;
    const { data: existing } = await supabase
      .from("sites")
      .select("id, name")
      .ilike("name", city)
      .limit(1)
      .maybeSingle();
    if (existing) return existing;
    const address = coords
      ? `GPS: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
      : null;
    const { data: created } = await supabase
      .from("sites")
      .insert({
        name: city,
        address,
        customer: "GPS Auto",
        created_by: user?.id ?? null,
      })
      .select("id, name")
      .single();
    return created ?? null;
  }

  async function commitStartWork(coords: GeolocationCoordinates | null) {
    const t = Date.now();
    setShiftStart(t);
    setShiftEnd(null);
    setLunchAccumMs(0);
    setLunchStart(null);
    setLunchIntervals([]);
    setAutoLunchApplied(false);
    setStatus("working");
    toast.success(`${tr("shift.start")}: ${formatClock(t)}`);
    const city = await reverseGeocodeCity(coords);
    if (city) toast.info(city);
    // Auto-create a Site from the detected GPS city if no site was selected
    let siteId = selectedSite?.id ?? null;
    let siteName = selectedSite?.name ?? null;
    if (!siteId && city) {
      const auto = await ensureSiteForCity(city, coords);
      if (auto) {
        siteId = auto.id;
        siteName = auto.name;
      }
    }
    if (user) {
      const { data, error } = await supabase
        .from("shifts")
        .insert({
          user_id: user.id,
          site_id: siteId,
          site_name: siteName,
          status: "working",
          started_at: new Date(t).toISOString(),
          lunch_total_ms: 0,
          lunch_intervals: [],
          start_lat: coords?.latitude ?? null,
          start_lng: coords?.longitude ?? null,
          start_city: city,
        })
        .select("id")
        .single();
      if (!error && data) setShiftId(data.id);
    }
  }

  async function commitEndShift(coords: GeolocationCoordinates | null) {
    let intervals = lunchIntervals;
    let accum = lunchAccumMs;
    // close any open lunch
    if (status === "lunch" && lunchStart) {
      const end = Date.now();
      accum = accum + (end - lunchStart);
      intervals = [...intervals, { start: lunchStart, end }];
      setLunchAccumMs(accum);
      setLunchIntervals(intervals);
      setLunchStart(null);
    }
    const endTs = Date.now();
    setShiftEnd(endTs);
    setStatus("finished");
    toast.success(tr("status.finished"));
    const city = await reverseGeocodeCity(coords);
    if (city) toast.info(city);
    // Ensure a Site exists for the end-of-shift GPS city as well
    let extraSite: { site_id: string; site_name: string } | null = null;
    if (city) {
      const auto = await ensureSiteForCity(city, coords);
      if (auto) extraSite = { site_id: auto.id, site_name: auto.name };
    }
    if (shiftId) {
      await supabase
        .from("shifts")
        .update({
          status: "finished",
          ended_at: new Date(endTs).toISOString(),
          lunch_started_at: null,
          lunch_total_ms: accum,
          lunch_intervals: intervals,
          end_lat: coords?.latitude ?? null,
          end_lng: coords?.longitude ?? null,
          end_city: city,
          ...(extraSite && !selectedSite ? extraSite : {}),
        })
        .eq("id", shiftId);
      setShiftId(null);
    }
  }

  function handleGpsAllow() {
    if (!gpsRequest) return;
    setGpsBusy(true);
    const req = gpsRequest;
    const finish = (coords: GeolocationCoordinates | null) => {
      setGpsBusy(false);
      setGpsRequest(null);
      if (req.reason === "start") commitStartWork(coords);
      else commitEndShift(coords);
    };
    if (!navigator.geolocation) {
      toast.info(tr("toast.gpsUnavailable"));
      finish(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.success(tr("toast.gpsCaptured"));
        finish(pos.coords);
      },
      () => {
        toast.error(tr("toast.gpsFailed"));
        finish(null);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function handleGpsSkip() {
    if (!gpsRequest) return;
    const req = gpsRequest;
    setGpsRequest(null);
    toast.info(tr("toast.gpsSkipped"));
    if (req.reason === "start") commitStartWork(null);
    else commitEndShift(null);
  }

  function resetShift() {
    setStatus("idle");
    setShiftStart(null);
    setShiftEnd(null);
    setLunchStart(null);
    setLunchAccumMs(0);
    setLunchIntervals([]);
    setAutoLunchApplied(false);
    setTravelTime("");
  }

  const name = tName(user?.user_metadata?.full_name || user?.email || user?.phone || "Сотрудник");

  // === Neon status accent ===
  const statusAccent =
    status === "working"
      ? { color: "var(--neon-lime)", glow: "var(--neon-glow-lime)" }
      : status === "lunch"
        ? { color: "var(--neon-amber)", glow: "var(--neon-glow-amber)" }
        : status === "finished"
          ? { color: "var(--neon-cyan)", glow: "var(--neon-glow-cyan)" }
          : { color: "var(--muted-foreground)", glow: "none" };

  const statusLabel = tr(`status.${status}`);

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
          className="relative px-5 pt-6 pb-8 rounded-b-[2rem] border-b"
          style={{
            background: "var(--header-gradient), var(--neon-surface)",
            borderColor: "var(--neon-border)",
            boxShadow: "var(--header-shadow)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 text-left">
              <p
                className="text-[10px] uppercase tracking-[0.2em]"
                style={{ color: "var(--neon-cyan)", textShadow: "var(--neon-glow-cyan)" }}
              >
                {tr(`role.${role}`)}
              </p>
              <h1 className="text-lg font-bold truncate" style={{ color: "var(--neon-text)" }}>
                {name}
              </h1>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={openMyShifts}
                className="hover:bg-white/10 text-white"
                title={tr("header.myShifts")}
              >
                <CalendarDays className="h-5 w-5" />
              </Button>
              <LanguageSwitcher />
              <SettingsDialog />
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="hover:bg-white/10 text-white"
                title={tr("header.signOut")}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {canSwitchToAdmin && (
            <button
              type="button"
              onClick={() => onSwitchToAdmin?.()}
              className="mt-3 w-full rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-[0.15em] transition active:scale-[0.99]"
              style={{
                background: "linear-gradient(90deg, var(--neon-magenta), var(--neon-violet))",
                color: "#fff",
                boxShadow: "var(--neon-glow-violet)",
              }}
            >
              <ShieldCheck className="h-5 w-5" />
              {tr("header.openAdmin")}
            </button>
          )}

          <div
            className="mt-5 rounded-2xl px-4 py-4 border backdrop-blur"
            style={{
              background: "rgba(5, 6, 15, 0.55)",
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
              style={{ color: statusAccent.color, textShadow: statusAccent.glow }}
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
                    style={{ color: statusAccent.color, textShadow: statusAccent.glow }}
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
        </header>
        <div className="flex-1 lg:grid lg:grid-cols-2 lg:gap-8 lg:px-5">
          <div className="flex flex-col">
            {/* Action buttons — sticky neon control deck */}
            <section
              className="px-5 lg:px-0 grid grid-cols-2 lg:grid-cols-2 gap-3 sticky top-0 z-50 py-3 border-b lg:border-none lg:pt-5 lg:pb-0 lg:bg-transparent"
              style={{
                background: "color-mix(in oklab, var(--neon-bg) 85%, transparent)",
                backdropFilter: "blur(12px)",
                borderColor: "var(--neon-border)",
              }}
            >
              <StatusButton
                tone="lime"
                icon={<Rocket className="h-5 w-5" />}
                label={tr("btn.startWork")}
                active={status === "working"}
                disabled={status === "working" || status === "lunch"}
                onClick={startWork}
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
                    className="h-11 rounded-xl border-0 text-white placeholder:text-white/40"
                    style={{
                      background: "rgba(255,255,255,0.05)",
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

            {/* Photo report — neon CTA */}
            <section className="px-5 lg:px-0 mt-5">
              <button
                type="button"
                onClick={openReport}
                className="w-full rounded-2xl p-4 flex items-center gap-3 min-h-[88px] active:scale-[0.99] transition text-left"
                style={{
                  background:
                    "linear-gradient(120deg, var(--neon-magenta), var(--neon-violet) 60%, var(--neon-cyan))",
                  color: "#fff",
                  boxShadow:
                    "0 12px 40px -10px rgba(236,72,153,0.55), 0 0 0 1px rgba(255,255,255,0.08) inset",
                }}
              >
                <div
                  className="h-12 w-12 rounded-2xl grid place-items-center shrink-0"
                  style={{
                    background: "rgba(0,0,0,0.35)",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)",
                  }}
                >
                  <ScanLine className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base">{tr("report.create")}</p>
                  <p className="text-xs opacity-90 truncate">
                    {selectedSite
                      ? `${tr("report.linkedTo")}: ${selectedSite.name}`
                      : tr("report.selectFirst")}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 opacity-80 shrink-0" />
              </button>
            </section>
          </div>{" "}
          {/* End Left Column */}
          <div className="flex flex-col lg:pt-5">
            {/* Recent site reports */}
            <section className="px-5 lg:px-0 mt-5 lg:mt-0">
              <div className="flex items-center justify-between mb-2">
                <p
                  className="text-sm font-semibold flex items-center gap-2"
                  style={{ color: "var(--neon-text)" }}
                >
                  <Sparkles
                    className="h-4 w-4"
                    style={{
                      color: "var(--neon-violet)",
                      filter: "drop-shadow(var(--neon-glow-violet))",
                    }}
                  />
                  {tr("report.recent")}
                </p>
                {siteReportsLoading && (
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--neon-cyan)" }} />
                )}
              </div>

              {siteReports.length === 0 && !siteReportsLoading && (
                <p className="text-xs" style={{ color: "var(--neon-text-dim)" }}>
                  {tr("report.empty")}
                </p>
              )}

              <div className="space-y-2">
                {siteReports.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-2xl p-3"
                    style={{
                      background: "var(--neon-surface)",
                      boxShadow: "inset 0 0 0 1px var(--neon-border)",
                    }}
                  >
                    <div
                      className="h-14 w-14 rounded-xl grid place-items-center shrink-0 overflow-hidden"
                      style={{ background: "var(--neon-surface-2)" }}
                    >
                      {r.thumbUrl ? (
                        <img src={r.thumbUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ScanLine className="h-5 w-5" style={{ color: "var(--neon-text-dim)" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: "var(--neon-text)" }}>
                        {r.description || tr("report.noDesc")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            backgroundColor: CRIT_META[r.criticality].color + "22",
                            color: CRIT_META[r.criticality].color,
                            boxShadow: `0 0 12px ${CRIT_META[r.criticality].color}55`,
                          }}
                        >
                          {tr(`crit.${r.criticality}`)}
                        </span>
                        <span className="text-[10px]" style={{ color: "var(--neon-text-dim)" }}>
                          {new Date(r.created_at).toLocaleDateString(LOCALE_MAP[lang] ?? "ru-RU", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Chat tile — single, full-width neon */}
            <section className="px-5 lg:px-0 mt-4">
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="w-full rounded-2xl p-4 flex items-center gap-3 min-h-[72px] active:scale-[0.98] transition text-left"
                style={{
                  background: "var(--neon-surface)",
                  boxShadow:
                    "inset 0 0 0 1px var(--neon-border), 0 0 24px -8px rgba(34,211,238,0.35)",
                }}
              >
                <NeonIcon color="var(--neon-cyan)" glow="var(--neon-glow-cyan)">
                  <MessagesSquare className="h-5 w-5" />
                </NeonIcon>
                <span className="text-sm font-semibold" style={{ color: "var(--neon-text)" }}>
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
          className="mt-auto py-6 px-5 text-center text-xs"
          style={{ color: "var(--neon-text-dim)" }}
        >
          {tr("footer.tagline")}
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
            <div className="mx-auto mb-2 h-12 w-12 rounded-2xl bg-[color:var(--warning)]/15 text-[color:var(--warning)] grid place-items-center">
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

      <PhotoReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        site={selectedSite}
        onSuccess={loadReports}
      />

      <ChatDialog open={chatOpen} onOpenChange={setChatOpen} site={selectedSite} />

      <ShiftCalendarDialog
        open={myShiftsOpen}
        onClose={() => setMyShiftsOpen(false)}
        employeeName={name}
        shifts={myShifts}
      />
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
      <p
        className="text-[10px] uppercase tracking-[0.2em]"
        style={{ color: "var(--neon-text-dim)" }}
      >
        {label}
      </p>
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
}: {
  tone: "lime" | "amber" | "cyan" | "red";
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
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
  const textShadow = mode === "neon" ? t.glow : "none";
  const disabledBg =
    mode === "light"
      ? "color-mix(in oklab, var(--foreground) 6%, transparent)"
      : "rgba(255,255,255,0.03)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl p-4 min-h-[96px] flex flex-col items-start justify-between text-left font-semibold transition
        ${disabled ? "opacity-40 cursor-not-allowed" : "active:scale-[0.98]"}`}
      style={{
        background: disabled ? disabledBg : (bgByMode[mode] ?? bgByMode.dark),
        color: disabled ? "var(--neon-text-dim)" : t.color,
        boxShadow: disabled
          ? "inset 0 0 0 1px var(--neon-border)"
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
