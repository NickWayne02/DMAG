import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSettings, useUpdateAppSettings } from "@/hooks/use-app-settings";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, RotateCcw, Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const DEFAULT_PRESET_NAMES = ["DMAG", "E&R", "O&D"];

export function BrandingSettingsTab({
  onUpdate,
  onApplyPreset,
}: {
  onUpdate?: () => void;
  onApplyPreset?: (id: string) => void;
}) {
  const { t } = useLanguage();
  const { data: settings, isLoading } = useAppSettings();
  const updateSettings = useUpdateAppSettings();
  const queryClient = useQueryClient();

  const [name, setName] = useState(settings?.app_name || "DMAG");
  const [uploading, setUploading] = useState(false);

  const { data: presets, isLoading: isLoadingPresets } = useQuery({
    queryKey: ["app_branding_presets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_branding_presets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const savePresetMutation = useMutation({
    mutationFn: async (preset: { app_name: string; app_logo_url: string | null }) => {
      const { data, error } = await supabase
        .from("app_branding_presets")
        .insert(preset)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["app_branding_presets"] });
      toast.success("Пресет сохранен в галерею");
      onUpdate?.();
      if (data?.id) {
        onApplyPreset?.(data.id);
      }
    },
    onError: (e: any) => toast.error(e.message || "Ошибка сохранения пресета"),
  });

  const deletePresetMutation = useMutation({
    mutationFn: async (preset: { id: string; app_logo_url: string | null }) => {
      const { error } = await supabase.from("app_branding_presets").delete().eq("id", preset.id);
      if (error) throw error;

      if (preset.app_logo_url) {
        try {
          const oldUrlParts = preset.app_logo_url.split("/assets/");
          if (oldUrlParts.length > 1) {
            const oldFilePath = oldUrlParts[1];
            await supabase.storage.from("assets").remove([oldFilePath]);
          }
        } catch (err) {
          console.error("Failed to delete logo from storage", err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_branding_presets"] });
      toast.success("Пресет удален");
      onUpdate?.();
    },
    onError: (e: any) => toast.error(e.message || "Ошибка удаления пресета"),
  });

  const updatePresetMutation = useMutation({
    mutationFn: async (data: { id: string; app_name: string; app_logo_url: string | null }) => {
      const { error } = await supabase
        .from("app_branding_presets")
        .update({
          app_name: data.app_name,
          app_logo_url: data.app_logo_url,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_branding_presets"] });
      toast.success("Пресет обновлен");
      onUpdate?.();
    },
    onError: (e: any) => toast.error(e.message || "Ошибка обновления пресета"),
  });

  // Sync state when settings load
  useEffect(() => {
    if (settings?.app_name) {
      setName(settings.app_name);
    }
  }, [settings?.app_name]);

  const handleSaveName = async () => {
    try {
      await updateSettings.mutateAsync({ app_name: name });
      toast.success("Название приложения обновлено");
    } catch (e: any) {
      toast.error(e.message || "Ошибка при сохранении названия");
    }
  };

  const handleUploadLogo = async (
    e: React.ChangeEvent<HTMLInputElement>,
    presetToEdit?: { id: string; app_name: string; app_logo_url: string | null },
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // file size limit removed as requested

    try {
      setUploading(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Math.random()}.${fileExt}`;
      const filePath = `brand/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("assets").upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("assets").getPublicUrl(filePath);

      // Удаляем старый логотип из Storage, если он был
      const oldUrl = presetToEdit ? presetToEdit.app_logo_url : settings?.app_logo_url;
      if (oldUrl) {
        try {
          // Check if this URL is used by any preset (to prevent deleting a preset's logo when removing global logo)
          const isUsedByPreset = presets?.some(
            (p: any) => p.app_logo_url === oldUrl && (!presetToEdit || p.id !== presetToEdit.id),
          );

          if (!isUsedByPreset) {
            const oldUrlParts = oldUrl.split("/assets/");
            if (oldUrlParts.length > 1) {
              const oldFilePath = oldUrlParts[1];
              await supabase.storage.from("assets").remove([oldFilePath]);
            }
          }
        } catch (err) {
          console.error("Failed to delete old logo", err);
        }
      }

      if (presetToEdit) {
        await updatePresetMutation.mutateAsync({
          id: presetToEdit.id,
          app_name: presetToEdit.app_name,
          app_logo_url: publicUrlData.publicUrl,
        });
      } else {
        await updateSettings.mutateAsync({ app_logo_url: publicUrlData.publicUrl });
      }
      toast.success("Логотип обновлен");
    } catch (e: any) {
      toast.error(e.message || "Ошибка загрузки логотипа");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      if (settings?.app_logo_url) {
        try {
          const isUsedByPreset = presets?.some(
            (p: any) => p.app_logo_url === settings.app_logo_url,
          );

          if (!isUsedByPreset) {
            const oldUrlParts = settings.app_logo_url.split("/assets/");
            if (oldUrlParts.length > 1) {
              const oldFilePath = oldUrlParts[1];
              await supabase.storage.from("assets").remove([oldFilePath]);
            }
          }
        } catch (err) {
          console.error("Failed to delete logo from storage", err);
        }
      }
      await updateSettings.mutateAsync({ app_logo_url: null });
      toast.success("Логотип удален");
    } catch (e: any) {
      toast.error(e.message || "Ошибка удаления логотипа");
    }
  };

  const handleResetToDefault = async () => {
    try {
      const dmagPreset = presets?.find((p: any) => p.app_name?.toUpperCase()?.trim() === "DMAG");
      await updateSettings.mutateAsync({
        app_name: "DMAG",
        app_logo_url: dmagPreset?.app_logo_url || null,
      });
      setName("DMAG");

      if (dmagPreset) {
        onApplyPreset?.(dmagPreset.id);
      }

      onUpdate?.();
      toast.success(
        t("admin.branding.resetDefaultSuccess") || "Возвращены настройки по умолчанию (DMAG)",
      );
    } catch (e: any) {
      toast.error(e.message || "Ошибка сброса настроек");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center gap-2">
        <Loader2 className="animate-spin" /> Загрузка настроек...
      </div>
    );
  }

  const isCurrentDefault = DEFAULT_PRESET_NAMES.includes(
    settings?.app_name?.toUpperCase()?.trim() || settings?.app_name || "",
  );

  const erPreset = presets?.find((p: any) => p.app_name?.toUpperCase()?.trim() === "E&R");
  const odPreset = presets?.find((p: any) => p.app_name?.toUpperCase()?.trim() === "O&D");

  return (
    <Card className="p-6 rounded-2xl">
      <h3 className="font-semibold text-lg mb-6">{t("admin.branding.title")}</h3>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="app-name">{t("admin.branding.nameDesc")}</Label>
          <div className="flex gap-2">
            <Input
              id="app-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("admin.branding.nameDesc", { defaultValue: "Enter name..." })}
              className="max-w-md"
              disabled={isCurrentDefault}
            />
            <Button
              onClick={handleSaveName}
              disabled={updateSettings.isPending || isCurrentDefault}
            >
              {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("admin.users.save")}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Label>{t("admin.branding.logoDesc")}</Label>

          <div className="flex items-end gap-4">
            <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
              {settings?.app_logo_url ? (
                <img
                  src={settings.app_logo_url}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-muted-foreground">{t("admin.branding.noLogo")}</span>
              )}
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="relative overflow-hidden"
                  disabled={uploading || isCurrentDefault}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {uploading ? "..." : t("admin.branding.uploadNew")}
                  {!isCurrentDefault && (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLogo}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                  )}
                </Button>

                {settings?.app_logo_url && (
                  <Button
                    variant="destructive"
                    onClick={handleRemoveLogo}
                    disabled={updateSettings.isPending || isCurrentDefault}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />{" "}
                    {t("admin.reports.delete", { defaultValue: "Delete" })}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t("admin.branding.logoHint")}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border flex-wrap">
          <Button
            variant="outline"
            className={`border-primary/50 hover:bg-primary/10 ${settings?.app_name?.toUpperCase()?.trim() === "DMAG" ? "bg-primary/20 text-primary" : "text-foreground"}`}
            onClick={handleResetToDefault}
            disabled={updateSettings.isPending}
          >
            DMAG
          </Button>

          {erPreset && (
            <Button
              variant="outline"
              className={`border-primary/50 hover:bg-primary/10 ${settings?.app_name?.toUpperCase()?.trim() === "E&R" ? "bg-primary/20 text-primary" : "text-foreground"}`}
              onClick={async () => {
                try {
                  await updateSettings.mutateAsync({
                    app_name: erPreset.app_name,
                    app_logo_url: erPreset.app_logo_url,
                  });
                  toast.success("Бренд E&R применен");
                  onApplyPreset?.(erPreset.id);
                } catch (e: any) {
                  toast.error(e.message || "Ошибка");
                }
              }}
              disabled={updateSettings.isPending}
            >
              E&R
            </Button>
          )}

          {odPreset && (
            <Button
              variant="outline"
              className={`border-primary/50 hover:bg-primary/10 ${settings?.app_name?.toUpperCase()?.trim() === "O&D" ? "bg-primary/20 text-primary" : "text-foreground"}`}
              onClick={async () => {
                try {
                  await updateSettings.mutateAsync({
                    app_name: odPreset.app_name,
                    app_logo_url: odPreset.app_logo_url,
                  });
                  toast.success("Бренд O&D применен");
                  onApplyPreset?.(odPreset.id);
                } catch (e: any) {
                  toast.error(e.message || "Ошибка");
                }
              }}
              disabled={updateSettings.isPending}
            >
              O&D
            </Button>
          )}

          <Button
            variant="secondary"
            className="ml-auto"
            onClick={() =>
              savePresetMutation.mutate({
                app_name: name,
                app_logo_url: settings?.app_logo_url || null,
              })
            }
            disabled={savePresetMutation.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />+ {t("admin.branding.newBrand")}
          </Button>
        </div>
      </div>

      <div className="mt-12">
        {isLoadingPresets ? (
          <div className="border-t border-border pt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="animate-spin h-4 w-4" /> ...
          </div>
        ) : (
          (() => {
            const customPresets = [...(presets || [])].filter(
              (p: any) =>
                !DEFAULT_PRESET_NAMES.includes(p.app_name?.toUpperCase()?.trim() || p.app_name),
            );

            if (customPresets.length === 0) return null;

            return (
              <div className="border-t border-border pt-8">
                <h3 className="font-semibold text-lg mb-6">{t("admin.branding.gallery")}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {customPresets.map((preset: any) => {
                    const presetName = preset.app_name?.toUpperCase?.()?.trim() || preset.app_name;
                    const isDefault = DEFAULT_PRESET_NAMES.includes(presetName);
                    return (
                      <Card
                        key={preset.id}
                        className={`overflow-hidden bg-card/50 ${isDefault ? "ring-1 ring-primary/20" : ""}`}
                      >
                        <CardContent className="p-4 flex flex-col items-center gap-4">
                          <div className="h-16 w-16 rounded-xl border border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                            {preset.app_logo_url ? (
                              <img
                                src={preset.app_logo_url}
                                alt={preset.app_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                {t("admin.branding.noLogo")}
                              </span>
                            )}
                          </div>
                          <p
                            className="text-sm font-medium text-center truncate w-full"
                            title={preset.app_name}
                          >
                            {preset.app_name}
                          </p>

                          <div className="flex w-full gap-2 mt-auto">
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1"
                              onClick={async () => {
                                try {
                                  await updateSettings.mutateAsync({
                                    app_name: preset.app_name,
                                    app_logo_url: preset.app_logo_url,
                                  });
                                  toast.success("Бренд применен");
                                  onApplyPreset?.(preset.id);
                                } catch (e: any) {
                                  toast.error(e.message || "Ошибка");
                                }
                              }}
                              disabled={updateSettings.isPending}
                            >
                              {t("admin.branding.apply")}
                            </Button>
                            {!isDefault && (
                              <>
                                <Label
                                  htmlFor={`upload-preset-${preset.id}`}
                                  className="shrink-0 h-9 w-9 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                  title={t("admin.branding.editLogo", {
                                    defaultValue: "Edit logo",
                                  })}
                                >
                                  <Upload className="h-4 w-4" />
                                </Label>
                                <Input
                                  id={`upload-preset-${preset.id}`}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleUploadLogo(e, preset)}
                                />
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="shrink-0 h-9 w-9"
                                  onClick={() =>
                                    deletePresetMutation.mutate({
                                      id: preset.id,
                                      app_logo_url: preset.app_logo_url,
                                    })
                                  }
                                  disabled={deletePresetMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })()
        )}
      </div>
    </Card>
  );
}
