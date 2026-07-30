import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toExportRows, type ShiftDetail } from "@/lib/shift-export";
import { useLanguage } from "@/lib/i18n";

export function ShiftCalendarDialog({
  open,
  onClose,
  employeeName,
  shifts,
}: {
  open: boolean;
  onClose: () => void;
  employeeName: string;
  shifts: ShiftDetail[];
}) {
  const { t, lang } = useLanguage();

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const WEEKDAYS = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang, { weekday: "short" });
    const days = [];
    // 2024-01-01 was a Monday
    for (let i = 1; i <= 7; i++) {
      const d = new Date(2024, 0, i);
      const str = fmt.format(d).replace(/\./g, ""); // strip dots for some locales
      days.push(str.charAt(0).toUpperCase() + str.slice(1));
    }
    return days;
  }, [lang]);

  const monthName = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang, { month: "long" });
    const str = fmt.format(cursor);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, [lang, cursor]);

  const rowsByDate = useMemo(() => {
    const map = new Map<string, ReturnType<typeof toExportRows>>();
    const exported = toExportRows(shifts);
    exported.forEach((r) => {
      const arr = map.get(r.date) ?? [];
      arr.push(r);
      map.set(r.date, arr);
    });
    return map;
  }, [shifts]);

  const monthWorkedMs = useMemo(() => {
    let ms = 0;
    for (const s of shifts) {
      const d = new Date(s.started_at);
      if (d.getFullYear() !== cursor.getFullYear() || d.getMonth() !== cursor.getMonth()) continue;
      const start = d.getTime();
      const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
      ms += Math.max(0, end - start - Number(s.lunch_total_ms || 0));
    }
    return ms;
  }, [shifts, cursor]);

  const grid = useMemo(() => {
    const firstDay = new Date(cursor);
    // Monday-first offset
    const jsDay = firstDay.getDay();
    const offset = (jsDay + 6) % 7;
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: Array<{ day: number | null; key: string }> = [];
    for (let i = 0; i < offset; i++) cells.push({ day: null, key: `e${i}` });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, key: `d${d}` });
    while (cells.length % 7 !== 0) cells.push({ day: null, key: `t${cells.length}` });
    return cells;
  }, [cursor]);

  function dateKey(day: number) {
    return `${String(day).padStart(2, "0")}.${String(cursor.getMonth() + 1).padStart(2, "0")}.${cursor.getFullYear()}`;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("admin.personnel.calTooltip")} · {employeeName}</DialogTitle>
          <DialogDescription>
            {t("admin.personnel.workedMonth")}{" "}
            <b>
              {Math.floor(monthWorkedMs / 3600000)}{t("time.hours.short")}{" "}
              {String(Math.floor((monthWorkedMs % 3600000) / 60000)).padStart(2, "0")}{t("time.minutes.short")}
            </b>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold">
            {monthName} {cursor.getFullYear()}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground text-center mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1 font-medium">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((c) => {
            const entries = c.day ? rowsByDate.get(dateKey(c.day)) : undefined;
            const totalMin =
              entries?.reduce((acc, e) => {
                const [h, mRaw] = e.workedHM.replace("ч", "").replace("м", "").split(" ");
                return acc + (parseInt(h || "0") * 60 + parseInt(mRaw || "0"));
              }, 0) ?? 0;
            return (
              <div
                key={c.key}
                className={`min-h-[70px] rounded-lg p-1.5 text-xs border ${
                  c.day
                    ? entries
                      ? "bg-primary/5 border-primary/30"
                      : "bg-muted/30 border-transparent"
                    : "border-transparent"
                }`}
              >
                {c.day && (
                  <>
                    <div className="font-semibold text-foreground">{c.day}</div>
                    {entries && (
                      <div className="mt-1 space-y-0.5">
                        {entries.slice(0, 2).map((e, i) => (
                          <div key={i} className="tabular-nums text-[10px] text-primary">
                            {e.workStart}–{e.workEnd}
                          </div>
                        ))}
                        <div className="text-[10px] font-semibold text-foreground">
                          {Math.floor(totalMin / 60)}{t("time.hours.short")} {String(totalMin % 60).padStart(2, "0")}{t("time.minutes.short")}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
