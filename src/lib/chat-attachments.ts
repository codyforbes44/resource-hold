export type ChatAttachmentType = "image" | "video";

export type ChatAttachment = {
  type: ChatAttachmentType;
  url: string;
  name: string;
  mimeType: string;
};

export type PendingAttachment = {
  file: File;
  preview: string;
  type: ChatAttachmentType;
  name: string;
  mimeType: string;
};

const LEGACY_IMAGE_REGEX = /!\[image\]\(([^)]+)\)\n*/g;

export function getAttachmentType(mimeType: string): ChatAttachmentType | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "video/mp4") return "video";
  return null;
}

export function normalizeAttachments(value: unknown): ChatAttachment[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const candidate = item as Partial<ChatAttachment>;
      if (!candidate.url || !candidate.name || !candidate.mimeType) return null;

      const type = candidate.type ?? getAttachmentType(candidate.mimeType);
      if (!type) return null;

      return {
        type,
        url: String(candidate.url),
        name: String(candidate.name),
        mimeType: String(candidate.mimeType),
      } satisfies ChatAttachment;
    })
    .filter((attachment): attachment is ChatAttachment => Boolean(attachment));
}

export function extractLegacyImageAttachments(content: string): {
  content: string;
  attachments: ChatAttachment[];
} {
  const attachments: ChatAttachment[] = [];
  let match: RegExpExecArray | null;

  while ((match = LEGACY_IMAGE_REGEX.exec(content)) !== null) {
    const url = match[1];
    const name = url.split("/").pop()?.split("?")[0] || "image";
    attachments.push({
      type: "image",
      url,
      name,
      mimeType: "image/*",
    });
  }

  return {
    content: content.replace(LEGACY_IMAGE_REGEX, "").trim(),
    attachments,
  };
}

export function describeVideoAttachments(attachments: ChatAttachment[]): string {
  const videos = attachments.filter((attachment) => attachment.type === "video");
  if (videos.length === 0) return "";

  return videos
    .map(
      (video, index) =>
        `Attached video ${index + 1}: ${video.name} (${video.mimeType}). File URL: ${video.url}. The user may want analysis or editing guidance for this video.`
    )
    .join("\n");
}