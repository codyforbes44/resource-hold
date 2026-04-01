import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ChatAttachment } from "@/lib/chat-attachments";

interface ChatMessageAttachmentsProps {
  attachments: ChatAttachment[];
}

const ChatMessageAttachments = ({ attachments }: ChatMessageAttachmentsProps) => {
  const [activeImage, setActiveImage] = useState<ChatAttachment | null>(null);

  if (attachments.length === 0) return null;

  return (
    <>
      <div className="mb-2 flex flex-wrap gap-2">
        {attachments.map((attachment, index) => {
          if (attachment.type === "image") {
            return (
              <button
                key={`${attachment.url}-${index}`}
                type="button"
                onClick={() => setActiveImage(attachment)}
                className="h-24 w-24 overflow-hidden rounded-lg border border-border bg-muted/40 transition-opacity hover:opacity-90"
              >
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            );
          }

          return (
            <div
              key={`${attachment.url}-${index}`}
              className="w-full max-w-[240px] overflow-hidden rounded-lg border border-border bg-muted/40"
            >
              <video
                src={attachment.url}
                controls
                preload="metadata"
                className="aspect-video w-full bg-muted"
              />
              <div className="space-y-2 p-3 text-xs">
                <p className="truncate font-medium text-foreground">{attachment.name}</p>
                <div className="flex gap-3">
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Open
                  </a>
                  <a
                    href={attachment.url}
                    download={attachment.name}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Download
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={Boolean(activeImage)} onOpenChange={(open) => !open && setActiveImage(null)}>
        <DialogContent className="max-w-4xl border-border bg-background p-3">
          <DialogTitle className="sr-only">Attachment preview</DialogTitle>
          {activeImage && (
            <img
              src={activeImage.url}
              alt={activeImage.name}
              className="max-h-[80vh] w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatMessageAttachments;