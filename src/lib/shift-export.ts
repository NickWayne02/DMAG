import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { ROBOTO_BASE64 } from "@/lib/roboto-base64";
import { langToLocale, type LangCode } from "@/lib/i18n";

// Export helpers for shift monitoring: CSV / Excel / PDF
// Detailed rows: employee, site, date, start work, start pause, end pause, end work.

export type ShiftDetail = {
  id: string;
  user_id: string;
  user_name: string;
  site_name: string | null;
  started_at: string; // ISO
  ended_at: string | null; // ISO
  lunch_started_at: string | null; // ISO
  start_city: string | null;
  end_city: string | null;
  lunch_intervals: Array<{ start: number; end: number | null }>;
  lunch_total_ms: number;
  status: string;
};

export type ExportRow = {
  date: string;
  employee: string;
  site: string;
  workStart: string;
  pauseStart: string;
  pauseEnd: string;
  workEnd: string;
  pauseMin: number;
  workedHM: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}
function fmtTime(v: string | number | null) {
  if (v == null) return "";
  const d = typeof v === "number" ? new Date(v) : new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtHM(ms: number) {
  const t = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(t / 60)}ч ${pad(t % 60)}м`;
}

export function toExportRows(shifts: ShiftDetail[]): ExportRow[] {
  return shifts.map((s) => {
    const startedMs = new Date(s.started_at).getTime();
    const endedMs = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
    const lunchMs = Math.max(0, Number(s.lunch_total_ms || 0));
    const workedMs = Math.max(0, endedMs - startedMs - lunchMs);
    const intervals = Array.isArray(s.lunch_intervals) ? s.lunch_intervals : [];
    const firstPauseStart = intervals[0]?.start ?? null;
    const lastPauseEnd = intervals.length ? (intervals[intervals.length - 1].end ?? null) : null;
    return {
      date: fmtDate(s.started_at),
      employee: s.user_name,
      site: s.site_name || "—",
      workStart: fmtTime(s.started_at),
      pauseStart: fmtTime(firstPauseStart),
      pauseEnd: fmtTime(lastPauseEnd),
      workEnd: s.ended_at ? fmtTime(s.ended_at) : "…",
      pauseMin: Math.round(lunchMs / 60000),
      workedHM: fmtHM(workedMs),
    };
  });
}

const HEADERS = [
  "Дата",
  "Сотрудник",
  "Объект",
  "Начало работы",
  "Начало паузы",
  "Конец паузы",
  "Конец работы",
  "Пауза (мин)",
  "Отработано",
];

function rowToArray(r: ExportRow) {
  return [
    r.date,
    r.employee,
    r.site,
    r.workStart,
    r.pauseStart,
    r.pauseEnd,
    r.workEnd,
    r.pauseMin,
    r.workedHM,
  ];
}

export async function exportShiftsXlsx(rows: ExportRow[], filename: string) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows.map(rowToArray)]);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 24 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Смены");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, filename);
}

export async function exportShiftsPdf(
  rows: ExportRow[],
  filename: string,
  title: string,
  lang?: LangCode,
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_BASE64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.setFont("Roboto");

  doc.setFontSize(14);
  doc.text(title, 40, 40);
  doc.setFontSize(9);
  doc.text(`Сформировано: ${new Date().toLocaleString(langToLocale(lang ?? "ru"))}`, 40, 58);
  autoTable(doc, {
    head: [HEADERS],
    body: rows.map(rowToArray),
    startY: 74,
    styles: {
      font: "Roboto",
      fontStyle: "normal",
      fontSize: 9,
      cellPadding: 6,
      textColor: [50, 50, 50],
    },
    headStyles: {
      fontStyle: "normal",
      fillColor: [13, 71, 161],
      textColor: [255, 255, 255],
      fontSize: 10,
      halign: "center",
    },
    bodyStyles: {
      halign: "center",
    },
    columnStyles: {
      1: { halign: "left" },
      2: { halign: "left" },
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  const blob = doc.output("blob");
  triggerDownload(blob, filename);
}

export function triggerDownload(blob: Blob, filename: string) {
  triggerDownloadSync(blob, filename);
}

function triggerDownloadSync(blob: Blob, filename: string) {
  if (Capacitor.isNativePlatform()) {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64data = reader.result as string;
        const base64 = base64data.split(",")[1];

        const result = await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Directory.Cache,
        });
        
        await Share.share({
          title: filename,
          url: result.uri,
        });
        toast.success("Открыто меню Поделиться");
      } catch (e) {
        console.error("Capacitor save error", e);
        toast.error("Ошибка сохранения файла");
      }
    };
    reader.readAsDataURL(blob);
    return;
  }

  fallbackDownload(blob, filename);
}

function fallbackDownload(blob: Blob, filename: string) {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
  if (isMobile) {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = base64data;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    reader.readAsDataURL(blob);
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }
}
