import { useState } from "react";
import AttachmentLightbox from "./AttachmentLightbox";

interface Props {
  url: string;
  type: string;
  name?: string | null;
}

export default function ChatAttachmentView({ url, type, name }: Props) {
  const [open, setOpen] = useState(false);

  const trigger = (() => {
    if (type === "image") {
      return (
        <button type="button" onClick={() => setOpen(true)} className="block mt-1 cursor-zoom-in">
          <img
            src={url}
            alt={name || "attachment"}
            className="max-w-full max-h-64 rounded-lg object-cover hover:opacity-90 transition-opacity"
          />
        </button>
      );
    }
    if (type === "video") {
      return (
        <button type="button" onClick={() => setOpen(true)} className="block mt-1 w-full text-left">
          <video
            className="max-w-full max-h-64 rounded-lg pointer-events-none"
            src={url}
            preload="metadata"
          />
          <span className="text-[10px] underline opacity-70">Tap to play full screen</span>
        </button>
      );
    }
    if (type === "audio") {
      return (
        <div className="mt-1">
          <audio controls src={url} className="max-w-full" />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[10px] underline opacity-70 mt-0.5"
          >
            Open
          </button>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs underline mt-1 block text-left"
      >
        {name || "Attachment"}
      </button>
    );
  })();

  return (
    <>
      {trigger}
      <AttachmentLightbox open={open} onClose={() => setOpen(false)} url={url} type={type} name={name} />
    </>
  );
}
