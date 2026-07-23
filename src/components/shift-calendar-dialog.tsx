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

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

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
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

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
          <DialogTitle>Календарь смен · {employeeName}</DialogTitle>
          <DialogDescription>
            Отработано за месяц: <b>{Math.floor(monthWorkedMs / 3600000)}ч {String(Math.floor((monthWorkedMs % 3600000) / 60000)).padStart(2, "0")}м</b>
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
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
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
            <div key={w} className="py-1 font-medium">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((c) => {
            const entries = c.day ? rowsByDate.get(dateKey(c.day)) : undefined;
            const totalMin = entries?.reduce((acc, e) => {
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
                          {Math.floor(totalMin / 60)}ч {String(totalMin % 60).padStart(2, "0")}м
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
