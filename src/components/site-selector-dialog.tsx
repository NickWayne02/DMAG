import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, MapPin, Loader2, ArrowLeft, Check } from "lucide-react";
import { useT } from "@/lib/i18n";
import { getCurrentPosition, reverseGeocodeCity } from "@/lib/geocode";

export type Site = {
  id: string;
  name: string;
  address: string | null;
  customer: string | null;
  comment: string | null;
};

export function SiteSelectorDialog({
  open,
  onOpenChange,
  selectedId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedId?: string | null;
  onSelect: (site: Site) => void;
}) {
  const { user } = useAuth();
  const tr = useT();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    customer: "",
    comment: "",
  });

  async function fillFromGps() {
    setGpsBusy(true);
    const coords = await getCurrentPosition();
    if (!coords) {
      toast.error(tr("toast.gpsFailed"));
      setGpsBusy(false);
      return;
    }
    const city = await reverseGeocodeCity(coords);
    setForm((f) => ({
      ...f,
      name: city || f.name,
      address: `GPS: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
    }));
    setGpsBusy(false);
  }

  useEffect(() => {
    if (!open) return;
    setCreating(false);
    void loadSites();
  }, [open]);

  async function loadSites() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sites")
      .select("id,name,address,customer,comment")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(tr("siteDlg.errLoad"));
      return;
    }
    setSites(data ?? []);
  }

  async function createSite() {
    if (!form.name.trim()) {
      toast.error(tr("siteDlg.errName"));
      return;
    }
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("sites")
      .insert({
        name: form.name.trim(),
        address: form.address.trim() || null,
        customer: form.customer.trim() || null,
        comment: form.comment.trim() || null,
        created_by: user.id,
      })
      .select("id,name,address,customer,comment")
      .single();
    setBusy(false);
    if (error || !data) {
      toast.error(tr("siteDlg.errCreate"));
      return;
    }
    toast.success(tr("siteDlg.okCreate"));
    setForm({ name: "", address: "", customer: "", comment: "" });
    setCreating(false);
    setSites((prev) => [data, ...prev]);
    onSelect(data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {creating && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCreating(false)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>
              {creating ? tr("siteDlg.newTitle") : tr("siteDlg.title")}
            </DialogTitle>
          </div>
          <DialogDescription>
            {creating ? tr("siteDlg.newSubtitle") : tr("siteDlg.subtitle")}
          </DialogDescription>
        </DialogHeader>

        {creating ? (
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl justify-start"
              onClick={fillFromGps}
              disabled={gpsBusy}
            >
              {gpsBusy ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4 mr-2" />
              )}
              {tr("siteDlg.gpsFill")}
            </Button>

            <div className="space-y-1.5">
              <Label htmlFor="site-name">{tr("siteDlg.fName")} *</Label>
              <Input
                id="site-name"
                placeholder={tr("siteDlg.phName")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-address">{tr("siteDlg.fAddress")}</Label>
              <Input
                id="site-address"
                placeholder={tr("siteDlg.phAddress")}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-customer">{tr("siteDlg.fCustomer")}</Label>
              <Input
                id="site-customer"
                placeholder={tr("siteDlg.phCustomer")}
                value={form.customer}
                onChange={(e) =>
                  setForm({ ...form, customer: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-comment">{tr("siteDlg.fComment")}</Label>
              <Textarea
                id="site-comment"
                placeholder={tr("siteDlg.phComment")}
                rows={3}
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
              />
            </div>
            <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => setCreating(false)}
                disabled={busy}
              >
                {tr("siteDlg.cancel")}
              </Button>
              <Button
                className="h-11 rounded-xl"
                onClick={createSite}
                disabled={busy}
              >
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {tr("siteDlg.create")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={() => setCreating(true)}
              className="w-full h-12 rounded-xl justify-start"
            >
              <Plus className="h-5 w-5 mr-2" />
              {tr("siteDlg.createBtn")}
            </Button>

            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-6 text-muted-foreground text-sm flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {tr("siteDlg.loading")}
                </div>
              ) : sites.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  {tr("siteDlg.empty")}
                </div>
              ) : (
                sites.map((s) => {
                  const active = s.id === selectedId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onSelect(s);
                        onOpenChange(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl border flex items-start gap-3 transition active:scale-[0.99] ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {s.name}
                        </p>
                        {s.address && (
                          <p className="text-xs text-muted-foreground truncate">
                            {s.address}
                          </p>
                        )}
                        {s.customer && (
                          <p className="text-xs text-muted-foreground truncate">
                            {s.customer}
                          </p>
                        )}
                      </div>
                      {active && (
                        <Check className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
