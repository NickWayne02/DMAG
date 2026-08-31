import { useRef, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { Camera as LucideCamera, Loader2, X, ImagePlus, FolderSearch } from "lucide-react";
import type { Site } from "./site-selector-dialog";
import { StorageBrowserDialog } from "@/components/storage-browser-dialog";

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
  initialData,
  skipDbInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: Site | null;
  onSuccess?: (data: {
    photoPath: string | null;
    description: string;
    criticality: string;
  }) => Promise<void> | void;
  initialData?: {
    photoPath: string | null;
    description: string;
    criticality: string;
  } | null;
  skipDbInsert?: boolean;
}) {
  const { user } = useAuth();
  const { t, tName } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [criticality, setCriticality] = useState<Criticality>("info");
  const [busy, setBusy] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [fullScreenPreview, setFullScreenPreview] = useState(false);
  const [selectedStoragePath, setSelectedStoragePath] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialData) {
      if (initialData.photoPath) {
        setPreviewUrl(
          supabase.storage.from("photo-reports").getPublicUrl(initialData.photoPath).data.publicUrl,
        );
        setSelectedStoragePath(initialData.photoPath);
      } else {
        setPreviewUrl(null);
        setSelectedStoragePath(null);
      }
      setDescription(initialData.description);
      setCriticality((initialData.criticality as Criticality) || "info");
    } else if (!open) {
      reset();
    }
  }, [open, initialData]);

  function reset() {
    setFile(null);
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedStoragePath(null);
    setDescription("");
    setCriticality("info");
  }

  function handleFile(f: File | null) {
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setSelectedStoragePath(null);
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function takePhoto(source: "CAMERA" | "PHOTOS") {
    const isNative =
      typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.();

    if (isNative) {
      try {
        const { Camera } = await import("@capacitor/camera");
        const photo = await Camera.getPhoto({
          resultType: "uri" as any,
          source: source as any,
          quality: 80,
        });
        if (photo.webPath) {
          const response = await fetch(photo.webPath);
          const blob = await response.blob();
          const f = new File([blob], `photo.${photo.format}`, { type: `image/${photo.format}` });
          handleFile(f);
        }
      } catch (e: any) {
        console.error("Camera error:", e);
        toast.error(`Ошибка камеры: ${e?.message || 'Нет доступа'}`);
      }
      return; // Never fall back to web input if native!
    }

    // Web fallback - MUST be synchronous to user click
    if (fileInputRef.current) {
      if (source === "CAMERA") {
        fileInputRef.current.setAttribute("capture", "environment");
      } else {
        fileInputRef.current.removeAttribute("capture");
      }
      fileInputRef.current.click();
    }
  }

  async function submit() {
    if (!site && !skipDbInsert) {
      toast.error("Сначала выберите объект");
      return;
    }
    if (!user) return;
    if (!file && !selectedStoragePath && !description.trim()) {
      toast.error("Добавьте фото или описание");
      return;
    }
    setBusy(true);
    try {
      let photoPath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${Date.now()}_${user.id.substring(0, 5)}.${ext}`;
        const up = await supabase.storage
          .from("photo-reports")
          .upload(path, file, { upsert: false });
        if (up.error) throw up.error;
        photoPath = up.data.path;
      } else if (selectedStoragePath) {
        photoPath = selectedStoragePath;
      }
      if (!skipDbInsert) {
        const { error } = await supabase.from("photo_reports").insert({
          site_id: site!.id,
          author_id: user.id,
          description: description.trim() || null,
          criticality,
          photo_url: photoPath,
        });
        if (error) throw error;
      }

      await onSuccess?.({ photoPath, description: description.trim(), criticality });

      toast.success(skipDbInsert ? "Изменения сохранены" : "Фотоотчет отправлен");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(`Не удалось сохранить отчет: ${e?.message || JSON.stringify(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o && !busy) reset();
          onOpenChange(o);
        }}
      >
        <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className={previewUrl ? "border-b pb-3 mb-2" : ""}>
            <DialogTitle>{previewUrl ? "Отправить изображение" : "Новый фотоотчет"}</DialogTitle>
            {!previewUrl && (
              <DialogDescription>
                {site ? (
                  <>
                    Объект: <span className="font-medium">{tName(site.name)}</span>
                  </>
                ) : skipDbInsert ? (
                  t("chat.photo.willBeSent", {
                    defaultValue: "Фото будет отправлено в текущий чат",
                  })
                ) : (
                  <span className="text-xs text-amber-500 font-medium">
                    {t("chat.photo.chooseSiteFirst", {
                      defaultValue: "Сначала выберите объект на главном экране",
                    })}
                  </span>
                )}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4">
            {/* Photo upload */}
            {!previewUrl ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("chat.photo.label", { defaultValue: "Фото" })}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div
                      role="button"
                      className="h-24 rounded-2xl flex flex-col items-center justify-center gap-1 border border-input bg-background shadow-sm cursor-pointer select-none [-webkit-tap-highlight-color:transparent] text-foreground"
                      onClick={() => takePhoto("CAMERA")}
                    >
                      <LucideCamera className="h-6 w-6" />
                      <span className="text-[10px] font-medium">
                        {t("chat.photo.camera", { defaultValue: "Снимок" })}
                      </span>
                    </div>
                    <div
                      role="button"
                      className="h-24 rounded-2xl flex flex-col items-center justify-center gap-1 border border-input bg-background shadow-sm cursor-pointer select-none [-webkit-tap-highlight-color:transparent] text-foreground"
                      onClick={() => takePhoto("PHOTOS")}
                    >
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-[10px] font-medium">
                        {t("chat.photo.gallery", { defaultValue: "Галерея" })}
                      </span>
                    </div>
                    <div
                      role="button"
                      className="h-24 rounded-2xl flex flex-col items-center justify-center gap-1 border border-input bg-background shadow-sm cursor-pointer select-none [-webkit-tap-highlight-color:transparent] text-foreground"
                      onClick={() => setBrowserOpen(true)}
                    >
                      <FolderSearch className="h-6 w-6" />
                      <span className="text-[10px] font-medium">
                        {t("chat.photo.storage", { defaultValue: "Хранилище" })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="report-desc">
                    {t("chat.photo.descLabel", { defaultValue: "Описание" })}
                  </Label>
                  <Textarea
                    id="report-desc"
                    placeholder={t("chat.photo.descPlaceholder", {
                      defaultValue: "Скрытые работы, дефект, замечание...",
                    })}
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col">
                <div className="relative rounded-lg overflow-hidden bg-black/10 flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="w-full max-h-[60vh] object-contain cursor-pointer"
                    onClick={() => setFullScreenPreview(true)}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg opacity-80 hover:opacity-100"
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => handleFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="relative">
                  <Input
                    placeholder={t("chat.photo.captionPlaceholder", { defaultValue: "Подпись..." })}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="border-0 border-b border-input rounded-none px-1 shadow-none focus-visible:ring-0 focus-visible:border-primary text-base"
                  />
                </div>
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

          {!previewUrl ? (
            <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2 mt-4">
              <Button
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                {t("chat.photo.cancel", { defaultValue: "Отмена" })}
              </Button>
              <Button
                className="h-11 rounded-xl"
                onClick={submit}
                disabled={busy || (!site && !skipDbInsert)}
              >
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("chat.photo.send", { defaultValue: "Отправить" })}
              </Button>
            </DialogFooter>
          ) : (
            <DialogFooter className="flex flex-row justify-between items-center sm:justify-between mt-4">
              <Button
                variant="ghost"
                className="h-10 text-muted-foreground hover:text-foreground font-normal px-2"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                {t("chat.photo.cancel", { defaultValue: "Отмена" })}
              </Button>
              <Button
                variant="ghost"
                className="h-10 text-primary hover:text-primary/90 font-medium px-2"
                onClick={submit}
                disabled={busy || (!site && !skipDbInsert)}
              >
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("chat.photo.send", { defaultValue: "Отправить" })}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <StorageBrowserDialog
        open={browserOpen}
        onOpenChange={setBrowserOpen}
        bucketName="photo-reports"
        onSelect={(url, path) => {
          if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
          setFile(null);
          setSelectedStoragePath(path);
          setPreviewUrl(url);
        }}
      />

      <Dialog open={fullScreenPreview} onOpenChange={setFullScreenPreview}>
        <DialogContent
          className="max-w-4xl p-0 overflow-hidden bg-black/90 border-none flex items-center justify-center h-[90vh] sm:h-screen sm:max-h-screen rounded-none sm:rounded-none cursor-pointer"
          onClick={() => setFullScreenPreview(false)}
        >
          {previewUrl && (
            <img
              src={previewUrl}
              alt="preview"
              className="max-w-full max-h-[90vh] sm:max-h-screen object-contain pointer-events-none"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
