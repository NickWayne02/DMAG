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
export function translit(str: string, lang?: LangCode) {
  if (!str) return "";
  const isCyrillic = ["ru", "bg", "uk", "tg"].includes(lang || "ru");
  if (isCyrillic) return str;
  const map: Record<string, string> = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "zh", "з": "z", "и": "i", "й": "y",
    "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f",
    "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
    "А": "A", "Б": "B", "В": "V", "Г": "G", "Д": "D", "Е": "E", "Ё": "Yo", "Ж": "Zh", "З": "Z", "И": "I", "Й": "Y",
    "К": "K", "Л": "L", "М": "M", "Н": "N", "О": "O", "П": "P", "Р": "R", "С": "S", "Т": "T", "У": "U", "Ф": "F",
    "Х": "Kh", "Ц": "Ts", "Ч": "Ch", "Ш": "Sh", "Щ": "Shch", "Ъ": "", "Ы": "Y", "Ь": "", "Э": "E", "Ю": "Yu", "Я": "Ya"
  };
  return str.replace(/[а-яА-ЯёЁ]/g, (match) => map[match] || match);
}

function fmtHM(ms: number, lang?: LangCode) {
  const t = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(t / 60);
  const m = pad(t % 60);
  const map: Record<string, {h: string, m: string}> = {
      ru: { h: "ч", m: "м" },
      en: { h: "h", m: "m" },
      de: { h: "Std", m: "Min" },
      ro: { h: "ore", m: "min" },
      bg: { h: "ч", m: "м" },
      pl: { h: "godz", m: "min" },
      uk: { h: "год", m: "хв" },
      uz: { h: "soat", m: "daq" },
      tg: { h: "с", m: "д" }
  };
  const l = lang || "ru";
  const tr = map[l] || { h: "h", m: "m" };
  return `${h}${tr.h} ${m}${tr.m}`;
}

export function toExportRows(shifts: ShiftDetail[], lang?: LangCode): ExportRow[] {
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
      employee: translit(s.user_name, lang),
      site: translit(s.site_name || "—", lang),
      workStart: fmtTime(s.started_at),
      pauseStart: fmtTime(firstPauseStart),
      pauseEnd: fmtTime(lastPauseEnd),
      workEnd: s.ended_at ? fmtTime(s.ended_at) : "…",
      pauseMin: Math.round(lunchMs / 60000),
      workedHM: fmtHM(workedMs, lang),
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

export async function exportShiftsXlsx(rows: ExportRow[], filename: string, customHeaders?: string[]) {
  const actualHeaders = customHeaders || HEADERS;
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([actualHeaders, ...rows.map(rowToArray)]);
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
  customHeaders?: string[],
  labels?: { generatedAt?: string; page?: string },
) {
  const actualHeaders = customHeaders || HEADERS;
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_BASE64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.setFont("Roboto");

  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFontSize(18);
  doc.text(title, 40, 50);

  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFontSize(10);
  const genStr = labels?.generatedAt || "Сформировано";
  doc.text(`${genStr}: ${new Date().toLocaleString(langToLocale(lang ?? "ru"))}`, 40, 70);

  autoTable(doc, {
    head: [actualHeaders],
    body: rows.map(rowToArray),
    startY: 90,
    theme: 'grid',
    styles: {
      font: "Roboto",
      fontStyle: "normal",
      fontSize: 9,
      cellPadding: 8,
      textColor: [51, 65, 85], // slate-700
      lineColor: [226, 232, 240], // slate-200
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [248, 250, 252], // slate-50
      textColor: [15, 23, 42], // slate-900
      fontStyle: "normal",
      fontSize: 10,
      halign: "center",
      lineWidth: 0.5,
      lineColor: [203, 213, 225], // slate-300
    },
    bodyStyles: {
      halign: "center",
    },
    columnStyles: {
      1: { halign: "left" },
      2: { halign: "left" },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    didDrawPage: function (data: any) {
      const pageStr = labels?.page || "Страница";
      let str = `${pageStr} ` + (doc as any).internal.getNumberOfPages();
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      let pageSize = doc.internal.pageSize;
      let pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      doc.text(str, data.settings.margin.left, pageHeight - 20);
    }
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

