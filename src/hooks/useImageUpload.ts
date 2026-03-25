import { supabase } from "@/integrations/supabase/client";
import type { AttachedImage } from "@/components/chat/ChatInput";
import type { User } from "@supabase/supabase-js";

/**
 * Upload attached images to storage (authenticated) or convert to base64 (guest).
 * Returns array of public URLs or data URIs.
 */
export async function uploadChatImages(
  images: AttachedImage[],
  user: User | null,
  conversationId: string
): Promise<string[]> {
  if (images.length === 0) return [];

  if (user) {
    const urls: string[] = [];
    for (const img of images) {
      const timestamp = Date.now();
      const safeName = img.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${conversationId}/${timestamp}-${safeName}`;
      const { error } = await supabase.storage
        .from("chat_images")
        .upload(path, img.file, { contentType: img.file.type, upsert: false });
      if (error) {
        console.error("Image upload error:", error);
        continue;
      }
      const { data: urlData } = supabase.storage.from("chat_images").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  } else {
    // Guest: convert to base64 data URIs
    const promises = images.map(
      (img) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve("");
          reader.readAsDataURL(img.file);
        })
    );
    return (await Promise.all(promises)).filter(Boolean);
  }
}
