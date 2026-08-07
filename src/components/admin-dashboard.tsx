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
import { ShiftCalendarDialog } from "@/components/shift-calendar-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import dmagLogo from "@/assets/dmag-logo.png";
import { ROBOTO_BASE64 } from "@/lib/roboto-base64";
import {
  adminCreateUser,
  adminDeleteUser,
  adminSetRole,
  adminUpdateCredentials,
  adminToggleActive,
} from "@/lib/admin-users.functions";
import { getCurrentPosition, reverseGeocodeCity } from "@/lib/geocode";
import { useLanguage } from "@/lib/i18n";

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
  avatar_url?: string | null;
  role: AppRole;
  status: "working" | "lunch" | "finished" | "offline";
  since: string; // HH:MM (shift start)
  workedMs: number;
  lunchMs: number;
  siteName: string | null;
  lastShiftAt: string | null; // ISO
  is_active: boolean;
  updated_at?: string;
};

type SiteRow = {
  id: string;
  name: string;
  address: string | null;
  customer: string | null;
  comment: string | null;
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

function formatHM(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}ч ${m.toString().padStart(2, "0")}м`;
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

  const [activeTab, setActiveTab] = useState("dashboard");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reportsHasMore, setReportsHasMore] = useState(true);
  const [reportsLoadingMore, setReportsLoadingMore] = useState(false);

  // Pagination states
  const [personnelPage, setPersonnelPage] = useState(0);
  const [sitesPage, setSitesPage] = useState(0);
  const [adminPage, setAdminPage] = useState(0);
  const PAGE_SIZE = 10;

  // Filter states
  const [personnelSearch, setPersonnelSearch] = useState("");
  const [personnelRole, setPersonnelRole] = useState("all");
  const [personnelStatus, setPersonnelStatus] = useState("all");

  const [sitesSearch, setSitesSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");

  const [reportsSearch, setReportsSearch] = useState<string>("");
  const [reportsSite, setReportsSite] = useState("all");
  const [reportsCrit, setReportsCrit] = useState("all");
  const [reportsPeriod, setReportsPeriod] = useState("all");

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
  }, [reportsSearch, reportsSite, reportsCrit, reportsPeriod, reports.length]);

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
  const [shiftHistory, setShiftHistory] = useState<ShiftDetail[]>([]);
  const [calendarFor, setCalendarFor] = useState<EmployeeRow | null>(null);

  const [calCursor, setCalCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [calEmpId, setCalEmpId] = useState<string>("__none__");
  const [calShifts, setCalShifts] = useState<ShiftDetail[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calRefresh, setCalRefresh] = useState(0);

  useEffect(() => {
    if (activeTab !== "calendar" || calEmpId === "__none__") return;
    async function loadCal() {
      if (calShifts.length === 0) setCalLoading(true);
      const start = new Date(calCursor.getFullYear(), calCursor.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 0, 23, 59, 59, 999);
      const { data } = await supabase
        .from("shifts")
        .select(
          "id, site_id, site_name, status, started_at, ended_at, lunch_total_ms, lunch_intervals, start_city, end_city, user_id",
        )
        .eq("user_id", calEmpId)
        .gte("started_at", start.toISOString())
        .lte("started_at", end.toISOString())
        .order("started_at", { ascending: true });
      setCalShifts((data as any) || []);
      setCalLoading(false);
    }
    loadCal();
  }, [activeTab, calEmpId, calCursor, calRefresh]);

  const calWEEKDAYS = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang, { weekday: "short" });
    const days = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(2024, 0, i);
      const str = fmt.format(d).replace(/\./g, "");
      days.push(str.charAt(0).toUpperCase() + str.slice(1));
    }
    return days;
  }, [lang]);

  const calMonthName = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang, { month: "long" });
    const str = fmt.format(calCursor);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, [lang, calCursor]);

  const calRowsByDate = useMemo(() => {
    const map = new Map<string, ReturnType<typeof toExportRows>>();
    const exported = toExportRows(calShifts);
    exported.forEach((r) => {
      const arr = map.get(r.date) ?? [];
      arr.push(r);
      map.set(r.date, arr);
    });
    return map;
  }, [calShifts]);

  const calGrid = useMemo(() => {
    const firstDay = new Date(calCursor);
    const jsDay = firstDay.getDay();
    const offset = (jsDay + 6) % 7;
    const daysInMonth = new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 0).getDate();
    const cells: Array<{ day: number | null; key: string }> = [];
    for (let i = 0; i < offset; i++) cells.push({ day: null, key: `e${i}` });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, key: `d${d}` });
    while (cells.length % 7 !== 0) cells.push({ day: null, key: `t${cells.length}` });
    return cells;
  }, [calCursor]);

  const [shiftEditList, setShiftEditList] = useState<ShiftDetail[]>([]);
  const [shiftEditIndex, setShiftEditIndex] = useState(0);

  function loadShiftIntoEdit(shift: ShiftDetail, emp: EmployeeRow) {
    setShiftEdit({
      id: shift.id,
      user_id: emp.id,
      user_name: emp.name,
      site_id: (shift as any).site_id ?? null,
      site_name: shift.site_name ?? null,
      started_at: toLocalInput(shift.started_at) || "",
      ended_at: toLocalInput(shift.ended_at) || "",
      lunch_minutes: shift.lunch_total_ms ? Math.round(Number(shift.lunch_total_ms) / 60000) : 0,
      start_city: (shift as any).start_city ?? "",
      end_city: (shift as any).end_city ?? "",
    });
  }

  function onCalDayClick(day: number) {
    const dateKey = `${String(day).padStart(2, "0")}.${String(calCursor.getMonth() + 1).padStart(2, "0")}.${calCursor.getFullYear()}`;
    const entries = calRowsByDate.get(dateKey);
    const emp = employees.find((e) => e.id === calEmpId);
    if (!emp) return;

    if (entries && entries.length > 0) {
      const shifts = calShifts.filter((s) => {
        const d = new Date(s.started_at);
        return d.getDate() === day;
      });
      if (shifts.length > 0) {
        setShiftEditList(shifts);
        setShiftEditIndex(0);
        loadShiftIntoEdit(shifts[0], emp);
      }
    } else {
      setShiftEditList([]);
      setShiftEditIndex(0);
      const d = new Date(calCursor.getFullYear(), calCursor.getMonth(), day, 8, 0, 0);
      const d2 = new Date(calCursor.getFullYear(), calCursor.getMonth(), day, 17, 0, 0);
      setShiftEdit({
        user_id: emp.id,
        user_name: emp.name,
        site_id: null,
        site_name: null,
        started_at: toLocalInput(d.toISOString()) || "",
        ended_at: toLocalInput(d2.toISOString()) || "",
        lunch_minutes: 0,
        start_city: "",
        end_city: "",
      });
    }
  }

  const name = user?.user_metadata?.full_name || user?.email || "Администратор";

  async function signOut() {
    window.sessionStorage.removeItem("dmag_dev_admin");
    window.sessionStorage.removeItem("dmag_super_admin");
    if (devMode) {
      navigate({ to: "/auth" });
      return;
    }
    await supabase.auth.signOut();
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
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, is_active, avatar_url, updated_at"),
      supabase.from("user_roles").select("user_id, role"),
      supabase
        .from("sites")
        .select("id, name, address, customer, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("photo_reports")
        .select("id, description, criticality, photo_url, created_at, site_id, author_id")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("shifts")
        .select(
          "id, user_id, site_name, status, started_at, ended_at, lunch_started_at, lunch_total_ms, start_city, end_city",
        )
        .gte("started_at", sinceMidnight.toISOString())
        .order("started_at", { ascending: false }),
    ]);

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
        },
      ];
    }

    let siteRows: SiteRow[] = (siteData ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      customer: s.customer,
      comment: (s as any).comment ?? null,
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
    let repRows: ReportRow[] = reportsRaw.map((r) => ({
      id: r.id,
      description: r.description,
      criticality: r.criticality as Crit,
      created_at: r.created_at,
      site_name: siteNameMap.get(r.site_id) ?? "—",
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
    const hasFilters =
      f.search !== "" || f.site !== "all" || f.crit !== "all" || f.period !== "all";
    if (!hasFilters && !f.paginated) {
      setReports(repRows);
    }

    // Full shift history (last 30 days) for exports and calendar view
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);
    since30.setHours(0, 0, 0, 0);
    const { data: histData } = await supabase
      .from("shifts")
      .select(
        "id, user_id, site_name, status, started_at, ended_at, lunch_total_ms, lunch_intervals, lunch_started_at, start_city, end_city",
      )
      .gte("started_at", since30.toISOString())
      .order("started_at", { ascending: false });
    const nameById = new Map(emps.map((e) => [e.id, e.name]));
    const history: ShiftDetail[] = (histData ?? []).map((s: any) => ({
      id: s.id,
      user_id: s.user_id,
      user_name: nameById.get(s.user_id) ?? "—",
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
    setShiftHistory(history);

    setLoading(false);
  }

  async function deletePhotoReport(id: string, photo_url: string | null) {
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

      if (reportsSite !== "all") query = query.eq("site_id", reportsSite);
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

        const newRepRows = data.map((r: any) => ({
          id: r.id,
          description: r.description,
          criticality: r.criticality,
          created_at: r.created_at,
          site_name: siteNameMap.get(r.site_id) ?? "—",
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
  }, []);

  const stats = useMemo(() => {
    const workers = employees.filter((e) => e.role === "employee" || e.role === "brigadier");
    return {
      working: workers.filter((e) => e.status === "working").length,
      lunch: workers.filter((e) => e.status === "lunch").length,
      sites: sites.length,
      urgent: reports.filter((r) => r.criticality === "urgent").length,
    };
  }, [employees, sites, reports]);

  // ===== Shift editor (admin + super_admin) =====
  type ShiftEdit = {
    id?: string;
    user_id: string;
    user_name: string;
    site_id: string | null;
    site_name: string | null;
    started_at: string; // local datetime-local value
    ended_at: string;
    lunch_minutes: number;
    start_city: string;
    end_city: string;
  };
  const [shiftEdit, setShiftEdit] = useState<ShiftEdit | null>(null);
  const [shiftSaving, setShiftSaving] = useState(false);

  function toLocalInput(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function fromLocalInput(v: string): string | null {
    if (!v) return null;
    return new Date(v).toISOString();
  }

  async function openEditShift(emp: EmployeeRow) {
    // Load latest shift for this user
    const { data } = await supabase
      .from("shifts")
      .select("id, site_id, site_name, started_at, ended_at, lunch_total_ms, start_city, end_city")
      .eq("user_id", emp.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setShiftEdit({
      id: data?.id,
      user_id: emp.id,
      user_name: emp.name,
      site_id: data?.site_id ?? null,
      site_name: data?.site_name ?? null,
      started_at: toLocalInput(data?.started_at ?? null) || toLocalInput(new Date().toISOString()),
      ended_at: toLocalInput(data?.ended_at ?? null),
      lunch_minutes: data?.lunch_total_ms ? Math.round(Number(data.lunch_total_ms) / 60000) : 0,
      start_city: (data as any)?.start_city ?? "",
      end_city: (data as any)?.end_city ?? "",
    });
  }

  function openAddShift() {
    setShiftEdit({
      user_id: "",
      user_name: "",
      site_id: null,
      site_name: null,
      started_at: toLocalInput(new Date().toISOString()),
      ended_at: "",
      lunch_minutes: 0,
      start_city: "",
      end_city: "",
    });
  }

  async function saveShift() {
    if (!shiftEdit) return;
    if (!shiftEdit.user_id) {
      toast.error("Выберите сотрудника");
      return;
    }
    const started = fromLocalInput(shiftEdit.started_at);
    if (!started) {
      toast.error("Укажите время начала");
      return;
    }
    const ended = fromLocalInput(shiftEdit.ended_at);
    const lunch_total_ms = Math.max(0, shiftEdit.lunch_minutes) * 60_000;
    const status = ended ? "finished" : "working";
    setShiftSaving(true);
    let err: { message: string } | null = null;
    if (shiftEdit.id) {
      const { error } = await supabase
        .from("shifts")
        .update({
          started_at: started,
          ended_at: ended,
          lunch_total_ms,
          status,
          site_id: shiftEdit.site_id,
          site_name: shiftEdit.site_name,
          start_city: shiftEdit.start_city.trim() || null,
          end_city: shiftEdit.end_city.trim() || null,
        })
        .eq("id", shiftEdit.id);
      err = error as any;
    } else {
      const { error } = await supabase.from("shifts").insert({
        user_id: shiftEdit.user_id,
        started_at: started,
        ended_at: ended,
        lunch_total_ms,
        status,
        site_id: shiftEdit.site_id,
        site_name: shiftEdit.site_name,
        start_city: shiftEdit.start_city.trim() || null,
        end_city: shiftEdit.end_city.trim() || null,
      });
      err = error as any;
    }
    setShiftSaving(false);
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success("Смена сохранена");
    setShiftEdit(null);
    loadAll();
  }

  async function deleteShift() {
    if (!shiftEdit?.id) return;
    if (!confirm("Удалить эту смену?")) return;
    const { error } = await supabase.from("shifts").delete().eq("id", shiftEdit.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Смена удалена");
    setShiftEdit(null);
    loadAll();
  }

  // ===== Site editor (admin + super_admin) =====
  type SiteEdit = {
    id?: string;
    name: string;
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
    setSiteEdit({ name: "", address: "", customer: "" });
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
          address: siteEdit.address.trim() || null,
          customer: siteEdit.customer.trim() || null,
        })
        .eq("id", siteEdit.id);
      err = error as any;
    } else {
      const { error } = await supabase.from("sites").insert({
        name: siteEdit.name.trim(),
        address: siteEdit.address.trim() || null,
        customer: siteEdit.customer.trim() || null,
        created_by: user?.id ?? null,
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
    if (!confirm(`Удалить объект «${name}»?`)) return;
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

  // Mocks vs Real Data

  const [createForm, setCreateForm] = useState<{
    open: boolean;
    email: string;
    password: string;
    full_name: string;
    role: AppRole;
  }>({ open: false, email: "", password: "", full_name: "", role: "employee" });
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
          full_name: createForm.full_name.trim(),
          role: createForm.role,
        },
      });
      toast.success(`Пользователь ${createForm.email} создан`);
      setCreateForm({ open: false, email: "", password: "", full_name: "", role: "employee" });
      loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось создать");
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
    const filename = `dmag-reports-${new Date().toISOString().slice(0, 10)}`;
    const rows = reports.map((r) => ({
      ID: r.id,
      Дата: new Date(r.created_at).toLocaleString("ru-RU"),
      Объект: r.site_name,
      Критичность: t(CRIT_META[r.criticality].labelKey),
      Описание: r.description ?? "",
    }));

    if (rows.length === 0) {
      toast.info("Нет данных для экспорта");
      return;
    }

    if (fmt === "xlsx") {
      const XLSX = await import("xlsx");
      const headers = Object.keys(rows[0]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows.map((r) => Object.values(r))]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Отчёты");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      triggerDownload(blob, `${filename}.xlsx`);
    } else if (fmt === "pdf") {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      
      doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_BASE64);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      doc.setFont("Roboto");

      const headers = Object.keys(rows[0]);
      doc.setFontSize(14);
      doc.text("Отчёты", 40, 40);
      doc.setFontSize(9);
      doc.text(`Сформировано: ${new Date().toLocaleString()}`, 40, 58);
      autoTable(doc, { 
        head: [headers], 
        body: rows.map((r) => Object.values(r)), 
        startY: 74,
        styles: { font: "Roboto", fontStyle: "normal", fontSize: 9, cellPadding: 6, textColor: [50, 50, 50] },
        headStyles: { 
          fontStyle: "normal", 
          fillColor: [13, 71, 161], 
          textColor: [255, 255, 255], 
          fontSize: 10,
          halign: "left"
        },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });
      const blob = doc.output("blob");
      triggerDownload(blob, `${filename}.pdf`);
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
    else exportShiftsPdf(rows, `${base}.pdf`, "Отчёт по сменам (30 дней)");
  }

  const filteredPersonnel = useMemo(() => {
    return employees.filter((e) => {
      if (personnelSearch && !e.name.toLowerCase().includes(personnelSearch.toLowerCase()))
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
      return e.name.toLowerCase().includes(adminSearch.toLowerCase());
    });
  }, [employees, adminSearch]);

  const activities = useMemo(() => {
    const list: any[] = [];
    shiftHistory.slice(0, 50).forEach((s) => {
      const emp = employees.find((e) => e.id === s.user_id) || { name: "Неизвестный сотрудник" };
      list.push({
        id: `shift-start-${s.id}`,
        ts: s.started_at,
        type: "shift_start",
        title: "Начало смены",
        desc: `${emp.name} начал смену на объекте ${s.site_name || s.start_city || "Неизвестно"}`,
        icon: <Users className="h-4 w-4" />,
        color: "text-green-600 bg-green-500/10",
      });
      if (s.ended_at) {
        list.push({
          id: `shift-end-${s.id}`,
          ts: s.ended_at,
          type: "shift_end",
          title: "Окончание смены",
          desc: `${emp.name} завершил смену на объекте ${s.site_name || s.end_city || "Неизвестно"}`,
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
              title: "Уход на перерыв",
              desc: `${emp.name} ушел на перерыв`,
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
                title: "Возврат с перерыва",
                desc: `${emp.name} вернулся к работе`,
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
          title: "Уход на перерыв",
          desc: `${emp.name} ушел на перерыв`,
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
        title: "Новый фотоотчёт",
        desc: r.description || "Без описания",
        icon: <Camera className="h-4 w-4" />,
        color: "text-orange-600 bg-orange-500/10",
      });
    });
    return list.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 20);
  }, [shiftHistory, reports, employees]);

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
          <img src={dmagLogo} alt="DMAG" className="h-10 w-10 rounded-xl object-cover shadow" />
          <div>
            <p className="font-bold leading-tight">DMAG</p>
            <p className="text-xs opacity-75">Admin Console</p>
          </div>
        </div>
        <nav className="px-3 py-4 flex-1 space-y-1">
          {[
            { id: "dashboard", icon: Activity, label: t("admin.tab.dashboard"), super: false },
            { id: "calendar", icon: CalendarDays, label: t("admin.tab.calendar"), super: false },
            { id: "personnel", icon: Users, label: t("admin.tab.personnel"), super: false },
            { id: "sites", icon: Building2, label: t("admin.tab.sites"), super: false },
            { id: "reports", icon: Camera, label: t("admin.tab.reports"), super: false },
            { id: "security", icon: ShieldCheck, label: t("admin.tab.security"), super: true },
            { id: "admin-management", icon: Users, label: t("admin.tab.users"), super: false },
            { id: "chat", icon: MessageSquare, label: "Чат", super: false },
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
                {activeTab === "security" && <span>{t("admin.tab.security")}</span>}
                {activeTab === "admin-management" && <span>{t("admin.tab.users")}</span>}
                {activeTab === "chat" && <span>Чат</span>}
              </h1>
              <p className="hidden md:block text-[10px] md:text-xs text-muted-foreground truncate">
                {t(roleLabel[role])} · {tName(name)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/employee-dashboard" })}
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
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Загружаем данные…
                </div>
              ) : activities.length === 0 ? (
                <div className="flex-1 mt-6 flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl border-muted bg-card/30">
                  <div className="h-20 w-20 bg-muted/60 rounded-full flex items-center justify-center mb-5">
                    <FolderSearch className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    Активности пока нет
                  </h4>
                  <p className="text-sm text-muted-foreground max-w-sm mb-6">
                    События, новые смены и инциденты будут появляться здесь в реальном времени.
                  </p>
                </div>
              ) : (
                <div className="mt-6 bg-card rounded-2xl p-6 border shadow-sm">
                  <h3 className="font-semibold mb-4 text-lg">Последняя активность</h3>
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
                          {new Date(act.ts).toLocaleString("ru-RU", {
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
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card className="p-6 rounded-2xl xl:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{t("admin.personnel.title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("admin.personnel.desc")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openAddShift}
                      className="rounded-xl"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      {t("admin.personnel.addShift")}
                    </Button>
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
                    placeholder="Поиск по имени..."
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
                      <SelectValue placeholder="Роль" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Все роли</SelectItem>
                      <SelectItem value="employee">Сотрудник</SelectItem>
                      <SelectItem value="brigadier">Бригадир</SelectItem>
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
                      <SelectValue placeholder="Статус" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Все статусы</SelectItem>
                      <SelectItem value="working">На смене</SelectItem>
                      <SelectItem value="lunch">На паузе</SelectItem>
                      <SelectItem value="finished">Смена завершена</SelectItem>
                      <SelectItem value="offline">Офлайн</SelectItem>
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
                            <TableHead className="text-right">
                              {t("admin.personnel.colActions")}
                            </TableHead>
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
                                          {e.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>{tName(e.name)}</span>
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
                                    {formatHM(e.workedMs)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                                    {formatHM(e.lunchMs)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="rounded-lg"
                                        onClick={() => setCalendarFor(e)}
                                        title={t("admin.personnel.calTooltip")}
                                      >
                                        <CalendarDays className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="rounded-lg"
                                        onClick={() => openEditShift(e)}
                                        title={t("admin.personnel.editTooltip")}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
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
                                  <h4 className="font-semibold">{tName(e.name)}</h4>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {t(roleLabel[e.role])}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-lg"
                                    onClick={() => setCalendarFor(e)}
                                  >
                                    <CalendarDays className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-lg"
                                    onClick={() => openEditShift(e)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
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
                                  <p className="font-medium">{formatHM(e.workedMs)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-[10px] mb-0.5">
                                    {t("admin.personnel.colPause")}
                                  </p>
                                  <p className="font-medium">{formatHM(e.lunchMs)}</p>
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

              <Card className="p-6 rounded-2xl">
                <h3 className="font-semibold mb-1">{t("admin.personnel.distTitle")}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("admin.personnel.distDesc")}
                </p>
                <div className="space-y-3">
                  {(Object.keys(EMP_STATUS) as EmpStatus[]).map((k) => {
                    const count = employees.filter((e) => e.status === k).length;
                    const total = Math.max(employees.length, 1);
                    const pct = Math.round((count / total) * 100);
                    const st = EMP_STATUS[k];
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{t(st.labelKey)}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {count} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: st.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                    placeholder="Поиск объекта..."
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
                            <TableHead className="text-right">Сотрудников</TableHead>
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
                                  <TableCell className="font-medium">{s.name}</TableCell>
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
                                    {new Date(s.created_at).toLocaleDateString("ru-RU")}
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
                                  <h4 className="font-semibold text-base">{s.name}</h4>
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
                                    <span className="line-clamp-2">{s.address}</span>
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
                                <span className="text-xs text-muted-foreground">Сотрудников:</span>
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
                        <Label>{t("admin.sites.dlgName")}</Label>
                        <Input
                          value={siteEdit.name}
                          onChange={(e) => setSiteEdit({ ...siteEdit, name: e.target.value })}
                          placeholder={t("admin.sites.dlgNamePl")}
                        />
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
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card className="p-6 rounded-2xl xl:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{t("admin.reports.title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("admin.reports.desc")}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="rounded-xl">
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        {t("admin.header.export")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 rounded-xl">
                      <DropdownMenuItem
                        onSelect={() => exportReports("xlsx")}
                        className="rounded-lg cursor-pointer"
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => exportReports("pdf")}
                        className="rounded-lg cursor-pointer"
                      >
                        <FileBarChart className="h-4 w-4 mr-2" />
                        PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-col flex-wrap sm:flex-row gap-3 mb-6">
                  <Input
                    placeholder="Поиск по описанию..."
                    value={reportsSearch}
                    onChange={(e) => setReportsSearch(e.target.value)}
                    className="w-full sm:w-50 rounded-xl bg-background"
                  />
                  <Select value={reportsSite} onValueChange={setReportsSite}>
                    <SelectTrigger className="w-full sm:w-40 rounded-xl bg-background">
                      <SelectValue placeholder="Объект" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-64">
                      <SelectItem value="all">Все объекты</SelectItem>
                      {sites.map((s) => (
                        <SelectItem key={`rs-${s.id}`} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={reportsPeriod} onValueChange={setReportsPeriod}>
                    <SelectTrigger className="w-full sm:w-40 rounded-xl bg-background">
                      <SelectValue placeholder="Период" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">За всё время</SelectItem>
                      <SelectItem value="today">За сегодня</SelectItem>
                      <SelectItem value="week">За 7 дней</SelectItem>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {reports.map((r) => {
                        return (
                          <div
                            key={r.id}
                            className="flex gap-3 rounded-2xl border bg-card p-3 relative group"
                          >
                            <div className="h-20 w-20 rounded-xl bg-muted overflow-hidden grid place-items-center shrink-0">
                              {r.thumb ? (
                                <img src={r.thumb} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Camera className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {r.site_name}
                                </span>
                              </div>
                              <p className="text-xs line-clamp-2">
                                {r.description || t("admin.reports.noDesc")}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {new Date(r.created_at).toLocaleString("ru-RU", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deletePhotoReport(r.id, r.photo_url)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                          Загрузить ещё
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </Card>
            </section>
          )}

          {/* SECURITY TAB */}
          {activeTab === "security" && superMode && (
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card className="p-6 rounded-2xl xl:col-span-2">
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
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>В сети
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
                                    <span className="w-1 h-1 rounded-full bg-green-500"></span>В
                                    сети
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
                  onClick={() => setCreateForm((f) => ({ ...f, open: true }))}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t("admin.users.create")}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Input
                  placeholder="Поиск пользователя..."
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
                        <TableHead>Статус</TableHead>
                        <TableHead>Последний вход</TableHead>
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
                            ? "В сети"
                            : e.updated_at
                              ? new Date(e.updated_at).toLocaleString("ru-RU", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Нет данных";
                          return (
                            <TableRow key={`mgr-${e.id}`}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={e.avatar_url || ""} />
                                    <AvatarFallback>
                                      {e.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{tName(e.name)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {e.is_active ? (
                                  <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
                                    Активен
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20"
                                  >
                                    Модерация
                                  </Badge>
                                )}
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
                                    Одобрить
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
                                  {e.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-semibold text-base truncate">
                                  {tName(e.name)}
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
                              {e.is_active ? "Активен" : "Отключен"}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <span className="font-medium">Последний вход:</span>
                            <span>
                              {onlineUsers.includes(e.id)
                                ? "В сети"
                                : e.updated_at
                                  ? new Date(e.updated_at).toLocaleString("ru-RU", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Нет данных"}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-2 pt-3 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 rounded-lg"
                              disabled={
                                userBusy ||
                                e.id === user?.id ||
                                (!superMode && (e.role === "super_admin" || e.role === "admin"))
                              }
                              onClick={async () => {
                                setUserBusy(true);
                                try {
                                  await changeRole(e, e.role === "admin" ? "super_admin" : "admin");
                                } finally {
                                  setUserBusy(false);
                                }
                              }}
                            >
                              {e.role === "admin" ? "Сделать Супер" : "Сделать Админ"}
                            </Button>
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
                                Включить
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

          {/* CALENDAR TAB */}
          {activeTab === "calendar" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">{t("admin.tab.calendar")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Просмотр и редактирование смен сотрудников
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={calEmpId} onValueChange={setCalEmpId}>
                    <SelectTrigger className="w-full sm:w-62.5 bg-background">
                      <SelectValue placeholder="Выберите сотрудника" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Выберите сотрудника --</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={`cal-${e.id}`} value={e.id}>
                          {tName(e.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {calEmpId !== "__none__" && (
                <Card className="p-6 rounded-2xl shadow-sm border border-primary/10">
                  <div className="flex items-center justify-between mb-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCalCursor(new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1))
                      }
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Пред.
                    </Button>
                    <div className="text-lg font-semibold">
                      {calMonthName} {calCursor.getFullYear()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCalCursor(new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1))
                      }
                    >
                      След. <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>

                  {calLoading ? (
                    <div className="py-20 flex items-center justify-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Загрузка...
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-7 gap-2 text-sm font-semibold text-muted-foreground text-center mb-2">
                        {calWEEKDAYS.map((w) => (
                          <div key={w} className="py-2">
                            {w}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {calGrid.map((c) => {
                          const dateKey = c.day
                            ? `${String(c.day).padStart(2, "0")}.${String(calCursor.getMonth() + 1).padStart(2, "0")}.${calCursor.getFullYear()}`
                            : "";
                          const entries = c.day ? calRowsByDate.get(dateKey) : undefined;

                          return (
                            <div
                              key={c.key}
                              onClick={() => (c.day ? onCalDayClick(c.day) : undefined)}
                              className={`aspect-square md:aspect-auto md:min-h-25 rounded-xl p-1 md:p-2 text-sm border transition-all ${
                                c.day
                                  ? entries
                                    ? "bg-primary/5 border-primary/30 cursor-pointer hover:bg-primary/10 hover:shadow-sm"
                                    : "bg-muted/30 border-transparent cursor-pointer hover:bg-muted/50 hover:border-primary/20"
                                  : "border-transparent opacity-50"
                              }`}
                            >
                              {c.day && (
                                <div className="flex flex-col h-full">
                                  <div className="font-semibold text-muted-foreground">{c.day}</div>
                                  {entries && (
                                    <div className="mt-auto space-y-0.5">
                                      {entries.slice(0, 2).map((e, idx) => (
                                        <div
                                          key={idx}
                                          className="tabular-nums text-[10px] text-primary truncate"
                                          title={`${e.site} - ${e.workedHM}`}
                                        >
                                          {e.workStart}–{e.workEnd}
                                        </div>
                                      ))}
                                      {entries.length > 2 && (
                                        <div className="text-[10px] text-muted-foreground">
                                          +{entries.length - 2}
                                        </div>
                                      )}
                                      <div className="text-[10px] font-semibold text-foreground mt-1">
                                        {(() => {
                                          const totalMin = entries.reduce((acc, e) => {
                                            const [h, mRaw] = e.workedHM
                                              .replace("ч", "")
                                              .replace("м", "")
                                              .split(" ");
                                            return (
                                              acc +
                                              (parseInt(h || "0") * 60 + parseInt(mRaw || "0"))
                                            );
                                          }, 0);
                                          return `${Math.floor(totalMin / 60)}ч ${String(totalMin % 60).padStart(2, "0")}м`;
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                  {!entries && (
                                    <div className="mt-auto text-[10px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity text-center">
                                      + Смена
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </Card>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ===== Shift editor dialog ===== */}
      <Dialog open={!!shiftEdit} onOpenChange={(o) => !o && setShiftEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{shiftEdit?.id ? "Редактировать смену" : "Добавить смену"}</DialogTitle>
              {shiftEditList.length > 1 && (
                <div className="flex items-center space-x-2 mr-6 text-sm">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      const n =
                        shiftEditIndex - 1 < 0 ? shiftEditList.length - 1 : shiftEditIndex - 1;
                      setShiftEditIndex(n);
                      loadShiftIntoEdit(
                        shiftEditList[n],
                        employees.find((e) => e.id === calEmpId)!,
                      );
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-muted-foreground">
                    {shiftEditIndex + 1} / {shiftEditList.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      const n = (shiftEditIndex + 1) % shiftEditList.length;
                      setShiftEditIndex(n);
                      loadShiftIntoEdit(
                        shiftEditList[n],
                        employees.find((e) => e.id === calEmpId)!,
                      );
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <DialogDescription>
              {shiftEdit?.user_name
                ? `Сотрудник: ${tName(shiftEdit.user_name || "")}`
                : "Выберите сотрудника и заполните время"}
            </DialogDescription>
          </DialogHeader>
          {shiftEdit && (
            <div className="space-y-3">
              {!shiftEdit.id && (
                <div>
                  <Label>Сотрудник</Label>
                  <Select
                    value={shiftEdit.user_id}
                    onValueChange={(v) => {
                      const emp = employees.find((x) => x.id === v);
                      setShiftEdit({
                        ...shiftEdit,
                        user_id: v,
                        user_name: emp?.name ?? "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите…" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {tName(emp.name)} · {t(roleLabel[emp.role])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Объект</Label>
                <Select
                  value={shiftEdit.site_id ?? "__none__"}
                  onValueChange={(v) => {
                    if (v === "__none__")
                      setShiftEdit({ ...shiftEdit, site_id: null, site_name: null });
                    else {
                      const s = sites.find((x) => x.id === v);
                      setShiftEdit({ ...shiftEdit, site_id: v, site_name: s?.name ?? null });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Без объекта —</SelectItem>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Начало</Label>
                  <Input
                    type="datetime-local"
                    value={shiftEdit.started_at}
                    onChange={(ev) => setShiftEdit({ ...shiftEdit, started_at: ev.target.value })}
                  />
                </div>
                <div>
                  <Label>Конец</Label>
                  <Input
                    type="datetime-local"
                    value={shiftEdit.ended_at}
                    onChange={(ev) => setShiftEdit({ ...shiftEdit, ended_at: ev.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Пауза (минут)</Label>
                <Input
                  type="number"
                  min={0}
                  value={shiftEdit.lunch_minutes}
                  onChange={(ev) =>
                    setShiftEdit({ ...shiftEdit, lunch_minutes: Number(ev.target.value) || 0 })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>GPS город (старт)</Label>
                  <Input
                    value={shiftEdit.start_city}
                    onChange={(ev) => setShiftEdit({ ...shiftEdit, start_city: ev.target.value })}
                    placeholder="Köln"
                  />
                </div>
                <div>
                  <Label>GPS город (конец)</Label>
                  <Input
                    value={shiftEdit.end_city}
                    onChange={(ev) => setShiftEdit({ ...shiftEdit, end_city: ev.target.value })}
                    placeholder="Köln"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            {shiftEdit?.id && (
              <Button variant="destructive" onClick={deleteShift} disabled={shiftSaving}>
                <Trash2 className="h-4 w-4 mr-1" />
                Удалить
              </Button>
            )}
            <Button variant="outline" onClick={() => setShiftEdit(null)} disabled={shiftSaving}>
              Отмена
            </Button>
            <Button onClick={saveShift} disabled={shiftSaving}>
              {shiftSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Create user dialog ===== */}

      <Dialog
        open={createForm.open}
        onOpenChange={(o) => setCreateForm((f) => ({ ...f, open: o }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.users.createTitle")}</DialogTitle>
            <DialogDescription>{t("admin.users.createDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("admin.users.fullName")}</Label>
              <Input
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("admin.users.email")}</Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("admin.users.password")}</Label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("admin.users.role")}</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) => setCreateForm({ ...createForm, role: v as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">{t(roleLabel.employee)}</SelectItem>
                  <SelectItem value="brigadier">{t(roleLabel.brigadier)}</SelectItem>
                  {superMode && <SelectItem value="admin">{t(roleLabel.admin)}</SelectItem>}
                  {superMode && (
                    <SelectItem value="super_admin">{t(roleLabel.super_admin)}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateForm({ ...createForm, open: false })}
              disabled={userBusy}
            >
              {t("admin.users.cancel")}
            </Button>
            <Button onClick={submitCreateUser} disabled={userBusy}>
              {userBusy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t("admin.users.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Credentials editor ===== */}
      <Dialog open={!!credsEdit} onOpenChange={(o) => !o && setCredsEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.users.credsTitle")}</DialogTitle>
            <DialogDescription>{credsEdit ? tName(credsEdit.user_name) : ""}</DialogDescription>
          </DialogHeader>
          {credsEdit && (
            <div className="space-y-3">
              <div>
                <Label>{t("admin.users.newEmail")}</Label>
                <Input
                  type="email"
                  value={credsEdit.email}
                  onChange={(e) => setCredsEdit({ ...credsEdit, email: e.target.value })}
                  placeholder={t("admin.users.leaveEmpty")}
                />
              </div>
              <div>
                <Label>{t("admin.users.newPassword")}</Label>
                <Input
                  type="password"
                  value={credsEdit.password}
                  onChange={(e) => setCredsEdit({ ...credsEdit, password: e.target.value })}
                  placeholder={t("admin.users.leaveEmpty")}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredsEdit(null)} disabled={userBusy}>
              {t("admin.users.cancel")}
            </Button>
            <Button onClick={submitCredsUpdate} disabled={userBusy}>
              {userBusy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t("admin.users.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShiftCalendarDialog
        open={!!calendarFor}
        onClose={() => setCalendarFor(null)}
        employeeName={calendarFor ? tName(calendarFor.name) : ""}
        shifts={calendarFor ? shiftHistory.filter((s) => s.user_id === calendarFor.id) : []}
      />
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
  tone: "primary" | "success" | "warning" | "destructive";
  icon: React.ReactNode;
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-[color:var(--success)]/15 text-[color:var(--success)]",
    warning: "bg-[color:var(--warning)]/20 text-[color:var(--warning-foreground)]",
    destructive: "bg-[color:var(--destructive)]/15 text-[color:var(--destructive)]",
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
