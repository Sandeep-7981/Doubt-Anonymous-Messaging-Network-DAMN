import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Paperclip, Image as ImageIcon, Video, X } from "lucide-react";
import { toast } from "sonner";

export type StagedAttachment = {
  file: Blob;
  filename: string;
  type: "image" | "video" | "audio";
  previewUrl: string;
};

interface Props {
  staged: StagedAttachment | null;
  onStage: (a: StagedAttachment | null) => void;
  disabled?: boolean;
}

export default function ChatAttachment({ staged, onStage, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    return () => {
      if (staged?.previewUrl) URL.revokeObjectURL(staged.previewUrl);
    };
  }, [staged?.previewUrl]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File too large (max 25MB)");
      return;
    }
    const type: StagedAttachment["type"] = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
      ? "video"
      : "audio";
    onStage({ file, filename: file.name, type, previewUrl: URL.createObjectURL(file) });
    e.target.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => ev.data.size > 0 && chunksRef.current.push(ev.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        onStage({ file: blob, filename: `voice-${Date.now()}.webm`, type: "audio", previewUrl: url });
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      mediaRecRef.current = rec;
      setRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    mediaRecRef.current = null;
    setRecording(false);
  };

  if (staged) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 bg-muted rounded-md border border-border">
        {staged.type === "image" && <ImageIcon className="w-4 h-4 text-primary" />}
        {staged.type === "video" && <Video className="w-4 h-4 text-primary" />}
        {staged.type === "audio" && <Mic className="w-4 h-4 text-primary" />}
        <span className="text-xs truncate flex-1 max-w-[120px]">{staged.filename}</span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onStage(null)}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        size="icon"
        variant="ghost"
        type="button"
        disabled={disabled || recording}
        onClick={() => fileRef.current?.click()}
        title="Attach file"
      >
        <Paperclip className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant={recording ? "destructive" : "ghost"}
        type="button"
        disabled={disabled}
        onClick={recording ? stopRecording : startRecording}
        title={recording ? "Stop recording" : "Record voice"}
      >
        {recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </Button>
    </div>
  );
}
