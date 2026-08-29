import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";

type ShiftEdit = {
  id?: string;
  user_id: string;
  user_name: string;
  site_id: string | null;
  site_name: string | null;
  started_at: string;
  ended_at: string;
  lunch_minutes: number;
  start_city: string;
  end_city: string;
};

type ShiftRow = {
  id: string;
  user_id: string;
  site_name: string | null;
  started_at: string;
  ended_at: string | null;
  lunch_total_ms: number;
  start_city: string | null;
  end_city: string | null;
};

export function AdminEditableCalendarDialog({
  open,
  onClose,
  employeeId,
  employeeName,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}) {
  const { t, lang } = useLanguage();

  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [shiftEdit, setShiftEdit] = useState<ShiftEdit | null>(null);
  const [shiftEditList, setShiftEditList] = useState<ShiftEdit[]>([]);
  const [shiftEditIndex, setShiftEditIndex] = useState(0);
  const [shiftSaving, setShiftSaving] = useState(false);
  const [shiftDeleteConfirm, setShiftDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    loadData();
  }, [open, employeeId]);

  async function loadData() {
    setLoading(true);
    try {
      const [shiftsRes, sitesRes] = await Promise.all([
        supabase
          .from("shifts")
          .select(
            "id, user_id, site_name, started_at, ended_at, lunch_total_ms, start_city, end_city",
          )
          .eq("user_id", employeeId),
        supabase.from("sites").select("id, name"),
      ]);
      if (shiftsRes.data) setShifts(shiftsRes.data);
      if (sitesRes.data) setSites(sitesRes.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const WEEKDAYS = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang, { weekday: "short" });
    const days = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(2024, 0, i);
      const str = fmt.format(d).replace(/\./g, "");
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
    const map = new Map<
      string,
      Array<{
        site: string;
        workStart: string;
        workEnd: string;
        workedHM: string;
        row: ShiftRow;
      }>
    >();

    shifts.forEach((s) => {
      const startD = new Date(s.started_at);
      const dateKey = `${String(startD.getDate()).padStart(2, "0")}.${String(startD.getMonth() + 1).padStart(2, "0")}.${startD.getFullYear()}`;

      const arr = map.get(dateKey) ?? [];
      const endMs = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
      const ms = Math.max(0, endMs - startD.getTime() - (s.lunch_total_ms || 0));

      const fmtTime = (d: Date) =>
        d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });

      arr.push({
        site: s.site_name || t("admin.shift.noSite", { defaultValue: "Не указан" }),
        workStart: fmtTime(startD),
        workEnd: s.ended_at ? fmtTime(new Date(s.ended_at)) : "...",
        workedHM: `${Math.floor(ms / 3600000)}${t("time.hoursShort")} ${String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0")}${t("time.minutesShort")}`,
        row: s,
      });
      map.set(dateKey, arr);
    });
    return map;
  }, [shifts, lang]);

  const grid = useMemo(() => {
    const firstDay = new Date(cursor);
    const jsDay = firstDay.getDay();
    const offset = (jsDay + 6) % 7;
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: Array<{ day: number | null; key: string }> = [];
    for (let i = 0; i < offset; i++) cells.push({ day: null, key: `e${i}` });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, key: `d${d}` });
    while (cells.length % 7 !== 0) cells.push({ day: null, key: `t${cells.length}` });
    return cells;
  }, [cursor]);

  function toLocalInput(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function fromLocalInput(s: string) {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  function loadShiftIntoEdit(s: ShiftRow) {
    setShiftEdit({
      id: s.id,
      user_id: s.user_id,
      user_name: employeeName,
      site_id: null,
      site_name: s.site_name,
      started_at: toLocalInput(new Date(s.started_at)),
      ended_at: s.ended_at ? toLocalInput(new Date(s.ended_at)) : "",
      lunch_minutes: Math.floor((s.lunch_total_ms || 0) / 60000),
      start_city: s.start_city || "",
      end_city: s.end_city || "",
    });
  }

  function onDayClick(day: number) {
    const dateKey = `${String(day).padStart(2, "0")}.${String(cursor.getMonth() + 1).padStart(2, "0")}.${cursor.getFullYear()}`;
    const entries = rowsByDate.get(dateKey) || [];

    if (entries.length === 0) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), day, 9, 0);
      setShiftEditList([]);
      setShiftEditIndex(0);
      setShiftEdit({
        user_id: employeeId,
        user_name: employeeName,
        site_id: null,
        site_name: null,
        started_at: toLocalInput(d),
        ended_at: toLocalInput(new Date(d.getTime() + 8 * 3600000)),
        lunch_minutes: 0,
        start_city: "",
        end_city: "",
      });
    } else if (entries.length === 1) {
      setShiftEditList([]);
      setShiftEditIndex(0);
      loadShiftIntoEdit(entries[0].row);
    } else {
      const list = entries.map((e) => ({
        id: e.row.id,
        user_id: e.row.user_id,
        user_name: employeeName,
        site_id: null,
        site_name: e.row.site_name,
        started_at: toLocalInput(new Date(e.row.started_at)),
        ended_at: e.row.ended_at ? toLocalInput(new Date(e.row.ended_at)) : "",
        lunch_minutes: Math.floor((e.row.lunch_total_ms || 0) / 60000),
        start_city: e.row.start_city || "",
        end_city: e.row.end_city || "",
      }));
      setShiftEditList(list);
      setShiftEditIndex(0);
      setShiftEdit(list[0]);
    }
  }

  async function saveShift() {
    if (!shiftEdit) return;
    const started = fromLocalInput(shiftEdit.started_at);
    if (!started) {
      toast.error("Укажите время начала");
      return;
    }
    const ended = fromLocalInput(shiftEdit.ended_at);
    const lunch_total_ms = Math.max(0, shiftEdit.lunch_minutes) * 60000;
    const status = ended ? "finished" : "working";

    setShiftSaving(true);
    try {
      if (shiftEdit.id) {
        await supabase
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
      } else {
        await supabase.from("shifts").insert({
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
      }
      toast.success("Смена сохранена");
      setShiftEdit(null);
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
    setShiftSaving(false);
  }

  async function deleteShift() {
    if (!shiftEdit?.id) return;
    if (shiftDeleteConfirm !== shiftEdit.id) {
      setShiftDeleteConfirm(shiftEdit.id);
      return;
    }
    setShiftSaving(true);
    try {
      await supabase.from("shifts").delete().eq("id", shiftEdit.id);
      toast.success("Смена удалена");
      setShiftDeleteConfirm(null);
      setShiftEdit(null);
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
    setShiftSaving(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl h-[85vh] sm:h-auto overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("admin.shift.management", { defaultValue: "Управление сменами" })} · {employeeName}
            </DialogTitle>
            <DialogDescription>
              {t("admin.shift.instruction", {
                defaultValue: "Нажмите на любой день, чтобы добавить или отредактировать смену.",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between mb-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> {t("admin.calendar.prev")}
            </Button>
            <div className="font-semibold text-center whitespace-nowrap">
              {monthName} {cursor.getFullYear()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              {t("admin.calendar.next")} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-2 text-sm font-semibold text-muted-foreground text-center mb-2">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-1">
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {grid.map((c) => {
                  const dateKey = c.day
                    ? `${String(c.day).padStart(2, "0")}.${String(cursor.getMonth() + 1).padStart(2, "0")}.${cursor.getFullYear()}`
                    : "";
                  const entries = c.day ? rowsByDate.get(dateKey) : undefined;

                  return (
                    <div
                      key={c.key}
                      onClick={() => c.day && onDayClick(c.day)}
                      className={`min-h-20 rounded-xl p-1.5 text-xs border transition-all ${
                        c.day
                          ? entries
                            ? "bg-primary/5 border-primary/30 cursor-pointer hover:bg-primary/10"
                            : "bg-muted/30 border-transparent cursor-pointer hover:bg-muted/50"
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
                                  title={e.site}
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
                                    const [h, m] = e.workedHM
                                      .replace("ч", "")
                                      .replace("м", "")
                                      .split(" ");
                                    return acc + (parseInt(h || "0") * 60 + parseInt(m || "0"));
                                  }, 0);
                                  return `${Math.floor(totalMin / 60)}${t("time.hoursShort")} ${String(totalMin % 60).padStart(2, "0")}${t("time.minutesShort")}`;
                                })()}
                              </div>
                            </div>
                          )}
                          {!entries && (
                            <div className="mt-auto text-[10px] text-muted-foreground/50 opacity-0 hover:opacity-100 text-center">
                              {t("admin.personnel.addShift", { defaultValue: "+ Смена" })}
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
        </DialogContent>
      </Dialog>

      <Dialog open={!!shiftEdit} onOpenChange={(o) => !o && setShiftEdit(null)}>
        <DialogContent className="sm:max-w-md z-100">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {shiftEdit?.id ? t("admin.calendar.editShift") : t("admin.calendar.addShift")}
              </DialogTitle>
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
                      setShiftEdit(shiftEditList[n]);
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
                      setShiftEdit(shiftEditList[n]);
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {shiftEdit && (
            <div className="space-y-3">
              <div>
                <Label>{t("admin.calendar.site")}</Label>
                <Select
                  value={shiftEdit.site_name || "__none__"}
                  onValueChange={(v) => {
                    if (v === "__none__")
                      setShiftEdit({ ...shiftEdit, site_id: null, site_name: null });
                    else {
                      const s = sites.find((x) => x.name === v);
                      setShiftEdit({ ...shiftEdit, site_id: s?.id ?? null, site_name: v });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.calendar.noSite")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("admin.calendar.noSite")}</SelectItem>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("admin.calendar.start")}</Label>
                  <Input
                    type="datetime-local"
                    lang={lang}
                    value={shiftEdit.started_at}
                    onChange={(ev) => setShiftEdit({ ...shiftEdit, started_at: ev.target.value })}
                  />
                </div>
                <div>
                  <Label>{t("admin.calendar.end")}</Label>
                  <Input
                    type="datetime-local"
                    lang={lang}
                    value={shiftEdit.ended_at}
                    onChange={(ev) => setShiftEdit({ ...shiftEdit, ended_at: ev.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>{t("admin.calendar.pause")}</Label>
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
                  <Label>{t("admin.calendar.gpsStart")}</Label>
                  <Input
                    value={shiftEdit.start_city}
                    onChange={(ev) => setShiftEdit({ ...shiftEdit, start_city: ev.target.value })}
                  />
                </div>
                <div>
                  <Label>{t("admin.calendar.gpsEnd")}</Label>
                  <Input
                    value={shiftEdit.end_city}
                    onChange={(ev) => setShiftEdit({ ...shiftEdit, end_city: ev.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            {shiftEdit?.id && (
              <Button variant="destructive" onClick={deleteShift} disabled={shiftSaving}>
                {shiftDeleteConfirm === shiftEdit.id
                  ? t("admin.calendar.confirmDelete")
                  : t("admin.calendar.delete")}
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setShiftEdit(null)} disabled={shiftSaving}>
              {t("admin.calendar.cancel")}
            </Button>
            <Button onClick={saveShift} disabled={shiftSaving}>
              {shiftSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("admin.calendar.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
