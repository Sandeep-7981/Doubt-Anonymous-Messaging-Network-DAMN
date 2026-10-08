import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  url: string;
  type: string;
  name?: string | null;
}

export default function AttachmentLightbox({ open, onClose, url, type, name }: Props) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (open) setScale(1);
  }, [open]);

  const handleDownload = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      const objUrl = URL.createObjectURL(blob);
      a.href = objUrl;
      a.download = name || `attachment-${Date.now()}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      toast.error("Failed to download");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full p-0 overflow-hidden bg-background/95 border-border">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
          <p className="text-sm font-medium truncate flex-1 mr-3">{name || "Attachment"}</p>
          <div className="flex items-center gap-1">
            {type === "image" && (
              <>
                <Button size="icon" variant="ghost" onClick={() => setScale((s) => Math.max(0.25, s - 0.25))} title="Zoom out">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs w-12 text-center text-muted-foreground">{Math.round(scale * 100)}%</span>
                <Button size="icon" variant="ghost" onClick={() => setScale((s) => Math.min(5, s + 0.25))} title="Zoom in">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setScale(1)} title="Reset zoom">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button size="icon" variant="ghost" onClick={handleDownload} title="Download original">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center bg-black/40 min-h-[60vh] max-h-[85vh]">
          {type === "image" && (
            <img
              src={url}
              alt={name || "attachment"}
              style={{ transform: `scale(${scale})`, transformOrigin: "center", transition: "transform 0.2s" }}
              className="max-w-full max-h-[85vh] object-contain select-none"
              draggable={false}
            />
          )}
          {type === "video" && (
            <video controls autoPlay className="max-w-full max-h-[85vh]" src={url}>
              Your browser does not support video.
            </video>
          )}
          {type === "audio" && (
            <div className="p-8 w-full flex items-center justify-center">
              <audio controls autoPlay src={url} className="w-full max-w-md" />
            </div>
          )}
          {!["image", "video", "audio"].includes(type) && (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-3">Preview not available</p>
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />Download
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
