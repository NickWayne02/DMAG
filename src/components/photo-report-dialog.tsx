import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
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
import { Camera as LucideCamera, Loader2, X, ImagePlus } from "lucide-react";
import type { Site } from "./site-selector-dialog";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

type Criticality = "info" | "important" | "urgent";

const CRIT_OPTIONS: {
  value: Criticality;
  label: string;
  color: string;
  light: string;
}[] = [
  { value: "info", label: "Информация", color: "#4CAF50", light: "#E8F5E9" },
  { value: "important", label: "Важно", color: "#FFB300", light: "#FFF8E1" },
  { value: "urgent", label: "Срочно", color: "#F44336", light: "#FFEBEE" },
];

export function PhotoReportDialog({
  open,
  onOpenChange,
  site,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: Site | null;
  onSuccess?: () => void;
}) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [criticality, setCriticality] = useState<Criticality>("info");
  const [busy, setBusy] = useState(false);

  function reset() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDescription("");
    setCriticality("info");
  }

  function handleFile(f: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function takePhoto(source: CameraSource) {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source,
        quality: 80,
      });
      if (photo.webPath) {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const f = new File([blob], `photo.${photo.format}`, { type: `image/${photo.format}` });
        handleFile(f);
      }
    } catch (e) {
      console.error("Camera error:", e);
      if (fileInputRef.current) {
        if (source === CameraSource.Camera) {
          fileInputRef.current.setAttribute("capture", "environment");
        } else {
          fileInputRef.current.removeAttribute("capture");
        }
        fileInputRef.current.click();
      }
    }
  }

  async function submit() {
    if (!site) {
      toast.error("Сначала выберите объект");
      return;
    }
    if (!user) return;
    if (!file && !description.trim()) {
      toast.error("Добавьте фото или описание");
      return;
    }
    setBusy(true);
    try {
      let photoPath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${site.id}/${Date.now()}.${ext}`;
        const up = await supabase.storage
          .from("photo-reports")
          .upload(path, file, { upsert: false });
        if (up.error) throw up.error;
        photoPath = up.data.path;
      }
      const { error } = await supabase.from("photo_reports").insert({
        site_id: site.id,
        author_id: user.id,
        description: description.trim() || null,
        criticality,
        photo_url: photoPath,
      });
      if (error) throw error;
      toast.success("Фотоотчет сохранен");
      onSuccess?.();
      reset();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Не удалось сохранить отчет");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !busy) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новый фотоотчет</DialogTitle>
          <DialogDescription>
            {site ? (
              <>
                Объект: <span className="font-medium">{site.name}</span>
              </>
            ) : (
              "Сначала выберите объект на главном экране"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo upload */}
          <div className="space-y-2">
            <Label>Фото</Label>
            {previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden border">
                <img src={previewUrl} alt="preview" className="w-full max-h-64 object-cover" />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2 h-9 w-9 rounded-full shadow"
                  onClick={() => handleFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-24 rounded-2xl flex flex-col gap-1"
                  onClick={() => takePhoto(CameraSource.Camera)}
                >
                  <LucideCamera className="h-6 w-6" />
                  <span className="text-xs">Сделать снимок</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-24 rounded-2xl flex flex-col gap-1"
                  onClick={() => takePhoto(CameraSource.Photos)}
                >
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-xs">Из галереи</span>
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="report-desc">Описание</Label>
            <Textarea
              id="report-desc"
              placeholder="Скрытые работы, дефект, замечание..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Criticality pills */}
          <div className="space-y-2">
            <Label>Уровень критичности</Label>
            <div className="flex flex-wrap gap-2">
              {CRIT_OPTIONS.map((opt) => {
                const active = criticality === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCriticality(opt.value)}
                    style={{
                      backgroundColor: active ? opt.color : opt.light,
                      color: active ? "#fff" : opt.color,
                      borderColor: opt.color,
                    }}
                    className="rounded-full px-5 py-2.5 text-sm font-semibold border-2 transition active:scale-95"
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Отмена
          </Button>
          <Button className="h-11 rounded-xl" onClick={submit} disabled={busy || !site}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
