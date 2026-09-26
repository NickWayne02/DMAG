import { useEffect, useMemo, useState, useRef } from "react";
import { StorageBrowserDialog } from "@/components/storage-browser-dialog";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { usePresence } from "@/hooks/use-presence";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users,
  Building2,
  ShieldCheck,
  FileBarChart,
  Clock,
  LogOut,
  Activity,
  Camera,
  Download,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  KeyRound,
  ArrowLeft,
  MapPin,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  Menu,
  Smartphone,
  Laptop,
  Globe,
  XCircle,
  ChevronLeft,
  ChevronRight,
  FolderSearch,
  MessageSquare,
  Palette,
  ShieldAlert,
  Merge,
  MoreHorizontal,
  AlertCircle,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import {
  toExportRows,
  exportShiftsXlsx,
  exportShiftsPdf,
  triggerDownload,
  type ShiftDetail,
} from "@/lib/shift-export";
import { FullChatApp } from "@/components/full-chat-app";
import { AdminEditableCalendarView } from "@/components/admin-editable-calendar";
import { SettingsDialog } from "@/components/settings-dialog";
import { BrandingSettingsTab } from "@/components/admin/branding-settings-tab";
import { ModerationTab } from "@/components/admin/moderation-tab";
import { useAppSettings } from "@/hooks/use-app-settings";
import dmagLogo from "@/assets/dmag-logo.png";
import { ROBOTO_BASE64 } from "@/lib/roboto-base64";
import { clearAdminSession } from "@/lib/admin-session";
import {
  adminCreateUser,
  adminDeleteUser,
  adminSetRole,
  adminUpdateCredentials,
  adminToggleActive,
  adminUpdateUser,
} from "@/lib/admin-users.functions";
import { getCurrentPosition, reverseGeocodeCity } from "@/lib/geocode";
import { useLanguage, langToLocale } from "@/lib/i18n";

const roleLabel: Record<AppRole, string> = {
  super_admin: "role.super_admin",
  admin: "role.admin",
  brigadier: "role.brigadier",
  employee: "role.employee",
};

const CRIT_META = {
  info: { labelKey: "admin.reports.critInfo", color: "#4CAF50", bg: "#E8F5E9" },
  important: { labelKey: "admin.reports.critImportant", color: "#FFB300", bg: "#FFF8E1" },
  urgent: { labelKey: "admin.reports.critUrgent", color: "#F44336", bg: "#FFEBEE" },
} as const;
type Crit = keyof typeof CRIT_META;

// Simulated employee statuses for monitoring panel
const EMP_STATUS = {
  working: { labelKey: "admin.status.working", color: "#4CAF50" },
  lunch: { labelKey: "admin.status.lunch", color: "#FFB300" },
  finished: { labelKey: "admin.status.finished", color: "#9E9E9E" },
  offline: { labelKey: "admin.status.offline", color: "#BDBDBD" },
} as const;
type EmpStatus = keyof typeof EMP_STATUS;

type EmployeeRow = {
  id: string;
  name: string;
  first_name: string | null;
  first_name_translations?: any;
  last_name: string | null;
  last_name_translations?: any;
  username: string | null;
  birth_date: string | null;
  avatar_url?: string | null;
  role: AppRole;
  status: "working" | "lunch" | "finished" | "offline";
  since: string; // HH:MM (shift start)
  workedMs: number;
  lunchMs: number;
  siteName: string | null;
  lastShiftAt: string | null; // ISO
  is_active: boolean;
  label?: string | null;
  updated_at?: string;
};

type SiteRow = {
  id: string;
  name: string;
  name_translations?: Record<string, string>;
  address: string | null;
  customer: string | null;
  comment: string | null;
  label?: string | null;
  created_at: string;
};

type ReportRow = {
  id: string;
  description: string | null;
  criticality: Crit;
  created_at: string;
  site_name: string;
  thumb: string | null;
  photo_url: string | null;
};

type SecurityLog = {
  id: string;
  ts: string;
  user: string;
  action: string;
  meta: string;
  level: "info" | "warn" | "alert";
};

function useSessionState<T>(
  key: string,
  defaultValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.sessionStorage.getItem(key);
        if (stored !== null) return JSON.parse(stored);
      } catch (e) {}
    }
    return defaultValue;
  });
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state]);

  useEffect(() => {
    const handleStorage = () => {
      try {
        const stored = window.sessionStorage.getItem(key);
        if (stored !== null) {
          const parsed = JSON.parse(stored);
          if (JSON.stringify(parsed) !== JSON.stringify(state)) {
            setState(parsed);
          }
        }
      } catch (e) {}
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key, state]);

  return [state, setState];
}

