import { useState } from "react";
import { useAppSettings, useUpdateAppSettings } from "@/hooks/use-app-settings";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, Trash2 } from "lucide-react";

export function BrandingSettingsTab() {
  const { data: settings, isLoading } = useAppSettings();
  const updateSettings = useUpdateAppSettings();
  
  const [name, setName] = useState(settings?.app_name || "DMAG");
  const [uploading, setUploading] = useState(false);

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
      <h3 className="font-semibold text-lg mb-6">Брендирование приложения</h3>
      
      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="app-name">Название приложения (отображается в меню и заголовках)</Label>
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
              Сохранить
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Логотип приложения (используется в меню и как иконка сайта)</Label>
          
          <div className="flex items-end gap-4">
            <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
              {settings?.app_logo_url ? (
                <img src={settings.app_logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">Нет лого</span>
              )}
            </div>
            
            <div className="space-y-2 flex-1">
              <div className="flex gap-2">
                <Button variant="outline" className="relative overflow-hidden" disabled={uploading}>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {uploading ? "Загрузка..." : "Загрузить новый"}
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
              <p className="text-xs text-muted-foreground">Рекомендуется квадратное изображение (PNG, JPG) размером от 256x256.</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
