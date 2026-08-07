import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Upload,
  FileImage,
  CheckCircle2,
  Folder as FolderIcon,
  ChevronLeft,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function StorageBrowserDialog({
  open,
  onOpenChange,
  bucketName,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucketName: string;
  onSelect: (publicUrl: string, path: string) => void;
}) {
  const { user } = useAuth();
  const [files, setFiles] = useState<{ id: string | null; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open) {
      loadFiles(currentPath);
    }
  }, [open, bucketName, currentPath]);

  async function loadFiles(pathArray: string[]) {
    setLoading(true);
    try {
      const folderPath = pathArray.join("/");
      const { data, error } = await supabase.storage.from(bucketName).list(folderPath, {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw error;
      setFiles((data as { id: string | null; name: string }[])?.filter((f) => f.name !== ".emptyFolderPlaceholder") || []);
    } catch (e) {
      console.error(e);
      toast.error("Не удалось загрузить файлы");
    } finally {
      setLoading(false);
    }
  }

  const dragCounterRef = useRef(0);

  async function processFile(file: File | null) {
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      // Upload to current path
      const baseFolderPath = currentPath.join("/");
      const fileName = `${Date.now()}_${user.id.substring(0, 5)}.${ext}`;
      const uploadPath = baseFolderPath ? `${baseFolderPath}/${fileName}` : fileName;

      const { error } = await supabase.storage
        .from(bucketName)
        .upload(uploadPath, file, {
          upsert: false,
        });
      if (error) throw error;

      toast.success("Файл загружен!");
      await loadFiles(currentPath);
    } catch (e) {
      console.error(e);
      toast.error("Ошибка загрузки файла");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    await processFile(e.target.files?.[0] || null);
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }

  function handleSelect(file: { id: string | null; name: string }) {
    if (!file.id) {
      // It's a folder
      setCurrentPath([...currentPath, file.name]);
      return;
    }

    const folderPath = currentPath.join("/");
    const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name;
    const { data } = supabase.storage.from(bucketName).getPublicUrl(fullPath);

    onSelect(data.publicUrl, fullPath);
    onOpenChange(false);
  }

  async function handleFileDelete(e: React.MouseEvent, file: { id: string | null; name: string }) {
    e.stopPropagation();
    if (!confirm("Удалить файл?")) return;
    
    const folderPath = currentPath.join("/");
    const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name;
    
    // Optimistic update
    setFiles(prev => prev.filter(f => f.name !== file.name));
    
    try {
      const { error } = await supabase.storage.from(bucketName).remove([fullPath]);
      if (error) {
        await loadFiles(currentPath);
        throw error;
      }
      toast.success("Файл удален");
    } catch (err: any) {
      console.error(err);
      toast.error("Не удалось удалить файл");
    }
  }

  function goUp() {
    setCurrentPath(currentPath.slice(0, -1));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Хранилище ({bucketName})</DialogTitle>
          <DialogDescription>Выберите уже загруженный файл или загрузите новый.</DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "flex-1 min-h-[400px] overflow-hidden flex flex-col border-t bg-muted/5 relative transition-colors",
            isDragging && "bg-primary/10 border-primary/50"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-primary rounded-b-lg pointer-events-none">
              <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200">
                <div className="h-16 w-16 bg-primary/20 text-primary rounded-full flex items-center justify-center">
                  <Upload className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">Отпустите, чтобы загрузить</h3>
              </div>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileUpload}
          />

          <div className="p-4 border-b flex justify-between items-center bg-muted/10 shadow-sm z-10 relative">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 rounded-full"
                disabled={currentPath.length === 0}
                onClick={goUp}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-[400px]">
                <span>/</span>
                {currentPath.map((p, i) => (
                  <span key={i} className="flex items-center gap-1.5 shrink-0">
                    <span className="text-foreground">{p}</span>
                    <span>/</span>
                  </span>
                ))}
              </div>
            </div>
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Загрузить сюда
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            {loading ? (
              <div className="h-full flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-muted-foreground">
                <FolderIcon className="w-12 h-12 mb-3 opacity-20" />
                <p>Папка пуста</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {files.map((file) => {
                  const isFolder = !file.id;
                  const folderPath = currentPath.join("/");
                  const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name;
                  const url = isFolder
                    ? ""
                    : supabase.storage.from(bucketName).getPublicUrl(fullPath).data.publicUrl;

                  return (
                    <button
                      key={file.name}
                      onClick={() => handleSelect(file)}
                      className={cn(
                        "group relative aspect-square rounded-2xl overflow-hidden border bg-background hover:ring-2 hover:ring-primary transition-all",
                        "flex flex-col items-center justify-center",
                      )}
                    >
                      {isFolder ? (
                        <div className="flex flex-col items-center gap-2">
                          <FolderIcon className="w-12 h-12 text-blue-500/70 group-hover:text-blue-500 transition-colors" />
                          <span className="text-xs font-medium truncate max-w-[90%]">
                            {file.name}
                          </span>
                        </div>
                      ) : (
                        <>
                          <img
                            src={url}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm gap-2">
                            <CheckCircle2 className="w-8 h-8 text-white" />
                            <span className="text-white text-[10px] truncate max-w-[90%] px-1">
                              {file.name}
                            </span>
                          </div>
                          <button
                            onClick={(e) => handleFileDelete(e, file)}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