function formatHM(ms: number, t: (k: string) => string) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}${t("time.hoursShort")} ${m.toString().padStart(2, "0")}${t("time.minutesShort")}`;
}

function TablePagination({
  page,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <p className="text-sm text-muted-foreground">
        Показано {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} из {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          className="h-8 w-8 p-0 rounded-lg"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium px-2 text-muted-foreground">
          {page + 1} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          className="h-8 w-8 p-0 rounded-lg"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function AdminDashboard({
  role,
  devMode = false,
  superMode = false,
}: {
  role: AppRole;
  devMode?: boolean;
  superMode?: boolean;
}) {
  const { user } = useAuth();
  const { onlineUsers, presenceMap } = usePresence();
  const navigate = useNavigate();
  const { t, tName, lang } = useLanguage();

  const getEmpName = (e: EmployeeRow): string => {
    const fName = (e.first_name_translations || {})[lang] || e.first_name || "";
    const lName = (e.last_name_translations || {})[lang] || e.last_name || "";
    const constructed = `${fName} ${lName}`.trim();
    return constructed ? tName(constructed) : tName(e.name);
  };

  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => setIsHydrated(true), []);

  const { data: appSettings } = useAppSettings();

  const [activeTab, setActiveTab] = useSessionState("dmag_admin_activeTab", "dashboard");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [employees, setEmployees] = useSessionState<EmployeeRow[]>("dmag_admin_cached_emps", []);
  const [sites, setSites] = useSessionState<SiteRow[]>("dmag_admin_cached_sites", []);
  const [reports, setReports] = useSessionState<ReportRow[]>("dmag_admin_cached_reports", []);
  const [reportsHasMore, setReportsHasMore] = useSessionState(
    "dmag_admin_cached_reportsHasMore",
    false,
  );
  const [reportsLoadingMore, setReportsLoadingMore] = useState(false);
  const [editingReport, setEditingReport] = useState<{
    id: string;
    description: string;
    criticality: Crit;
    thumb: string | null;
  } | null>(null);

  // Pagination states
  const [personnelPage, setPersonnelPage] = useState(0);
  const [sitesPage, setSitesPage] = useState(0);
  const [adminPage, setAdminPage] = useState(0);
  const PAGE_SIZE = 10;

  // Filter states
  const [personnelSearch, setPersonnelSearch] = useSessionState("dmag_admin_personnelSearch", "");
  const [personnelRole, setPersonnelRole] = useSessionState("dmag_admin_personnelRole", "all");
  const [personnelStatus, setPersonnelStatus] = useSessionState(
    "dmag_admin_personnelStatus",
    "all",
  );

  const [adminSelectedFirmId, setAdminSelectedFirmId] = useSessionState("dmag_admin_firm", "all");
  const [presets, setPresets] = useSessionState<
    { id: string; app_name: string; app_logo_url: string | null }[]
  >("dmag_admin_presets", []);

  const [sitesSearch, setSitesSearch] = useSessionState("dmag_admin_sitesSearch", "");
  const [adminSearch, setAdminSearch] = useSessionState("dmag_admin_adminSearch", "");

  const [reportsSearch, setReportsSearch] = useSessionState<string>("dmag_admin_reportsSearch", "");
  const [reportsSite, setReportsSite] = useSessionState("dmag_admin_reportsSite", "all");
  const [reportsCrit, setReportsCrit] = useSessionState("dmag_admin_reportsCrit", "all");
  const [reportsPeriod, setReportsPeriod] = useSessionState("dmag_admin_reportsPeriod", "all");

  const reportsFiltersRef = useRef({
    search: "",
    site: "all",
    crit: "all",
    period: "all",
    paginated: false,
  });
  const isFirstRender = useRef(true);

  useEffect(() => {
    reportsFiltersRef.current = {
      search: reportsSearch,
      site: reportsSite,
      crit: reportsCrit,
      period: reportsPeriod,
      paginated: reports.length > 20,
    };

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      loadFilteredReports(true);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [reportsSearch, reportsSite, reportsCrit, reportsPeriod]);

  const [logs, setLogs] = useState<SecurityLog[]>([]);

  useEffect(() => {
    if (employees.length === 0) return;
    const now = Date.now();
    const simLogs: SecurityLog[] = [];

    // 1. Current Session (Web)
    const currentPData = user ? presenceMap[user.id] || {} : {};
    let currentMeta = "Определение локации...";
    if (currentPData.ip && currentPData.ip !== "Unknown IP") {
      currentMeta = `${currentPData.ip} · ${currentPData.city}, ${currentPData.country}`;
    } else if (currentPData.ip === "Unknown IP") {
      currentMeta = "Локация недоступна";
    }

    const getDeviceAction = (deviceType: string | undefined) => {
      if (deviceType === "app") return t("admin.security.deviceApp");
      if (deviceType === "mobile_web") return t("admin.security.deviceMobileWeb");
      return t("admin.security.deviceWeb");
    };

    const getDeviceLevel = (deviceType: string | undefined) => {
      if (deviceType === "app" || deviceType === "mobile_web") return "info"; // phone icon
      return "warn"; // laptop icon
    };

    simLogs.push({
      id: "session-current",
      ts: currentPData.online_at || new Date().toISOString(),
      user: "Super-Admin", // will be replaced in UI or kept generic
      action: getDeviceAction(currentPData.device_type),
      meta: currentMeta,
      level: getDeviceLevel(currentPData.device_type) as "info" | "warn",
    });

    // 2. Other Sessions (Mobile Apps)
    employees
      .filter((e) => onlineUsers.includes(e.id) && e.id !== user?.id)
      .forEach((e) => {
        const pData = presenceMap[e.id] || {};
        let meta = "Определение локации...";
        if (pData.ip && pData.ip !== "Unknown IP") {
          meta = `${pData.ip} · ${pData.city}, ${pData.country}`;
        } else if (pData.ip === "Unknown IP") {
          meta = "Локация недоступна";
        }

        simLogs.push({
          id: `session-${e.id}`,
          ts: pData.online_at || new Date().toISOString(),
          user: e.name,
          action: getDeviceAction(pData.device_type),
          meta,
          level: getDeviceLevel(pData.device_type) as "info" | "warn",
        });
      });

    setLogs(simLogs);
  }, [employees, t, logs.length, onlineUsers, presenceMap, user?.id]);
  const [loading, setLoading] = useState(true);
  const [shiftHistory, setShiftHistory] = useSessionState<ShiftDetail[]>(
    "dmag_admin_cached_shiftHist",
    [],
  );
  
  const [calEmpId, setCalEmpId] = useState<string>("__none__");
  const [calRefresh, setCalRefresh] = useState(0);

  const name = user?.user_metadata?.full_name || user?.email || "Администратор";

  async function signOut() {
    clearAdminSession();
    window.sessionStorage.removeItem("dmag_dev_admin");
    window.sessionStorage.removeItem("dmag_super_admin");
    window.localStorage.removeItem("dmag_shift_state");
    window.localStorage.removeItem("dmag_selected_site");
    window.localStorage.removeItem("dmag_selected_preset");
    if (devMode) {
      navigate({ to: "/auth" });
      return;
    }
    
    // Clear FCM token before signing out
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await supabase.from("profiles").update({ fcm_token: null } as any).eq("id", session.user.id);
    }
    
    await supabase.auth.signOut({ scope: "local" });
    navigate({ to: "/auth" });
  }

  async function loadAll() {
    // Background polling should not set loading=true to prevent UI flickering
    // Calendar is refreshed via postgres_changes on shifts instead of polling

    // Window for "active today" shifts: from local midnight
    const sinceMidnight = new Date();
    sinceMidnight.setHours(0, 0, 0, 0);

    const [
      { data: profiles },
      { data: userRoles },
      { data: siteData },
      { data: reportData },
      { data: shiftData },
      { data: presetsData },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*"),
      supabase.from("user_roles").select("user_id, role"),
      supabase
        .from("sites")
        .select("id, name, name_translations, address, customer, created_at, label")
        .order("created_at", { ascending: false }),
      (function () {
        let q = supabase
          .from("photo_reports")
          .select("id, description, criticality, photo_url, created_at, site_id, author_id")
          .order("created_at", { ascending: false });
        if (reportsSite === "general_chat") q = q.is("site_id", null);
        else if (reportsSite !== "all") q = q.eq("site_id", reportsSite);
        if (reportsCrit !== "all")
          q = q.eq("criticality", reportsCrit as "info" | "important" | "urgent");
        if (reportsSearch) q = q.ilike("description", `%${reportsSearch}%`);
        if (reportsPeriod === "today") {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          q = q.gte("created_at", d.toISOString());
        } else if (reportsPeriod === "week") {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          q = q.gte("created_at", d.toISOString());
        }
        return q.limit(20);
      })(),
      supabase
        .from("shifts")
        .select(
          "id, user_id, site_name, preset_id, status, started_at, ended_at, lunch_started_at, lunch_total_ms, start_city, end_city",
        )
        .gte("started_at", sinceMidnight.toISOString())
        .order("started_at", { ascending: false }),
      supabase.from("app_branding_presets").select("*").order("created_at"),
    ]);

    let sortedPresets = presetsData || [];
    if (presetsData) {
      sortedPresets = [...presetsData].sort((a, b) => {
        const order: Record<string, number> = { DMAG: 1, "E&R": 2, "O&D": 3 };
        const aName = (a.app_name || "").toUpperCase().trim();
        const bName = (b.app_name || "").toUpperCase().trim();
        const aVal = order[aName] || 99;
        const bVal = order[bName] || 99;
        return aVal - bVal;
      });
      setPresets(sortedPresets);
    }

    const roleMap = new Map<string, AppRole>();
    (userRoles ?? []).forEach((r) => {
      const cur = roleMap.get(r.user_id);
      const prio: Record<AppRole, number> = {
        super_admin: 4,
        admin: 3,
        brigadier: 2,
        employee: 1,
      };
      if (!cur || prio[r.role as AppRole] > prio[cur]) {
        roleMap.set(r.user_id, r.role as AppRole);
      }
    });

    const myProfile = (profiles ?? []).find((p) => p.id === user?.id);
    const myLabel = myProfile?.label ?? null;

    // Keep only the latest shift per user for today
    const latestShiftByUser = new Map<string, NonNullable<typeof shiftData>[number]>();
    (shiftData ?? []).forEach((s) => {
      if (!latestShiftByUser.has(s.user_id)) latestShiftByUser.set(s.user_id, s);
    });

    const nowMs = Date.now();
    let emps: EmployeeRow[] = (profiles ?? [])
      .filter((p) => {
        const r = roleMap.get(p.id) ?? "employee";
        if (role === "admin" && r === "super_admin") return false;

        const sh = latestShiftByUser.get(p.id);
        const empFirmId = sh?.preset_id || p.label || sortedPresets?.[0]?.id;
        if (adminSelectedFirmId !== "all" && empFirmId !== adminSelectedFirmId) return false;

        return true;
      })
      .map((p) => {
        const r = roleMap.get(p.id) ?? "employee";
        const sh = latestShiftByUser.get(p.id);
        let status: EmpStatus = "offline";
        let since = "—";
        let workedMs = 0;
        let lunchMs = 0;
        let siteName: string | null = null;
        let lastShiftAt: string | null = null;
        if (sh) {
          lastShiftAt = sh.started_at;
          siteName = sh.site_name ?? (sh as any).start_city ?? (sh as any).end_city ?? null;
          const startedMs = new Date(sh.started_at).getTime();
          const endedMs = sh.ended_at ? new Date(sh.ended_at).getTime() : nowMs;
          let currentLunch = 0;
          if (sh.status === "lunch" && sh.lunch_started_at) {
            currentLunch = nowMs - new Date(sh.lunch_started_at).getTime();
          }
          lunchMs = Number(sh.lunch_total_ms ?? 0) + Math.max(0, currentLunch);
          workedMs = Math.max(0, endedMs - startedMs - lunchMs);
          status =
            sh.status === "working" ? "working" : sh.status === "lunch" ? "lunch" : "finished";
          const d = new Date(sh.started_at);
          since = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        }
        return {
          id: p.id,
          name: p.full_name || p.email || p.phone || "Без имени",
          first_name: p.first_name,
          first_name_translations: (p as any).first_name_translations,
          last_name: p.last_name,
          last_name_translations: (p as any).last_name_translations,
          username: p.username,
          birth_date: p.birth_date,
          avatar_url: p.avatar_url ?? null,
          role: r,
          status,
          since,
          workedMs,
          lunchMs,
          siteName,
          lastShiftAt,
          is_active: p.is_active ?? true,
          updated_at: p.updated_at,
        };
      });

    if (devMode && emps.length === 0) {
      emps = [
        {
          id: "dev-1",
          name: "Иван Иванов",
          role: "admin",
          status: "finished",
          since: "08:00",
          workedMs: 0,
          lunchMs: 0,
          siteName: null,
          lastShiftAt: null,
          is_active: true,
          first_name: null,
          last_name: null,
          username: null,
          birth_date: null,
        },
        {
          id: "dev-2",
          name: "Max Keller",
          role: "brigadier",
          status: "working",
          since: "07:20",
          workedMs: 4 * 3600_000,
          lunchMs: 30 * 60_000,
          siteName: "DMAG Werkhalle Nord",
          lastShiftAt: new Date().toISOString(),
          is_active: true,
          first_name: null,
          last_name: null,
          username: null,
          birth_date: null,
        },
        {
          id: "dev-3",
          name: "Oleh Petrenko",
          role: "employee",
          status: "working",
          since: "07:45",
          workedMs: 3.5 * 3600_000,
          lunchMs: 0,
          siteName: "Bauprojekt Hafen Ost",
          lastShiftAt: new Date().toISOString(),
          is_active: true,
          first_name: null,
          last_name: null,
          username: null,
          birth_date: null,
        },
        {
          id: "dev-4",
          name: "Serhii Kovalenko",
          role: "employee",
          status: "lunch",
          since: "12:05",
          workedMs: 3 * 3600_000,
          lunchMs: 25 * 60_000,
          siteName: "DMAG Werkhalle Nord",
          lastShiftAt: new Date().toISOString(),
          is_active: true,
          first_name: null,
          last_name: null,
          username: null,
          birth_date: null,
        },
      ];
    }

    let siteRows: SiteRow[] = (siteData ?? [])
      .filter((s) => {
        const sFirm = s.label || sortedPresets?.[0]?.id;
        if (adminSelectedFirmId !== "all" && sFirm !== adminSelectedFirmId) return false;
        return true;
      })
      .map((s) => ({
        id: s.id,
        name: s.name,
        name_translations: (s.name_translations as Record<string, string>) || {},
        address: s.address,
        customer: s.customer,
        comment: (s as any).comment ?? null,
        label: (s as any).label ?? null,
        created_at: s.created_at,
      }));
    if (devMode && siteRows.length === 0) {
      siteRows = [
        {
          id: "site-1",
          name: "DMAG Werkhalle Nord",
          address: "Industriestraße 14, Köln",
          customer: "DMAG",
          comment: "test",
          created_at: new Date().toISOString(),
        },
        {
          id: "site-2",
          name: "Bürokomplex Süd",
          address: "Südstadt 2, Bonn",
          customer: "TechCorp",
          comment: null,
          created_at: new Date().toISOString(),
        },
      ];
    }
    const siteNameMap = new Map(siteRows.map((s) => [s.id, s.name]));

    const reportsRaw = reportData ?? [];
    const allowedEmpIds = new Set(emps.map((e) => e.id));
    let repRows: ReportRow[] = reportsRaw
      .filter((r) => {
        if (role === "admin" && (!r.author_id || !allowedEmpIds.has(r.author_id))) return false;
        if (adminSelectedFirmId !== "all") {
          const author = (profiles ?? []).find((p) => p.id === r.author_id);
          const repFirm = author?.label || sortedPresets?.[0]?.id;
          if (repFirm !== adminSelectedFirmId) return false;
        }
        return true;
      })
      .map((r) => ({
        id: r.id,
        description: r.description,
        criticality: r.criticality as Crit,
        created_at: r.created_at,
        site_name: r.site_id ? (siteNameMap.get(r.site_id) ?? "—") : t("chat.generalChannel", { defaultValue: "Общий чат" }),
        thumb: r.photo_url
          ? supabase.storage.from("photo-reports").getPublicUrl(r.photo_url).data.publicUrl
          : null,
        photo_url: r.photo_url || null,
      }));
    if (devMode && repRows.length === 0) {
      repRows = [
        {
          id: "report-1",
          description: "Проверка ограждений завершена, требуется подпись бригадира.",
          criticality: "important",
          created_at: new Date().toISOString(),
          site_name: siteRows[0]?.name ?? "DMAG",
          thumb: null,
          photo_url: null,
        },
        {
          id: "report-2",
          description: "Срочный дефект крепления на участке B-12.",
          criticality: "urgent",
          created_at: new Date(Date.now() - 1800000).toISOString(),
          site_name: siteRows[1]?.name ?? "DMAG",
          thumb: null,
          photo_url: null,
        },
      ];
    }

    setEmployees(emps);
    setSites(siteRows);

    const f = reportsFiltersRef.current;
    if (!f.paginated) {
      setReports(repRows);
      setReportsHasMore(repRows.length === 20);
    }

    // Full shift history (last 30 days) for exports and calendar view
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);
    since30.setHours(0, 0, 0, 0);
    const { data: histData } = await supabase
      .from("shifts")
      .select(
        "id, user_id, site_name, preset_id, status, started_at, ended_at, lunch_total_ms, lunch_intervals, lunch_started_at, start_city, end_city",
      )
      .gte("started_at", since30.toISOString())
      .order("started_at", { ascending: false });
    const nameById = new Map(emps.map((e) => [e.id, e.name]));
    const history: ShiftDetail[] = (histData ?? [])
      .filter((s: any) => {
        const shFirm =
          s.preset_id ||
          (profiles ?? []).find((p) => p.id === s.user_id)?.label ||
          sortedPresets?.[0]?.id;
        if (adminSelectedFirmId !== "all" && shFirm !== adminSelectedFirmId) return false;
        return true;
      })
      .map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        user_name: nameById.get(s.user_id) ?? "—",
        site_name: s.site_name ?? null,
        started_at: s.started_at,
        ended_at: s.ended_at,
        lunch_started_at: s.lunch_started_at ?? null,
        start_city: tName(s.start_city) ?? null,
        end_city: tName(s.end_city) ?? null,
        lunch_intervals: Array.isArray(s.lunch_intervals) ? s.lunch_intervals : [],
        lunch_total_ms: Number(s.lunch_total_ms ?? 0),
        status: s.status,
      }));
    setShiftHistory(history);

    setLoading(false);
  }

  async function deletePhotoReport(id: string, photo_url: string | null | undefined) {
    if (!confirm("Удалить фотоотчёт?")) return;

    setReports((prev) => prev.filter((x) => x.id !== id));

    const { error } = await supabase.from("photo_reports").delete().eq("id", id);
    if (!error && photo_url) {
      await supabase.from("chat_messages").delete().like("content", `%${photo_url}%`);
    }

    if (error) {
      toast.error("Ошибка при удалении");
      loadFilteredReports(true);
    } else {
      toast.success("Фотоотчёт удален");
    }
  }

  async function savePhotoReportEdit() {
    if (!editingReport) return;

    // Optimistic update
    setReports((prev) =>
      prev.map((r) =>
        r.id === editingReport.id
          ? { ...r, description: editingReport.description, criticality: editingReport.criticality }
          : r,
      ),
    );

    const reportId = editingReport.id;
    const newDesc = editingReport.description;
    const newCrit = editingReport.criticality;
    setEditingReport(null);
    toast.success("Изменения сохранены");

    const { error } = await supabase
      .from("photo_reports")
      .update({
        description: newDesc,
        criticality: newCrit,
      })
      .eq("id", reportId);

    if (error) {
      toast.error("Ошибка при сохранении");
      loadFilteredReports(true);
    }
  }

  async function loadFilteredReports(reset: boolean = false) {
    if (reportsLoadingMore) return;
    if (!reset && !reportsHasMore) return;
    setReportsLoadingMore(true);
    try {
      const from = reset ? 0 : reports.length;
      const to = from + 19;
      let query = supabase
        .from("photo_reports")
        .select("id, description, criticality, photo_url, created_at, site_id, author_id")
        .order("created_at", { ascending: false });

      if (reportsSite === "general_chat") query = query.is("site_id", null);
      else if (reportsSite !== "all") query = query.eq("site_id", reportsSite);
      if (reportsCrit !== "all")
        query = query.eq("criticality", reportsCrit as "info" | "important" | "urgent");
      if (reportsSearch) query = query.ilike("description", `%${reportsSearch}%`);

      if (reportsPeriod === "today") {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        query = query.gte("created_at", d.toISOString());
      } else if (reportsPeriod === "week") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        query = query.gte("created_at", d.toISOString());
      }

      const { data } = await query.range(from, to);

      if (data && data.length > 0) {
        const siteNameMap = new Map(sites.map((s) => [s.id, s.name]));
        const allowedEmpIds = new Set(employees.map((e) => e.id));

        const newRepRows = data
          .filter((r: any) => {
            if (role === "admin" && (!r.author_id || !allowedEmpIds.has(r.author_id))) return false;
            return true;
          })
          .map((r: any) => ({
            id: r.id,
            description: r.description,
            criticality: r.criticality,
            created_at: r.created_at,
            site_name: r.site_id ? (siteNameMap.get(r.site_id) ?? "—") : t("chat.generalChannel", { defaultValue: "Общий чат" }),
            thumb: r.photo_url
              ? supabase.storage.from("photo-reports").getPublicUrl(r.photo_url).data.publicUrl
              : null,
            photo_url: r.photo_url || null,
          }));

        setReports((prev) => (reset ? newRepRows : [...prev, ...newRepRows]));
        setReportsHasMore(data.length === 20);
      } else {
        if (reset) setReports([]);
        setReportsHasMore(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReportsLoadingMore(false);
    }
  }

  const loadMoreReports = () => loadFilteredReports(false);

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 2000); // 2 seconds for near-instant UI updates without manual SQL setup

    const sub = supabase
      .channel("admin-dashboard-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "shifts" }, () => {
        loadAll();
        setCalRefresh((r) => r + 1);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "photo_reports" }, () => {
        loadAll();
      })
      .subscribe();

    return () => {
      clearInterval(id);
      supabase.removeChannel(sub);
    };
  }, [
    adminSelectedFirmId,
    reportsSite,
    reportsCrit,
    reportsSearch,
    reportsPeriod,
    role,
    user?.id,
    devMode,
    t,
  ]);

  const stats = useMemo(() => {
    const workers = employees.filter((e) => e.role === "employee" || e.role === "brigadier");
    return {
      working: workers.filter((e) => e.status === "working").length,
      lunch: workers.filter((e) => e.status === "lunch").length,
      sites: sites.length,
      urgent: reports.filter((r) => r.criticality === "urgent").length,
    };
  }, [employees, sites, reports]);

  // ===== Site editor (admin + super_admin) =====
  type SiteEdit = {
    id?: string;
    name: string;
    name_translations: Record<string, string>;
    address: string;
    customer: string;
  };
const [siteEdit, setSiteEdit] = useState<SiteEdit | null>(null);

  const [siteSaving, setSiteSaving] = useState(false);
  const [siteGpsBusy, setSiteGpsBusy] = useState(false);

  async function fillSiteFromGps() {
    if (!siteEdit) return;
    setSiteGpsBusy(true);
    const coords = await getCurrentPosition();
    if (!coords) {
      toast.error("Не удалось получить координаты. Проверьте разрешение GPS.");
      setSiteGpsBusy(false);
      return;
    }
    const city = await reverseGeocodeCity(coords);
    setSiteEdit({
      ...siteEdit,
      name: city || siteEdit.name,
      address: `GPS: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
    });
    setSiteGpsBusy(false);
  }

  function openAddSite() {
    setSiteEdit({ name: "", name_translations: {}, address: "", customer: "" });
  }

  async function saveSite() {
    if (!siteEdit) return;
    if (!siteEdit.name.trim()) {
      toast.error("Укажите название объекта");
      return;
    }
    setSiteSaving(true);
    let err: { message: string } | null = null;
    if (siteEdit.id) {
      const { error } = await supabase
        .from("sites")
        .update({
          name: siteEdit.name.trim(),
          name_translations: siteEdit.name_translations as any,
          address: siteEdit.address.trim() || null,
          customer: siteEdit.customer.trim() || null,
        })
        .eq("id", siteEdit.id);
      err = error as any;
    } else {
      const { error } = await supabase.from("sites").insert({
        name: siteEdit.name.trim(),
        name_translations: siteEdit.name_translations as any,
        address: siteEdit.address.trim() || null,
        customer: siteEdit.customer.trim() || null,
        created_by: user?.id ?? null,
        label: adminSelectedFirmId === "all" ? null : adminSelectedFirmId,
      });
      err = error as any;
    }
    setSiteSaving(false);
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success("Объект сохранён");
    setSiteEdit(null);
    loadAll();
  }

  async function deleteSite(id: string, name: string) {
    if (
      !confirm(
        `Удалить объект «${name}»? Внимание: все смены и отработанное время на этом объекте также будут удалены.`,
      )
    )
      return;
    await supabase.from("shifts").delete().eq("site_id", id);
    const { error } = await supabase.from("sites").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Объект удалён");
    loadAll();
  }

  // ===== User management (super_admin only) =====
  const createUserFn = useServerFn(adminCreateUser);
  const deleteUserFn = useServerFn(adminDeleteUser);
  const setRoleFn = useServerFn(adminSetRole);
  const updateCredsFn = useServerFn(adminUpdateCredentials);
  const adminToggleActiveFn = useServerFn(adminToggleActive);
  const updateUserFn = useServerFn(adminUpdateUser);

  // Mocks vs Real Data

  const [createForm, setCreateForm] = useState<{
    open: boolean;
    email: string;
    password: string;
    first_name: string;
    first_name_translations?: any;
    last_name: string;
    last_name_translations?: any;
    username: string;
    birth_date: string;
    role: AppRole;
    label: string;
  }>({ open: false, email: "", password: "", first_name: "", first_name_translations: {}, last_name: "", last_name_translations: {}, username: "", birth_date: "", role: "employee", label: "" });

  const [nameEdit, setNameEdit] = useState<{
    user_id: string;
    user_name: string;
    first_name: string;
    first_name_translations?: any;
    last_name: string;
    last_name_translations?: any;
    username: string;
    birth_date: string;
    current_label: string;
    open: boolean;
  } | null>(null);

  const [credsEdit, setCredsEdit] = useState<{
    user_id: string;
    user_name: string;
    email: string;
    password: string;
  } | null>(null);
  const [userBusy, setUserBusy] = useState(false);

  async function submitCreateUser() {
    if (!createForm.email || !createForm.password) {
      toast.error("Email и пароль обязательны");
      return;
    }
    setUserBusy(true);
    try {
      await createUserFn({
        data: {
          email: createForm.email.trim(),
          password: createForm.password,
          first_name: createForm.first_name.trim(),
          first_name_translations: createForm.first_name_translations,
          last_name: createForm.last_name.trim(),
          last_name_translations: createForm.last_name_translations,
          username: createForm.username.trim(),
          birth_date: createForm.birth_date,
          role: createForm.role,
          label: createForm.label.trim() || null,
        },
      });
      toast.success(`Пользователь ${createForm.email} создан`);
      setCreateForm({
        open: false,
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        username: "",
        birth_date: "",
        role: "employee",
        label: "",
      });
      loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось создать");
    } finally {
      setUserBusy(false);
    }
  }

  async function submitNameUpdate() {
    if (!nameEdit) return;
    setUserBusy(true);
    try {
      await updateUserFn({
        data: {
          user_id: nameEdit.user_id,
          first_name: nameEdit.first_name,
          first_name_translations: nameEdit.first_name_translations,
          last_name: nameEdit.last_name,
          last_name_translations: nameEdit.last_name_translations,
          username: nameEdit.username,
          birth_date: nameEdit.birth_date,
          label: nameEdit.current_label.trim() || null,
        },
      });
      toast.success("Данные успешно обновлены");
      setNameEdit(null);
      if (nameEdit.user_id === user?.id) {
        await supabase.auth.refreshSession();
      }
      loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось обновить имя");
    } finally {
      setUserBusy(false);
    }
  }

  async function submitCredsUpdate() {
    if (!credsEdit) return;
    setUserBusy(true);
    try {
      await updateCredsFn({
        data: {
          user_id: credsEdit.user_id,
          email: credsEdit.email || undefined,
          password: credsEdit.password || undefined,
        },
      });
      toast.success("Логин/пароль обновлены");
      setCredsEdit(null);
      loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось обновить");
    } finally {
      setUserBusy(false);
    }
  }

  async function removeUser(emp: EmployeeRow) {
    if (!confirm(`Удалить ${emp.name}? Это действие необратимо.`)) return;
    setUserBusy(true);
    try {
      await deleteUserFn({ data: { user_id: emp.id } });
      toast.success("Пользователь удалён");
      loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось удалить");
    } finally {
      setUserBusy(false);
    }
  }

  async function changeRole(emp: EmployeeRow, role: AppRole) {
    setUserBusy(true);
    try {
      await setRoleFn({ data: { user_id: emp.id, role } });
      toast.success(`Роль обновлена: ${t(roleLabel[role])}`);
      loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось обновить роль");
    } finally {
      setUserBusy(false);
    }
  }

  async function exportReports(fmt: "xlsx" | "pdf") {
    setUserBusy(true);
    try {
      const filename = `dmag-reports-${new Date().toISOString().slice(0, 10)}`;

      if (reports.length === 0) {
        toast.info("Нет данных для экспорта");
        return;
      }

      if (fmt === "pdf") {
        toast.info("Подготовка PDF, скачивание оригиналов...");

        async function fetchImageData(
          url: string,
        ): Promise<{ base64: string; w: number; h: number } | null> {
          try {
            const res = await fetch(url);
            const blob = await res.blob();
            const base64 = await new Promise<string | null>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            });
            if (!base64) return null;
            return await new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve({ base64, w: img.width, h: img.height });
              img.onerror = () => resolve(null);
              img.src = base64;
            });
          } catch (e) {
            return null;
          }
        }

        // Fetch original photos for better quality
        const imagesData = await Promise.all(
          reports.map((r) => (r.thumb ? fetchImageData(r.thumb) : Promise.resolve(null))),
        );

        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
        const pageWidth = 595.28;
        const pageHeight = 841.89;

        doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_BASE64);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
        doc.setFont("Roboto");

        reports.forEach((r, i) => {
          if (i > 0) doc.addPage();

          // Fill background
          doc.setFillColor(20, 20, 20);
          doc.rect(0, 0, pageWidth, pageHeight, "F");

          const imgData = imagesData[i];
          if (imgData) {
            // Calculate contain dimensions for the top 85% of the page
            const drawAreaHeight = pageHeight * 0.85;
            const ratio = imgData.w / imgData.h;
            let drawW = pageWidth;
            let drawH = drawW / ratio;

            if (drawH > drawAreaHeight) {
              drawH = drawAreaHeight;
              drawW = drawH * ratio;
            }

            const x = (pageWidth - drawW) / 2;
            const y = (drawAreaHeight - drawH) / 2;

            try {
              doc.addImage(imgData.base64, x, y, drawW, drawH);
            } catch (e) {
              console.error("Failed to add image", e);
            }
          } else {
            doc.setTextColor(150, 150, 150);
            doc.setFontSize(16);
            doc.text("Нет фото", pageWidth / 2, pageHeight * 0.4, { align: "center" });
          }

          // Draw text block at the bottom 15%
          const textYStart = pageHeight * 0.85 + 25;
          doc.setTextColor(255, 255, 255);

          doc.setFontSize(16);
          doc.text(r.site_name, 30, textYStart);

          doc.setFontSize(11);
          doc.setTextColor(180, 180, 180);
          const dateStr = new Date(r.created_at).toLocaleString(langToLocale(lang));
          doc.text(dateStr, 30, textYStart + 20);

          doc.setTextColor(220, 220, 220);
          doc.text(r.description || "Без описания", 30, textYStart + 45, {
            maxWidth: pageWidth - 60,
          });
        });

        const blob = doc.output("blob");
        triggerDownload(blob, `${filename}.pdf`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Ошибка при экспорте");
    } finally {
      setUserBusy(false);
    }
  }

  function shiftExportRows() {
    return toExportRows(shiftHistory);
  }
  function exportShiftsAs(fmt: "xlsx" | "pdf") {
    const rows = shiftExportRows();
    if (rows.length === 0) {
      toast.info("Нет смен за последние 30 дней");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const base = `dmag-smeny-${stamp}`;
    if (fmt === "xlsx") exportShiftsXlsx(rows, `${base}.xlsx`);
    else exportShiftsPdf(rows, `${base}.pdf`, "Отчёт по сменам (30 дней)", lang);
  }

  const filteredPersonnel = useMemo(() => {
    return employees.filter((e) => {
      if (personnelSearch && !getEmpName(e).toLowerCase().includes(personnelSearch.toLowerCase()))
        return false;
      if (personnelRole !== "all" && e.role !== personnelRole) return false;
      if (personnelStatus !== "all" && e.status !== personnelStatus) return false;
      return true;
    });
  }, [employees, personnelSearch, personnelRole, personnelStatus]);

  const filteredSites = useMemo(() => {
    return sites.filter((s) => {
      if (!sitesSearch) return true;
      const term = sitesSearch.toLowerCase();
      return (
        (s.name && s.name.toLowerCase().includes(term)) ||
        (s.address && s.address.toLowerCase().includes(term))
      );
    });
  }, [sites, sitesSearch]);

  const filteredAdmins = useMemo(() => {
    return employees.filter((e) => {
      if (!adminSearch) return true;
      return getEmpName(e).toLowerCase().includes(adminSearch.toLowerCase());
    });
  }, [employees, adminSearch]);

  const activities = useMemo(() => {
    const list: any[] = [];
    shiftHistory.slice(0, 50).forEach((s) => {
      const emp = employees.find((e) => e.id === s.user_id) || {
        name: t("admin.users.unknownEmployee", { defaultValue: "Неизвестный сотрудник" }),
      };
      list.push({
        id: `shift-start-${s.id}`,
        ts: s.started_at,
        type: "shift_start",
        title: t("admin.activity.shiftStart"),
        desc: t("admin.activity.shiftStarted", {
          name: tName(emp.name),
          site: s.site_name
            ? tName(s.site_name)
            : tName(s.start_city || "") ||
              t("admin.activity.unknownSite", { defaultValue: "Unknown" }),
        }),
        icon: <Users className="h-4 w-4" />,
        color: "text-green-600 bg-green-500/10",
      });
      if (s.ended_at) {
        list.push({
          id: `shift-end-${s.id}`,
          ts: s.ended_at,
          type: "shift_end",
          title: t("admin.activity.shiftEnd"),
          desc: t("admin.activity.shiftEnded", {
            name: tName(emp.name),
            site: s.site_name
              ? tName(s.site_name)
              : tName(s.end_city || "") ||
                t("admin.activity.unknownSite", { defaultValue: "Unknown" }),
          }),
          icon: <Activity className="h-4 w-4" />,
          color: "text-blue-600 bg-blue-500/10",
        });
      }
      if (Array.isArray(s.lunch_intervals)) {
        s.lunch_intervals.forEach((interval: any, i: number) => {
          if (interval.start) {
            list.push({
              id: `shift-lunch-start-${s.id}-${i}`,
              ts: interval.start,
              type: "lunch_start",
              title: t("admin.activity.pauseStart"),
              desc: t("admin.activity.lunchStarted", { name: tName(emp.name) }),
              icon: <Clock className="h-4 w-4" />,
              color: "text-amber-600 bg-amber-500/10",
            });
          }
          if (interval.end) {
            // If the lunch ended at the exact same time the shift ended (auto-close), don't show a duplicate event
            const endLunchMs = new Date(interval.end).getTime();
            const endShiftMs = s.ended_at ? new Date(s.ended_at).getTime() : 0;
            const isAutoClosed = s.ended_at && Math.abs(endShiftMs - endLunchMs) < 2000;

            if (!isAutoClosed) {
              list.push({
                id: `shift-lunch-end-${s.id}-${i}`,
                ts: interval.end,
                type: "lunch_end",
                title: t("admin.activity.pauseEnd"),
                desc: t("admin.activity.lunchEnded", { name: tName(emp.name) }),
                icon: <Clock className="h-4 w-4" />,
                color: "text-amber-600 bg-amber-500/10",
              });
            }
          }
        });
      }

      // Also render the active lunch start event if they are currently on a break
      if (s.lunch_started_at) {
        list.push({
          id: `shift-lunch-start-active-${s.id}`,
          ts: s.lunch_started_at,
          type: "lunch_start",
          title: t("admin.activity.pauseStart"),
          desc: t("admin.activity.lunchStarted", { name: emp.name }),
          icon: <Clock className="h-4 w-4" />,
          color: "text-amber-600 bg-amber-500/10",
        });
      }
    });
    reports.slice(0, 30).forEach((r) => {
      list.push({
        id: `report-${r.id}`,
        ts: r.created_at,
        type: "report",
        title: t("admin.activity.newPhotoReport", { defaultValue: "Новый фотоотчёт" }),
        desc: r.description || t("admin.activity.noDescription", { defaultValue: "Без описания" }),
        icon: <Camera className="h-4 w-4" />,
        color: "text-orange-600 bg-orange-500/10",
      });
    });
    return list.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 20);
  }, [shiftHistory, reports, employees]);

  if (!isHydrated) {
    return <div className="min-h-screen bg-muted/30" />;
  }

  const activeFirmId = adminSelectedFirmId === "all" ? null : adminSelectedFirmId;
  const currentFirm = presets.find((f: any) => f.id === activeFirmId);
  const displayLogo = currentFirm?.app_logo_url || appSettings?.app_logo_url || dmagLogo;
  const displayName = currentFirm?.app_name || appSettings?.app_name || "DMAG";

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-sidebar text-sidebar-foreground z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col ${
          mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
          <div className="px-6 py-6 flex items-center gap-3 border-b border-sidebar-border">
            <img src={displayLogo} alt="Logo" className="h-10 w-10 rounded-xl object-cover shadow shrink-0" />
            <div className="min-w-0">
              <Select
                value={adminSelectedFirmId}
                onValueChange={(val) => setAdminSelectedFirmId(val)}
              >
                <SelectTrigger className="h-7 px-0 py-0 border-none bg-transparent shadow-none w-full justify-start font-bold hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:ring-0 truncate [&>svg]:opacity-50">
                  <SelectValue placeholder={t("admin.allFirms")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.dashboard.all_firms", { defaultValue: "Все фирмы" })}</SelectItem>
                  {presets.map((p: any) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.app_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs opacity-75 pl-0">Admin Console</p>
            </div>
          </div>
        <nav className="px-3 py-4 flex-1 space-y-1">
          {[
            { id: "dashboard", icon: Activity, label: t("admin.tab.dashboard"), super: false },
            { id: "calendar", icon: CalendarDays, label: t("admin.tab.calendar"), super: false },
            { id: "personnel", icon: Users, label: t("admin.tab.personnel"), super: false },
            { id: "sites", icon: Building2, label: t("admin.tab.sites"), super: false },
            { id: "reports", icon: Camera, label: t("admin.tab.reports"), super: false },
            { id: "branding", icon: Palette, label: t("admin.tab.branding"), super: true },
            { id: "security", icon: ShieldCheck, label: t("admin.tab.security"), super: true },
            { id: "admin-management", icon: Users, label: t("admin.tab.users"), super: false },
            {
              id: "moderation",
              icon: ShieldAlert,
              label: t("admin.tab.moderation", { defaultValue: "Модерация" }),
              super: false,
            },
            { id: "chat", icon: MessageSquare, label: t("tile.chat"), super: false },
          ]
            .filter((item) => !item.super || superMode)
            .map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition ${
                  activeTab === item.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "hover:bg-sidebar-accent/60"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="leading-tight">{item.label}</span>
              </button>
            ))}
        </nav>
        <div className="px-6 py-4 border-t border-sidebar-border text-xs opacity-75">
          DMAG · MVP v1.0
        </div>
      </aside>

      <div className="md:ml-64 flex flex-col min-h-screen max-w-full overflow-hidden">
        <header className="bg-background border-b border-border px-4 md:px-6 h-16 flex items-center justify-between sticky top-0 z-10 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold truncate">
                {activeTab === "dashboard" && <span>{t("admin.tab.dashboard")}</span>}
                {activeTab === "personnel" && <span>{t("admin.tab.personnel")}</span>}
                {activeTab === "sites" && <span>{t("admin.tab.sites")}</span>}
                {activeTab === "reports" && <span>{t("admin.tab.reports")}</span>}
                {activeTab === "branding" && <span>{t("admin.tab.branding")}</span>}
                {activeTab === "security" && <span>{t("admin.tab.security")}</span>}
                {activeTab === "admin-management" && <span>{t("admin.tab.users")}</span>}
                {activeTab === "chat" && <span>{t("tile.chat")}</span>}
              </h1>
              <p className="hidden md:block text-[10px] md:text-xs text-muted-foreground truncate">
                {t(roleLabel[role])} · {tName(name)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                clearAdminSession();
                navigate({ to: "/employee-dashboard" });
              }}
              className="rounded-full h-9 px-3 md:px-4 text-muted-foreground hover:text-foreground"
              title="К смене"
            >
              <ArrowLeft className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{t("admin.header.toShift")}</span>
            </Button>
            <SettingsDialog
              variant="icon"
              className="inline-flex items-center justify-center rounded-full h-9 w-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground shrink-0 transition-colors"
            />
            <Button
              variant="ghost"
              onClick={signOut}
              className="rounded-full h-9 w-9 p-0 shrink-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="p-4 md:p-6 space-y-6 flex-1 w-full max-w-full overflow-x-hidden">
          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <>
              {/* KPI tiles */}
              <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Kpi
                  label={t("dashboard.kpi.workers")}
                  value={String(stats.working)}
                  tone="success"
                  icon={<Users className="h-5 w-5" />}
                />
                <Kpi
                  label={t("dashboard.kpi.lunch")}
                  value={String(stats.lunch)}
                  tone="warning"
                  icon={<Clock className="h-5 w-5" />}
                />
                <Kpi
                  label={t("dashboard.kpi.sites")}
                  value={String(stats.sites)}
                  tone="primary"
                  icon={<Building2 className="h-5 w-5" />}
                />
                <Kpi
                  label={t("dashboard.kpi.urgent")}
                  value={String(stats.urgent)}
                  tone="destructive"
                  icon={<ShieldCheck className="h-5 w-5" />}
                />
              </section>

              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-8">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("admin.loading")}…
                </div>
              ) : activities.length === 0 ? (
                <div className="flex-1 mt-6 flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl border-muted bg-card/30">
                  <div className="h-20 w-20 bg-muted/60 rounded-full flex items-center justify-center mb-5">
                    <FolderSearch className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    {t("admin.activity.emptyTitle")}
                  </h4>
                  <p className="text-sm text-muted-foreground max-w-sm mb-6">
                    {t("admin.activity.emptyDesc")}
                  </p>
                </div>
              ) : (
                <div className="mt-6 bg-card rounded-2xl p-6 border shadow-sm">
                  <h3 className="font-semibold mb-4 text-lg">{t("admin.activity.title")}</h3>
                  <div className="space-y-4">
                    {activities.map((act) => (
                      <div key={act.id} className="flex gap-4 items-start">
                        <div
                          className={`mt-0.5 shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${act.color}`}
                        >
                          {act.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{act.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                            {act.desc}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap pt-0.5 tabular-nums">
                          {new Date(act.ts).toLocaleString(langToLocale(lang), {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* PERSONNEL TAB - shows employee monitoring */}
          {activeTab === "personnel" && (
            <section className="flex flex-col gap-4">
              <Card className="p-6 rounded-2xl w-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{t("admin.personnel.title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("admin.personnel.desc")}</p>
                  </div>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="rounded-xl">
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          {t("admin.header.export")}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 rounded-xl">
                        <DropdownMenuItem
                          onSelect={() => exportShiftsAs("xlsx")}
                          className="rounded-lg cursor-pointer"
                        >
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => exportShiftsAs("pdf")}
                          className="rounded-lg cursor-pointer"
                        >
                          <FileBarChart className="h-4 w-4 mr-2" />
                          PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <Input
                    placeholder={t("admin.personnel.search")}
                    value={personnelSearch}
                    onChange={(e) => {
                      setPersonnelSearch(e.target.value);
                      setPersonnelPage(0);
                    }}
                    className="max-w-xs rounded-xl"
                  />
                  <Select
                    value={personnelRole}
                    onValueChange={(v) => {
                      setPersonnelRole(v);
                      setPersonnelPage(0);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-40 rounded-xl bg-background">
                      <SelectValue placeholder={t("admin.filter.role", { defaultValue: "Роль" })} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">{t("admin.personnel.allRoles")}</SelectItem>
                      <SelectItem value="employee">{t("admin.personnel.employee")}</SelectItem>
                      <SelectItem value="brigadier">
                        {t("role.brigadier", { defaultValue: "Бригадир" })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={personnelStatus}
                    onValueChange={(v) => {
                      setPersonnelStatus(v);
                      setPersonnelPage(0);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-40 rounded-xl bg-background">
                      <SelectValue
                        placeholder={t("admin.filter.status", { defaultValue: "Статус" })}
                      />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">{t("admin.personnel.allStatuses")}</SelectItem>
                      <SelectItem value="working">{t("admin.personnel.onShift")}</SelectItem>
                      <SelectItem value="lunch">{t("admin.personnel.onPause")}</SelectItem>
                      <SelectItem value="finished">{t("admin.personnel.shiftEnded")}</SelectItem>
                      <SelectItem value="offline">{t("admin.personnel.offline")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filteredPersonnel.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("admin.personnel.noData")}</p>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("admin.personnel.colEmployee")}</TableHead>
                            <TableHead>{t("admin.personnel.colRole")}</TableHead>
                            <TableHead>{t("admin.personnel.colStatus")}</TableHead>
                            <TableHead>{t("admin.personnel.colSite")}</TableHead>
                            <TableHead className="text-right">
                              {t("admin.personnel.colStart")}
                            </TableHead>
                            <TableHead className="text-right">
                              {t("admin.personnel.colWork")}
                            </TableHead>
                            <TableHead className="text-right">
                              {t("admin.personnel.colPause")}
                            </TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPersonnel
                            .slice(personnelPage * PAGE_SIZE, (personnelPage + 1) * PAGE_SIZE)
                            .map((e) => {
                              const st = EMP_STATUS[e.status];
                              return (
                                <TableRow key={e.id}>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={e.avatar_url || ""} />
                                        <AvatarFallback>
                                          {getEmpName(e).substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col">
                                        <span>{getEmpName(e)}</span>
                                        {superMode && e.label && (
                                          <span className="text-xs text-muted-foreground">
                                            {e.label}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    {t(roleLabel[e.role])}
                                  </TableCell>
                                  <TableCell>
                                    <span
                                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                                      style={{ backgroundColor: `${st.color}1A`, color: st.color }}
                                    >
                                      <span
                                        className="h-1.5 w-1.5 rounded-full"
                                        style={{ backgroundColor: st.color }}
                                      />
                                      {t(st.labelKey)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground truncate max-w-45">
                                    {e.siteName || "—"}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-sm">
                                    {e.since}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-sm">
                                    {formatHM(e.workedMs, t)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                                    {formatHM(e.lunchMs, t)}
                                  </TableCell>
                                  <TableCell></TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="md:hidden space-y-3">
                      {filteredPersonnel
                        .slice(personnelPage * PAGE_SIZE, (personnelPage + 1) * PAGE_SIZE)
                        .map((e) => {
                          const st = EMP_STATUS[e.status];
                          return (
                            <div
                              key={e.id}
                              className="flex flex-col gap-2 rounded-2xl border bg-card p-4"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <h4 className="font-semibold">{getEmpName(e)}</h4>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {t(roleLabel[e.role])}
                                    {superMode && e.label && ` · ${e.label}`}
                                  </p>
                                </div>
                                
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span
                                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                  style={{ backgroundColor: `${st.color}1A`, color: st.color }}
                                >
                                  <span
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: st.color }}
                                  />
                                  {t(st.labelKey)}
                                </span>
                                {e.siteName && (
                                  <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md truncate max-w-40">
                                    {e.siteName}
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t text-center text-xs">
                                <div>
                                  <p className="text-muted-foreground text-[10px] mb-0.5">
                                    {t("admin.personnel.colStart")}
                                  </p>
                                  <p className="font-medium">{e.since}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-[10px] mb-0.5">
                                    {t("admin.personnel.colWork")}
                                  </p>
                                  <p className="font-medium">{formatHM(e.workedMs, t)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-[10px] mb-0.5">
                                    {t("admin.personnel.colPause")}
                                  </p>
                                  <p className="font-medium">{formatHM(e.lunchMs, t)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    <TablePagination
                      page={personnelPage}
                      total={filteredPersonnel.length}
                      pageSize={PAGE_SIZE}
                      onPageChange={setPersonnelPage}
                    />
                  </>
                )}
              </Card>


            </section>
          )}

          {/* SITES TAB */}
          {activeTab === "sites" && (
            <>
              <Card className="p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{t("admin.sites.title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("admin.sites.desc")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      {sites.length}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openAddSite}
                      className="rounded-xl"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      {t("admin.sites.add")}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <Input
                    placeholder={t("admin.dashboard.searchSite")}
                    value={sitesSearch}
                    onChange={(e) => {
                      setSitesSearch(e.target.value);
                      setSitesPage(0);
                    }}
                    className="max-w-xs rounded-xl"
                  />
                </div>

                {filteredSites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("admin.sites.empty")}</p>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("admin.sites.colName")}</TableHead>
                            <TableHead>{t("admin.sites.colAddress")}</TableHead>
                            <TableHead>{t("admin.sites.colCustomer")}</TableHead>
                            <TableHead className="text-right">
                              {t("admin.dashboard.employees")}
                            </TableHead>
                            <TableHead className="text-right">
                              {t("admin.sites.colCreated")}
                            </TableHead>
                            <TableHead className="text-right">
                              {t("admin.sites.colActions")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSites
                            .slice(sitesPage * PAGE_SIZE, (sitesPage + 1) * PAGE_SIZE)
                            .map((s) => {
                              const empCount = employees.filter(
                                (e) => e.siteName === s.name,
                              ).length;
                              return (
                                <TableRow key={s.id}>
                                  <TableCell className="font-medium">{tName(s.name, s.name_translations)}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {s.address || "—"}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {s.customer || "—"}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    <Badge variant="secondary" className="font-mono">
                                      {empCount}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                                    {new Date(s.created_at).toLocaleDateString(langToLocale(lang))}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="rounded-lg"
                                        onClick={() =>
                                          setSiteEdit({
                                            id: s.id,
                                            name: s.name,
                                            name_translations: s.name_translations || {},
                                            address: s.address ?? "",
                                            customer: s.customer ?? "",
                                          })
                                        }
                                        title={t("admin.sites.edit")}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="rounded-lg text-destructive hover:text-destructive"
                                        onClick={() => deleteSite(s.id, s.name)}
                                        title={t("admin.sites.delete")}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="md:hidden space-y-3">
                      {filteredSites
                        .slice(sitesPage * PAGE_SIZE, (sitesPage + 1) * PAGE_SIZE)
                        .map((s) => {
                          const empCount = employees.filter((e) => e.siteName === s.name).length;
                          return (
                            <div
                              key={s.id}
                              className="flex flex-col gap-2 rounded-2xl border bg-card p-4"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <h4 className="font-semibold text-base">{tName(s.name, s.name_translations)}</h4>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-lg"
                                    onClick={() =>
                                      setSiteEdit({
                                        id: s.id,
                                        name: s.name,
                                        name_translations: s.name_translations || {},
                                        address: s.address ?? "",
                                        customer: s.customer ?? "",
                                      })
                                    }
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => deleteSite(s.id, s.name)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-1 mt-1 text-sm text-muted-foreground">
                                {s.address && (
                                  <div className="flex items-start gap-1.5">
                                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span className="line-clamp-2">{tName(s.address)}</span>
                                  </div>
                                )}
                                {s.customer && (
                                  <div className="flex items-start gap-1.5">
                                    <Building2 className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span className="line-clamp-1">{s.customer}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-between items-center mt-2 pt-3 border-t">
                                <span className="text-xs text-muted-foreground">
                                  {t("admin.dashboard.employees")}:
                                </span>
                                <Badge variant="secondary" className="font-mono">
                                  {empCount}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    <TablePagination
                      page={sitesPage}
                      total={filteredSites.length}
                      pageSize={PAGE_SIZE}
                      onPageChange={setSitesPage}
                    />
                  </>
                )}
              </Card>


              {/* Site editor dialog */}
              <Dialog open={!!siteEdit} onOpenChange={(o) => !o && setSiteEdit(null)}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {siteEdit?.id ? t("admin.sites.dlgEdit") : t("admin.sites.dlgNew")}
                    </DialogTitle>
                    <DialogDescription>{t("admin.sites.dlgDesc")}</DialogDescription>
                  </DialogHeader>
                  {siteEdit && (
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11 rounded-xl justify-start"
                        onClick={fillSiteFromGps}
                        disabled={siteGpsBusy}
                      >
                        {siteGpsBusy ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <MapPin className="h-4 w-4 mr-2" />
                        )}
                        {t("admin.sites.dlgGps")}
                      </Button>

                      <div className="space-y-1.5">
                        <Label>{t("admin.sites.dlgName")} (Default/EN)</Label>
                        <Input
                          value={siteEdit.name}
                          onChange={(e) => setSiteEdit({ ...siteEdit, name: e.target.value })}
                          placeholder={t("admin.sites.dlgNamePl")}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Название (RU)</Label>
                          <Input
                            value={siteEdit.name_translations?.ru || ""}
                            onChange={(e) => setSiteEdit({ ...siteEdit, name_translations: { ...siteEdit.name_translations, ru: e.target.value } })}
                            placeholder="На русском"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Название (UK)</Label>
                          <Input
                            value={siteEdit.name_translations?.uk || ""}
                            onChange={(e) => setSiteEdit({ ...siteEdit, name_translations: { ...siteEdit.name_translations, uk: e.target.value } })}
                            placeholder="На украинском"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("admin.sites.dlgAddress")}</Label>
                        <Input
                          value={siteEdit.address}
                          onChange={(e) => setSiteEdit({ ...siteEdit, address: e.target.value })}
                          placeholder={t("admin.sites.dlgAddressPl")}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("admin.sites.dlgCustomer")}</Label>
                        <Input
                          value={siteEdit.customer}
                          onChange={(e) => setSiteEdit({ ...siteEdit, customer: e.target.value })}
                          placeholder="DMAG"
                        />
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setSiteEdit(null)} disabled={siteSaving}>
                      {t("admin.sites.dlgCancel")}
                    </Button>
                    <Button onClick={saveSite} disabled={siteSaving}>
                      {siteSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {t("admin.sites.dlgSave")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}

          {/* REPORTS TAB */}
          {activeTab === "reports" && (
            <section className="flex flex-col gap-4">
              <Card className="p-6 rounded-2xl w-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{t("admin.reports.title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("admin.reports.desc")}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => exportReports("pdf")}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {t("admin.header.export")}
                  </Button>
                </div>

                <div className="flex flex-col flex-wrap sm:flex-row gap-3 mb-6">
                  <Input
                    placeholder={t("admin.reports.searchDesc")}
                    value={reportsSearch}
                    onChange={(e) => setReportsSearch(e.target.value)}
                    className="w-full sm:w-50 rounded-xl bg-background"
                  />
                  <Select value={reportsSite} onValueChange={setReportsSite}>
                    <SelectTrigger className="w-full sm:w-40 rounded-xl bg-background">
                      <SelectValue placeholder={t("admin.reports.sitePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-64">
                      <SelectItem value="all">{t("admin.reports.allSites")}</SelectItem>
                      {sites
                        .slice()
                        .sort((a, b) => tName(a.name).localeCompare(tName(b.name)))
                        .map((s) => (
                          <SelectItem key={`rs-${s.id}`} value={s.id}>
                            {tName(s.name, s.name_translations)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant={reportsSite === "general_chat" ? "default" : "outline"}
                    className="rounded-xl w-full sm:w-auto shrink-0"
                    onClick={() => setReportsSite(prev => prev === "general_chat" ? "all" : "general_chat")}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {t("chat.generalChannel")}
                  </Button>

                  <Select value={reportsPeriod} onValueChange={setReportsPeriod}>
                    <SelectTrigger className="w-full sm:w-40 rounded-xl bg-background">
                      <SelectValue placeholder={t("admin.reports.periodPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">{t("admin.reports.allTime")}</SelectItem>
                      <SelectItem value="today">{t("admin.reports.today")}</SelectItem>
                      <SelectItem value="week">{t("admin.reports.week")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {reports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed rounded-2xl border-muted bg-card/30">
                    <div className="h-20 w-20 bg-muted/60 rounded-full flex items-center justify-center mb-5">
                      <Camera className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                    <p className="text-base text-muted-foreground max-w-sm">
                      {t("admin.reports.empty")}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
                      {reports.map((r) => {
                        return (
                          <div
                            key={r.id}
                            className="flex flex-col rounded-2xl border bg-card overflow-hidden shadow-sm"
                          >
                            {/* Feed Header */}
                            <div className="flex items-center justify-between p-4 pb-3">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <Camera className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm line-clamp-1">
                                    {tName(r.site_name)}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {new Date(r.created_at).toLocaleString(langToLocale(lang), {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                  <DropdownMenuItem 
                                    onClick={() => setEditingReport({
                                      id: r.id,
                                      description: r.description || "",
                                      criticality: r.criticality,
                                      thumb: r.thumb || null,
                                    })}
                                    className="rounded-lg cursor-pointer"
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    {t("admin.reports.edit", { defaultValue: "Редактировать" })}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => deletePhotoReport(r.id, r.photo_url)}
                                    className="rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t("admin.reports.delete", { defaultValue: "Удалить" })}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Feed Image */}
                            <div 
                              className="w-full bg-muted h-[40vh] sm:h-[60vh] max-h-128 flex items-center justify-center cursor-pointer overflow-hidden relative"
                              onClick={() => r.thumb && window.open(r.thumb, '_blank')}
                            >
                              {r.photo_url ? (
                                <img 
                                  src={r.thumb || undefined} 
                                  alt="Report" 
                                  className="w-full h-full object-contain transition-transform hover:scale-105 duration-500" 
                                />
                              ) : (
                                <div className="flex flex-col items-center text-muted-foreground opacity-50">
                                  <Camera className="h-10 w-10 mb-2" />
                                  <span className="text-sm">Нет фото</span>
                                </div>
                              )}
                              
                              {/* Criticality Badge on top of image */}
                              {r.criticality === "important" && (
                                <div className="absolute top-3 left-3 bg-amber-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md shadow-sm">
                                  {t("admin.reports.critImportant", { defaultValue: "Важно" })}
                                </div>
                              )}
                              {r.criticality === "urgent" && (
                                <div className="absolute top-3 left-3 bg-destructive/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md shadow-sm flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {t("admin.reports.critUrgent", { defaultValue: "Критично" })}
                                </div>
                              )}
                            </div>

                            {/* Feed Footer */}
                            <div className="p-4 pt-3">
                              {r.description ? (
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                  <span className="font-medium mr-2">{tName(r.site_name)}</span>
                                  {r.description}
                                </p>
                              ) : (
                                <p className="text-sm italic text-muted-foreground">
                                  {t("admin.reports.noDesc")}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {reportsHasMore && (
                      <div className="mt-6 flex justify-center">
                        <Button
                          variant="outline"
                          onClick={loadMoreReports}
                          disabled={reportsLoadingMore}
                          className="rounded-xl px-8"
                        >
                          {reportsLoadingMore ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          {t("admin.sessions.loadMore", { defaultValue: "Загрузить ещё" })}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </Card>
            </section>
          )}

          {/* BRANDING TAB */}
          {activeTab === "branding" && superMode && (
            <BrandingSettingsTab
              onUpdate={() => loadAll()}
              onApplyPreset={(id) => setAdminSelectedFirmId(id)}
            />
          )}

          {/* SECURITY TAB */}
          {activeTab === "security" && superMode && (
            <section className="flex flex-col gap-4">
              <Card className="p-6 rounded-2xl w-full">
                <div className="space-y-6 max-h-125 overflow-y-auto pr-2">
                  {/* Current Session */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">
                      {t("admin.security.currentSession")}
                    </h4>
                    {logs.length > 0 && (
                      <div className="flex items-start gap-4 p-4 rounded-2xl border bg-primary/5">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          {logs[0].level === "info" ? (
                            <Smartphone className="h-5 w-5 text-primary" />
                          ) : (
                            <Laptop className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold truncate">{logs[0].action}</p>
                            <span className="text-[11px] font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              {t("admin.sessions.online", { defaultValue: "В сети" })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {logs[0].meta}
                          </p>
                          <p className="text-xs text-primary mt-1 font-medium">{logs[0].user}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Other Sessions */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold">{t("admin.security.otherSessions")}</h4>
                      {logs.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setLogs((prev) => prev.slice(0, 1));
                            toast.success("Все остальные сеансы успешно завершены");
                          }}
                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {t("admin.security.terminateAll")}
                        </Button>
                      )}
                    </div>
                    {logs.length <= 1 ? (
                      <p className="text-sm text-muted-foreground">{t("admin.security.empty")}</p>
                    ) : (
                      <div className="space-y-2">
                        {logs.slice(1).map((l) => (
                          <div
                            key={l.id}
                            className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                                {l.level === "info" ? (
                                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Laptop className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{l.action}</p>
                                <p className="text-xs text-muted-foreground truncate">{l.meta}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[11px] font-medium text-green-500 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-green-500"></span>
                                    {t("admin.sessions.online", { defaultValue: "В сети" })}
                                  </span>
                                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                                  <p className="text-[11px] font-medium truncate">{l.user}</p>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setLogs((prev) => prev.filter((log) => log.id !== l.id));
                                toast.success(`Сеанс ${l.user} завершен`);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                              title={t("admin.security.terminate")}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </section>
          )}

          {/* ADMIN MANAGEMENT TAB */}
          {activeTab === "admin-management" && (
            <Card className="p-6 rounded-2xl border-2 border-dashed border-primary/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold">{t("admin.users.title")}</h3>
                  <p className="text-sm text-muted-foreground">{t("admin.users.desc")}</p>
                </div>
                <Button
                  size="sm"
                  className="rounded-xl w-full sm:w-auto"
                  onClick={() =>
                    setCreateForm((f) => ({
                      ...f,
                      open: true,
                      label: adminSelectedFirmId !== "all" ? adminSelectedFirmId : "",
                    }))
                  }
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t("admin.users.create")}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Input
                  placeholder={t("admin.users.search")}
                  value={adminSearch}
                  onChange={(e) => {
                    setAdminSearch(e.target.value);
                    setAdminPage(0);
                  }}
                  className="max-w-xs rounded-xl bg-background"
                />
              </div>

              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("admin.users.user")}</TableHead>
                        <TableHead>{t("admin.users.colStatus")}</TableHead>
                        <TableHead>{t("admin.users.colLastLogin")}</TableHead>
                        <TableHead>{t("admin.users.role")}</TableHead>
                        <TableHead className="text-right">{t("admin.users.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAdmins.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-sm text-muted-foreground text-center py-6"
                          >
                            {t("admin.users.empty")}
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredAdmins
                        .slice(adminPage * PAGE_SIZE, (adminPage + 1) * PAGE_SIZE)
                        .map((e) => {
                          const isOnline = onlineUsers.includes(e.id);
                          const lastLogin = isOnline
                            ? t("admin.users.online")
                            : e.updated_at
                              ? new Date(e.updated_at).toLocaleString(langToLocale(lang), {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : t("admin.users.noData");
                          return (
                            <TableRow key={`mgr-${e.id}`}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={e.avatar_url || ""} />
                                    <AvatarFallback>
                                      {getEmpName(e).substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span>{getEmpName(e)}</span>
                                    {superMode && e.label && (
                                      <span className="text-xs text-muted-foreground">
                                        {e.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                  {e.is_active ? (
                                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
                                      {t("admin.users.active")}
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="secondary"
                                      className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20"
                                    >
                                      {t("admin.users.moderation")}
                                    </Badge>
                                  )}
                                  {e.status === "working" && (
                                    <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 whitespace-nowrap flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                      {lang === "en" ? "On shift" : "На смене"}
                                    </Badge>
                                  )}
                                  {e.status === "lunch" && (
                                    <Badge className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20 whitespace-nowrap flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                      {lang === "en" ? "On lunch" : "На обеде"}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {lastLogin}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={e.role}
                                  onValueChange={(v) => changeRole(e, v as AppRole)}
                                  disabled={
                                    userBusy ||
                                    e.id === user?.id ||
                                    (!superMode && (e.role === "super_admin" || e.role === "admin"))
                                  }
                                >
                                  <SelectTrigger className="h-8 w-40 rounded-lg">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="employee">
                                      {t(roleLabel.employee)}
                                    </SelectItem>
                                    <SelectItem value="brigadier">
                                      {t(roleLabel.brigadier)}
                                    </SelectItem>
                                    {superMode && (
                                      <SelectItem value="admin">{t(roleLabel.admin)}</SelectItem>
                                    )}
                                    {superMode && (
                                      <SelectItem value="super_admin">
                                        {t(roleLabel.super_admin)}
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                {!e.is_active && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-lg bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                                    disabled={
                                      userBusy ||
                                      (!superMode &&
                                        (e.role === "super_admin" || e.role === "admin"))
                                    }
                                    onClick={async () => {
                                      setUserBusy(true);
                                      try {
                                        await adminToggleActiveFn({
                                          data: { user_id: e.id, is_active: true },
                                        });
                                        toast.success("Аккаунт одобрен");
                                        loadAll();
                                      } catch (err) {
                                        toast.error(err instanceof Error ? err.message : "Ошибка");
                                      } finally {
                                        setUserBusy(false);
                                      }
                                    }}
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                                    {t("admin.users.approve", { defaultValue: "Одобрить" })}
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-lg"
                                  disabled={
                                    userBusy ||
                                    (!superMode && (e.role === "super_admin" || e.role === "admin"))
                                  }
                                  onClick={() =>
                                    setNameEdit({
                                      user_id: e.id,
                                      user_name: e.name,
                                      first_name: e.first_name || "",
                                      first_name_translations: (e as any).first_name_translations || {},
                                      last_name: e.last_name || "",
                                      last_name_translations: (e as any).last_name_translations || {},
                                      username: e.username || "",
                                      birth_date: e.birth_date || "",
                                      current_label: e.label ?? "",
                                      open: true,
                                    })
                                  }
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-1" />
                                  {t("admin.moderation.edit") || "Редактировать"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-lg"
                                  disabled={
                                    userBusy ||
                                    (!superMode && (e.role === "super_admin" || e.role === "admin"))
                                  }
                                  onClick={() =>
                                    setCredsEdit({
                                      user_id: e.id,
                                      user_name: e.name,
                                      email: "",
                                      password: "",
                                    })
                                  }
                                >
                                  <KeyRound className="h-3.5 w-3.5 mr-1" />
                                  {t("admin.users.credentials")}
                                </Button>

                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="rounded-lg"
                                  disabled={
                                    userBusy ||
                                    e.id === user?.id ||
                                    (!superMode && (e.role === "super_admin" || e.role === "admin"))
                                  }
                                  onClick={() => removeUser(e)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden space-y-3">
                  {filteredAdmins.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-6 border rounded-2xl bg-card">
                      {t("admin.users.empty")}
                    </div>
                  )}
                  {filteredAdmins
                    .slice(adminPage * PAGE_SIZE, (adminPage + 1) * PAGE_SIZE)
                    .map((e) => {
                      return (
                        <div
                          key={e.id}
                          className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={e.avatar_url || ""} />
                                <AvatarFallback>
                                  {getEmpName(e).substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-semibold text-base truncate">
                                  {getEmpName(e)}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {t(roleLabel[e.role])}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={e.is_active ? "default" : "secondary"}
                              className={
                                e.is_active
                                  ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                                  : ""
                              }
                            >
                              {e.is_active ? t("admin.users.active") : t("admin.users.inactive")}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <span className="font-medium">{t("admin.users.colLastLogin")}:</span>
                            <span>
                              {onlineUsers.includes(e.id)
                                ? t("admin.users.online")
                                : e.updated_at
                                  ? new Date(e.updated_at).toLocaleString(langToLocale(lang), {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : t("admin.users.noData")}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-2 pt-3 border-t">
                            <Select
                              disabled={
                                userBusy ||
                                e.id === user?.id ||
                                (!superMode && (e.role === "super_admin" || e.role === "admin"))
                              }
                              value={e.role}
                              onValueChange={async (val) => {
                                setUserBusy(true);
                                try {
                                  await changeRole(e, val as AppRole);
                                } finally {
                                  setUserBusy(false);
                                }
                              }}
                            >
                              <SelectTrigger className="flex-1 h-8 text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="employee">{t("admin.users.employee")}</SelectItem>
                                <SelectItem value="brigadier">{t("admin.users.brigadier", { defaultValue: "Бригадир" })}</SelectItem>
                                <SelectItem value="admin">{t("admin.users.admin")}</SelectItem>
                                {superMode && <SelectItem value="super_admin">{t("admin.users.superAdmin", { defaultValue: "Супер-админ" })}</SelectItem>}
                              </SelectContent>
                            </Select>
                            {!e.is_active && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 rounded-lg bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                                disabled={
                                  userBusy ||
                                  (!superMode && (e.role === "super_admin" || e.role === "admin"))
                                }
                                onClick={async () => {
                                  setUserBusy(true);
                                  try {
                                    await adminToggleActiveFn({
                                      data: { user_id: e.id, is_active: true },
                                    });
                                    toast.success("Аккаунт включен");
                                    loadAll();
                                  } catch (err) {
                                    toast.error(err instanceof Error ? err.message : "Ошибка");
                                  } finally {
                                    setUserBusy(false);
                                  }
                                }}
                              >
                                {t("admin.users.enable", { defaultValue: "Включить" })}
                              </Button>
                            )}
                            <div className="w-full flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 rounded-lg"
                                disabled={
                                  userBusy ||
                                  (!superMode && (e.role === "super_admin" || e.role === "admin"))
                                }
                                onClick={() =>
                                  setNameEdit({
                                      user_id: e.id,
                                      user_name: e.name,
                                      first_name: e.first_name || "",
                                      first_name_translations: (e as any).first_name_translations || {},
                                      last_name: e.last_name || "",
                                      last_name_translations: (e as any).last_name_translations || {},
                                      username: e.username || "",
                                      birth_date: e.birth_date || "",
                                      current_label: e.label ?? "",
                                      open: true,
                                    })
                                }
                              >
                                <Pencil className="h-4 w-4 mr-1.5" />
                                {t("admin.moderation.edit") || "Редактировать"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 rounded-lg"
                                disabled={
                                  userBusy ||
                                  (!superMode && (e.role === "super_admin" || e.role === "admin"))
                                }
                                onClick={() =>
                                  setCredsEdit({
                                    user_id: e.id,
                                    user_name: e.name,
                                    email: "",
                                    password: "",
                                  })
                                }
                              >
                                <KeyRound className="h-4 w-4 mr-1.5" />
                                {t("admin.users.credentials")}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="rounded-lg px-3"
                                disabled={
                                  userBusy ||
                                  e.id === user?.id ||
                                  (!superMode && (e.role === "super_admin" || e.role === "admin"))
                                }
                                onClick={() => removeUser(e)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                <TablePagination
                  page={adminPage}
                  total={filteredAdmins.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setAdminPage}
                />
              </>
            </Card>
          )}

          {/* CHAT TAB */}
          {activeTab === "chat" && (
            <div className="h-[80vh] md:h-[calc(100vh-6rem)] w-full rounded-2xl overflow-hidden border shadow-sm">
              <FullChatApp sites={sites} />
            </div>
          )}

          {/* MODERATION TAB */}
          {activeTab === "moderation" && <ModerationTab />}

          {/* CALENDAR TAB */}
          {activeTab === "calendar" && (
            <div className="space-y-6 flex flex-col h-full max-h-[85vh]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">{t("admin.tab.calendar")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t("admin.calendar.desc")}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={calEmpId} onValueChange={setCalEmpId}>
                    <SelectTrigger className="w-full sm:w-64 bg-background">
                      <SelectValue placeholder={t("admin.calendar.selectEmp")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("admin.calendar.selectEmp")}</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={`cal-${e.id}`} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {calEmpId !== "__none__" && (
                <Card className="flex-1 overflow-hidden p-0 border shadow-sm flex flex-col min-h-150">
                  <div className="p-4 sm:p-6 h-full flex flex-col">
                    <AdminEditableCalendarView 
                      employeeId={calEmpId} 
                      employeeName={employees.find((e) => e.id === calEmpId)?.name || ""} 
                    />
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* EDIT PHOTO REPORT DIALOG */}
          <Dialog open={!!editingReport} onOpenChange={(v) => !v && setEditingReport(null)}>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>{t("common.edit") || "Редактирование"}</DialogTitle>
              </DialogHeader>
              {editingReport && (
                <div className="flex flex-col gap-4 py-2">
                  {editingReport.thumb && (
                    <div className="rounded-xl overflow-hidden border border-border">
                      <img 
                        src={editingReport.thumb} 
                        alt="Preview" 
                        className="w-full max-h-64 object-contain bg-muted"
                      />
                    </div>
                  )}
                  <Textarea 
                    value={editingReport.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingReport({ ...editingReport, description: e.target.value })}
                    placeholder={t("chat.photo.descPlaceholder", { defaultValue: "Описание..." })}
                    className="min-h-16 resize-none"
                  />
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingReport(null)}>
                  {t("common.cancel", { defaultValue: "Отмена" })}
                </Button>
                <Button onClick={savePhotoReportEdit}>
                  {t("common.save", { defaultValue: "Сохранить" })}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>



          {/* CREATE USER DIALOG */}
          <Dialog open={createForm.open} onOpenChange={(v) => !v && setCreateForm((f) => ({ ...f, open: false }))}>
            <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("admin.users.create")}</DialogTitle>
                <DialogDescription>Новый профиль сотрудника</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t("auth.firstName") || "Имя"} (Default/EN)</Label>
                      <Input 
                        value={createForm.first_name} 
                        onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("auth.lastName") || "Фамилия"} (Default/EN)</Label>
                      <Input 
                        value={createForm.last_name} 
                        onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t("auth.firstName") || "Имя"} (RU)</Label>
                      <Input 
                        value={(createForm as any).first_name_translations?.ru || ""} 
                        onChange={(e) => setCreateForm({ ...createForm, first_name_translations: { ...(createForm as any).first_name_translations, ru: e.target.value } })} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("auth.lastName") || "Фамилия"} (RU)</Label>
                      <Input 
                        value={(createForm as any).last_name_translations?.ru || ""} 
                        onChange={(e) => setCreateForm({ ...createForm, last_name_translations: { ...(createForm as any).last_name_translations, ru: e.target.value } })} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t("auth.firstName") || "Имя"} (UK)</Label>
                      <Input 
                        value={(createForm as any).first_name_translations?.uk || ""} 
                        onChange={(e) => setCreateForm({ ...createForm, first_name_translations: { ...(createForm as any).first_name_translations, uk: e.target.value } })} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("auth.lastName") || "Фамилия"} (UK)</Label>
                      <Input 
                        value={(createForm as any).last_name_translations?.uk || ""} 
                        onChange={(e) => setCreateForm({ ...createForm, last_name_translations: { ...(createForm as any).last_name_translations, uk: e.target.value } })} 
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label>{t("auth.username") || "Имя пользователя"}</Label>
                  <Input 
                    value={createForm.username} 
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{t("auth.birthDate") || "Дата рождения"}</Label>
                  <Input 
                    type="date"
                    value={createForm.birth_date} 
                    onChange={(e) => setCreateForm({ ...createForm, birth_date: e.target.value })} 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={createForm.email} 
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Пароль</Label>
                  <Input 
                    type="text"
                    value={createForm.password} 
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Роль</Label>
                  <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v as AppRole })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">{t("admin.users.employee")}</SelectItem>
                      <SelectItem value="brigadier">Бригадир</SelectItem>
                      <SelectItem value="admin">Администратор</SelectItem>
                      {superMode && <SelectItem value="super_admin">Супер-админ</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateForm((f) => ({ ...f, open: false }))}>Отмена</Button>
                <Button onClick={submitCreateUser} disabled={userBusy}>
                  {userBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Сохранить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* EDIT PROFILE DIALOG */}
          <Dialog open={!!nameEdit?.open} onOpenChange={(v) => !v && setNameEdit(null)}>
            <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("admin.moderation.edit") || "Редактировать профиль"}</DialogTitle>
                <DialogDescription>{nameEdit?.user_name}</DialogDescription>
              </DialogHeader>
              {nameEdit && (
                <div className="flex flex-col gap-4 py-2">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>{t("auth.firstName") || "Имя"} (Default/EN)</Label>
                        <Input 
                          value={nameEdit.first_name} 
                          onChange={(e) => setNameEdit({ ...nameEdit, first_name: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("auth.lastName") || "Фамилия"} (Default/EN)</Label>
                        <Input 
                          value={nameEdit.last_name} 
                          onChange={(e) => setNameEdit({ ...nameEdit, last_name: e.target.value })} 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>{t("auth.firstName") || "Имя"} (RU)</Label>
                        <Input 
                          value={nameEdit.first_name_translations?.ru || ""} 
                          onChange={(e) => setNameEdit({ ...nameEdit, first_name_translations: { ...nameEdit.first_name_translations, ru: e.target.value } })} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("auth.lastName") || "Фамилия"} (RU)</Label>
                        <Input 
                          value={nameEdit.last_name_translations?.ru || ""} 
                          onChange={(e) => setNameEdit({ ...nameEdit, last_name_translations: { ...nameEdit.last_name_translations, ru: e.target.value } })} 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>{t("auth.firstName") || "Имя"} (UK)</Label>
                        <Input 
                          value={nameEdit.first_name_translations?.uk || ""} 
                          onChange={(e) => setNameEdit({ ...nameEdit, first_name_translations: { ...nameEdit.first_name_translations, uk: e.target.value } })} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("auth.lastName") || "Фамилия"} (UK)</Label>
                        <Input 
                          value={nameEdit.last_name_translations?.uk || ""} 
                          onChange={(e) => setNameEdit({ ...nameEdit, last_name_translations: { ...nameEdit.last_name_translations, uk: e.target.value } })} 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label>{t("auth.username") || "Имя пользователя"}</Label>
                    <Input 
                      value={nameEdit.username} 
                      onChange={(e) => setNameEdit({ ...nameEdit, username: e.target.value })} 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>{t("auth.birthDate") || "Дата рождения"}</Label>
                    <Input 
                      type="date"
                      value={nameEdit.birth_date} 
                      onChange={(e) => setNameEdit({ ...nameEdit, birth_date: e.target.value })} 
                    />
                  </div>

                  
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setNameEdit(null)}>Отмена</Button>
                <Button onClick={submitNameUpdate} disabled={userBusy}>
                  {userBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Сохранить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* EDIT CREDS DIALOG */}
          <Dialog open={!!credsEdit} onOpenChange={(v) => !v && setCredsEdit(null)}>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>{t("admin.users.credentials") || "Логин/Пароль"}</DialogTitle>
                <DialogDescription>{credsEdit?.user_name}</DialogDescription>
              </DialogHeader>
              {credsEdit && (
                <div className="flex flex-col gap-4 py-2">
                  <div className="space-y-1.5">
                    <Label>{t("auth.newEmail") || "Новый Email"}</Label>
                    <Input 
                      placeholder={t("auth.leaveBlank") || "Оставить пустым чтобы не менять"}
                      value={credsEdit.email} 
                      onChange={(e) => setCredsEdit({ ...credsEdit, email: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("auth.newPassword") || "Новый пароль"}</Label>
                    <Input 
                      placeholder={t("auth.leaveBlank") || "Оставить пустым чтобы не менять"}
                      type="text"
                      value={credsEdit.password} 
                      onChange={(e) => setCredsEdit({ ...credsEdit, password: e.target.value })} 
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setCredsEdit(null)}>{t("common.cancel") || "Отмена"}</Button>
                <Button onClick={submitCredsUpdate} disabled={userBusy}>
                  {userBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t("common.save") || "Сохранить"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </main>
      </div>

    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: 'primary' | 'success' | 'warning' | 'destructive';
  icon: React.ReactNode;
}) {
  const toneClass = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-[color:var(--success)]/15 text-[color:var(--success)]',
    warning: 'bg-[color:var(--warning)]/20 text-[color:var(--warning-foreground)]',
    destructive: 'bg-[color:var(--destructive)]/15 text-[color:var(--destructive)]',
  }[tone];

  return (
    <Card className="p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <span className={`h-10 w-10 rounded-xl grid place-items-center ${toneClass}`}>{icon}</span>
      </div>
      <p className="text-3xl font-bold leading-none">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}
