import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSettings, useUpdateAppSettings } from "@/hooks/use-app-settings";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function BrandingSettingsTab() {
  const { t } = useLanguage();
  const { data: settings, isLoading } = useAppSettings();
  const updateSettings = useUpdateAppSettings();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState(settings?.app_name || "DMAG");
  const [uploading, setUploading] = useState(false);

  const { data: presets, isLoading: isLoadingPresets } = useQuery({
    queryKey: ['app_branding_presets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_branding_presets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const savePresetMutation = useMutation({
    mutationFn: async (preset: { app_name: string; app_logo_url: string | null }) => {
      const { data, error } = await supabase.from('app_branding_presets').insert(preset).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_branding_presets'] });
      toast.success("Пресет сохранен в галерею");
    },
    onError: (e: any) => toast.error(e.message || "Ошибка сохранения пресета")
  });

  const deletePresetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('app_branding_presets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_branding_presets'] });
      toast.success("Пресет удален");
    },
    onError: (e: any) => toast.error(e.message || "Ошибка удаления пресета")
  });

  // Sync state when settings load
  if (!isLoading && settings && name === "DMAG" && settings.app_name !== "DMAG") {
    setName(settings.app_name);
  }

  const handleSaveName = async () => {
    try {
      await updateSettings.mutateAsync({ app_name: name });
      toast.success("Название приложения обновлено");
    } catch (e: any) {
      toast.error(e.message || "Ошибка при сохранении названия");
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Файл слишком большой. Максимальный размер: 2 МБ");
      return;
    }

    try {
      setUploading(true);
      
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Math.random()}.${fileExt}`;
      const filePath = `brand/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("assets")
        .getPublicUrl(filePath);

      // Удаляем старый логотип из Storage, если он был
      if (settings?.app_logo_url) {
        try {
          const oldUrlParts = settings.app_logo_url.split('/assets/');
          if (oldUrlParts.length > 1) {
            const oldFilePath = oldUrlParts[1];
            await supabase.storage.from("assets").remove([oldFilePath]);
          }
        } catch (err) {
          console.error("Failed to delete old logo", err);
        }
      }

      await updateSettings.mutateAsync({ app_logo_url: publicUrlData.publicUrl });
      toast.success("Логотип обновлен");
    } catch (e: any) {
      toast.error(e.message || "Ошибка загрузки логотипа");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await updateSettings.mutateAsync({ app_logo_url: null });
      toast.success("Логотип удален");
    } catch (e: any) {
      toast.error(e.message || "Ошибка удаления логотипа");
    }
  };

  if (isLoading) {
    return <div className="p-6 flex items-center gap-2"><Loader2 className="animate-spin" /> Загрузка настроек...</div>;
  }

  return (
    <Card className="p-6 rounded-2xl max-w-2xl">
      <h3 className="font-semibold text-lg mb-6">{t("admin.branding.title")}</h3>
      
      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="app-name">{t("admin.branding.nameDesc")}</Label>
          <div className="flex gap-2">
            <Input 
              id="app-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Введите название..."
              className="max-w-md"
            />
            <Button onClick={handleSaveName} disabled={updateSettings.isPending}>
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
                <img src={settings.app_logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">{t("admin.branding.noLogo")}</span>
              )}
            </div>
            
            <div className="space-y-2 flex-1">
              <div className="flex gap-2">
                <Button variant="outline" className="relative overflow-hidden" disabled={uploading}>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {uploading ? "..." : t("admin.branding.uploadNew")}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleUploadLogo}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                </Button>
                
                {settings?.app_logo_url && (
                  <Button variant="destructive" onClick={handleRemoveLogo} disabled={updateSettings.isPending}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t("admin.branding.logoHint")}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-border">
          <Button 
            variant="secondary" 
            onClick={() => savePresetMutation.mutate({ app_name: name, app_logo_url: settings?.app_logo_url || null })}
            disabled={savePresetMutation.isPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t("admin.branding.saveCurrent")}
          </Button>
        </div>
      </div>

      <div className="mt-12 border-t border-border pt-8">
        <h3 className="font-semibold text-lg mb-6">{t("admin.branding.gallery")}</h3>
        {isLoadingPresets ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> ...</div>
        ) : presets?.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.branding.galleryEmpty")}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {presets?.map((preset: any) => (
              <Card key={preset.id} className="overflow-hidden bg-card/50">
                <CardContent className="p-4 flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-xl border border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {preset.app_logo_url ? (
                      <img src={preset.app_logo_url} alt={preset.app_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{t("admin.branding.noLogo")}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-center truncate w-full" title={preset.app_name}>{preset.app_name}</p>
                  
                  <div className="flex w-full gap-2 mt-auto">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex-1"
                      onClick={async () => {
                        try {
                          await updateSettings.mutateAsync({ app_name: preset.app_name, app_logo_url: preset.app_logo_url });
                          toast.success("Бренд применен");
                        } catch (e: any) {
                          toast.error(e.message || "Ошибка");
                        }
                      }}
                      disabled={updateSettings.isPending}
                    >
                      {t("admin.branding.apply")}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="shrink-0 h-9 w-9"
                      onClick={() => deletePresetMutation.mutate(preset.id)}
                      disabled={deletePresetMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
