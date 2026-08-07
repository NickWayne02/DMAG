import { useEffect, useMemo, useState, createContext, useContext } from "react";

export const EmployeeContext = createContext<any>(null);

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
import { StorageBrowserDialog } from "@/components/storage-browser-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SettingsDialog } from "@/components/settings-dialog";
import { useT, useLanguage } from "@/lib/i18n";
import { getCurrentPosition } from "@/lib/geocode";
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

export function EmployeeProvider({
  role,
  canSwitchToAdmin = false,
  onSwitchToAdmin,
  children,
}: {
  role: AppRole;
  canSwitchToAdmin?: boolean;
  onSwitchToAdmin?: () => void;
  children: React.ReactNode;
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
  const [siteOpen, setSiteOpenRaw] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("dmag_site_open") === "true";
  });
  const setSiteOpen = (val: boolean) => {
    setSiteOpenRaw(val);
    if (typeof window !== "undefined") window.sessionStorage.setItem("dmag_site_open", String(val));
  };

  const [reportOpen, setReportOpenRaw] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("dmag_report_open") === "true";
  });
  const setReportOpen = (val: boolean) => {
    setReportOpenRaw(val);
    if (typeof window !== "undefined") window.sessionStorage.setItem("dmag_report_open", String(val));
  };

  const [chatOpen, setChatOpenRaw] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("dmag_chat_open") === "true";
  });
  const setChatOpen = (val: boolean) => {
    setChatOpenRaw(val);
    if (typeof window !== "undefined") window.sessionStorage.setItem("dmag_chat_open", String(val));
  };

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBrowserOpen, setAvatarBrowserOpen] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setAvatarUrl(data.avatar_url);
        });
    } else {
      setAvatarUrl(null);
    }
  }, [user]);

  const handleAvatarSelect = async (publicUrl: string, path: string) => {
    if (!user) return;
    setAvatarUrl(publicUrl);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);
    if (!error) {
      toast.success("Аватар обновлен");
    } else {
      toast.error("Ошибка при обновлении аватара");
    }
    setAvatarBrowserOpen(false);
  };

  const [selectedSite, setSelectedSite] = useState<Site | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(SITE_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Site) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!selectedSite?.id) return;
    async function checkSite() {
      const { data, error } = await supabase
        .from("sites")
        .select("id")
        .eq("id", selectedSite!.id)
        .maybeSingle();
      if (!data && !error) {
        setSelectedSite(null);
        window.localStorage.removeItem(SITE_STORAGE_KEY);
      }
    }
    void checkSite();
  }, [selectedSite?.id]);

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
        "id, user_id, site_name, status, started_at, ended_at, lunch_started_at, lunch_total_ms, lunch_intervals, start_city, end_city",
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
      lunch_started_at: s.lunch_started_at ?? null,
      start_city: s.start_city ?? null,
      end_city: s.end_city ?? null,
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
    window.sessionStorage.removeItem("adminActiveTab");
    window.sessionStorage.removeItem("dmag_site_open");
    window.sessionStorage.removeItem("dmag_report_open");
    window.sessionStorage.removeItem("dmag_chat_open");
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
    coords: any | null,
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

  function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  }

  async function findNearestSite(coords: any): Promise<{ id: string; name: string } | null> {
    if (!coords?.latitude || !coords?.longitude) return null;
    const { data: sites } = await supabase.from("sites").select("id, name, address");
    if (!sites) return null;

    let nearestSite = null;
    let minDistance = 1000; // Max radius 1000 meters

    for (const site of sites) {
      if (site.address && site.address.startsWith("GPS: ")) {
        const parts = site.address.replace("GPS: ", "").split(",");
        if (parts.length >= 2) {
          const lat = parseFloat(parts[0]);
          const lng = parseFloat(parts[1]);
          const dist = getDistance(coords.latitude, coords.longitude, lat, lng);
          if (dist < minDistance) {
            minDistance = dist;
            nearestSite = { id: site.id, name: site.name };
          }
        }
      }
    }
    return nearestSite;
  }

  async function commitStartWork(coords: any | null) {
    const t = Date.now();
    setShiftStart(t);
    setShiftEnd(null);
    setLunchAccumMs(0);
    setLunchStart(null);
    setLunchIntervals([]);
    setAutoLunchApplied(false);
    setStatus("working");
    toast.success(`${tr("shift.start")}: ${formatClock(t)}`);

    let siteId = selectedSite?.id ?? null;
    let siteName = selectedSite?.name ?? null;
    let city = siteName;

    if (!siteId && coords && !coords.fake) {
      const nearest = await findNearestSite(coords);
      if (nearest) {
        siteId = nearest.id;
        siteName = nearest.name;
        city = nearest.name;
        setSelectedSite(nearest as any);
        toast.info(`${tr("shift.start")} - Авто-выбор: ${nearest.name}`);
      }
    }

    if (!siteId) {
      city = await reverseGeocodeCity(coords);
      if (city) {
        const auto = await ensureSiteForCity(city, coords);
        if (auto) {
          siteId = auto.id;
          siteName = auto.name;
          setSelectedSite(auto as any);
          toast.info(`Создан новый объект: ${auto.name}`);
        }
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

  async function handleGpsAllow() {
    if (!gpsRequest) return;
    setGpsBusy(true);
    const req = gpsRequest;
    const finish = (coords: any | null) => {
      setGpsBusy(false);
      setGpsRequest(null);
      if (req.reason === "start") commitStartWork(coords);
      else commitEndShift(coords);
    };

    let pos: any = null;

    // If a site is selected, fake the GPS lock using the site's data so the real location is NOT recorded
    if (selectedSite) {
      if (selectedSite.address && selectedSite.address.startsWith("GPS: ")) {
        const parts = selectedSite.address.replace("GPS: ", "").split(",");
        pos = { latitude: parseFloat(parts[0]), longitude: parseFloat(parts[1]) };
      } else {
        // Fallback fake coords if the site doesn't have GPS in address
        pos = { latitude: 0, longitude: 0 };
      }
      // Small artificial delay to simulate GPS lock
      await new Promise((r) => setTimeout(r, 600));
    } else {
      pos = await getCurrentPosition();
    }

    if (pos) {
      if (selectedSite?.name) {
        toast.success(`${tr("toast.gpsCaptured")} (${selectedSite.name})`);
      } else {
        toast.success(
          `${tr("toast.gpsCaptured")}: ${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}`,
        );
      }
      finish(pos);
    } else {
      toast.error(tr("toast.gpsFailed"));
      finish(null);
    }
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
    <EmployeeContext.Provider
      value={{
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
        statusAccent,
        statusLabel,
        workMs,
        lunchMs,
        totalMs,
        role,
        avatarUrl,
        openAvatarBrowser: () => setAvatarBrowserOpen(true),
        canSwitchToAdmin,
        onSwitchToAdmin,
      }}
    >
      {children}
      <StorageBrowserDialog
        open={avatarBrowserOpen}
        onOpenChange={setAvatarBrowserOpen}
        bucketName="avatars"
        onSelect={handleAvatarSelect}
      />
    </EmployeeContext.Provider>
  );
}

export const useEmployeeLogic = () => {
  const ctx = useContext(EmployeeContext);
  if (!ctx) throw new Error("Missing EmployeeContext");
  return ctx;
};
