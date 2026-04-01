import { supabase } from "@/integrations/supabase/client";
import type { ChatAttachment, PendingAttachment } from "@/lib/chat-attachments";
import type { User } from "@supabase/supabase-js";

/**
 * Upload attached files to storage (authenticated) or convert guest images to data URIs.
 */
export async function uploadChatAttachments(
  attachments: PendingAttachment[],
  user: User | null,
  conversationId: string
): Promise<ChatAttachment[]> {
  if (attachments.length === 0) return [];

  if (user) {
    const uploaded: ChatAttachment[] = [];
    for (const attachment of attachments) {
      const timestamp = Date.now();
      const safeName = attachment.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${conversationId}/${timestamp}-${safeName}`;
      const { error } = await supabase.storage
        .from("chat_images")
        .upload(path, attachment.file, { contentType: attachment.file.type, upsert: false });
      if (error) {
        console.error("Attachment upload error:", error);
        continue;
      }
      const { data: urlData } = supabase.storage.from("chat_images").getPublicUrl(path);
      uploaded.push({
        type: attachment.type,
        url: urlData.publicUrl,
        name: attachment.name,
        mimeType: attachment.mimeType,
      });
    }
    return uploaded;
  } else {
    const promises = attachments
      .filter((attachment) => attachment.type === "image")
      .map(
        (attachment) =>
          new Promise<ChatAttachment | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({
            type: attachment.type,
            url: reader.result as string,
            name: attachment.name,
            mimeType: attachment.mimeType,
          });
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(attachment.file);
        })
      );
    return (await Promise.all(promises)).filter((attachment): attachment is ChatAttachment => Boolean(attachment));
  }
}
