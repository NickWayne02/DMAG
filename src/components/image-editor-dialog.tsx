import React, { useState, useEffect } from "react";
import FilerobotImageEditor, { TABS, TOOLS } from "react-filerobot-image-editor";
import { Dialog, DialogContent } from "./ui/dialog";

export function ImageEditorDialog({
  open,
  onOpenChange,
  file,
  imageUrl,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file?: File | null;
  imageUrl?: string | null;
  onSave: (file: File) => void;
}) {
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (file) {
        const url = URL.createObjectURL(file);
        setSource(url);
        return () => URL.revokeObjectURL(url);
      } else if (imageUrl) {
        setSource(imageUrl);
      }
    } else {
      setSource(null);
    }
  }, [open, file, imageUrl]);

  if (!source) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-screen h-screen max-h-screen p-0 m-0 border-0 flex flex-col overflow-hidden bg-background">
        <FilerobotImageEditor
          source={source}
          savingPixelRatio={1}
          previewPixelRatio={1}
          onSave={(editedImageObject) => {
            if (editedImageObject.imageBase64) {
              fetch(editedImageObject.imageBase64)
                .then((res) => res.blob())
                .then((blob) => {
                  const editedFile = new File([blob], file?.name || "edited.jpg", {
                    type: editedImageObject.mimeType || "image/jpeg",
                  });
                  onSave(editedFile);
                  onOpenChange(false);
                });
            }
          }}
          onClose={() => onOpenChange(false)}
          annotationsCommon={{ fill: "#ff0000" }}
          Text={{ text: "Text..." }}
          tabsIds={[TABS.ANNOTATE, TABS.WATERMARK, TABS.ADJUST, TABS.FILTERS, TABS.FINETUNE]}
          defaultTabId={TABS.ANNOTATE}
          defaultToolId={TOOLS.PEN}
        />
      </DialogContent>
    </Dialog>
  );
}
