export type GClawModel = {
  value: string;
  label: string;
  description: string;
};

export const GCLAW_MODELS: GClawModel[] = [
  { value: "gclaw/default", label: "gClaw", description: "Balanced all-rounder — best for everyday tasks" },
  { value: "gclaw/flash", label: "gClaw Flash", description: "Fast and efficient — optimized for speed" },
  { value: "gclaw/nano", label: "gClaw Nano", description: "Lightweight and instant — quick answers" },
  { value: "gclaw/thinking", label: "gClaw Thinking", description: "Deep reasoning — thorough analysis" },
];

/** Backend model mapping (reference only — actual routing in edge function) */
export const MODEL_BACKEND_MAP: Record<string, string> = {
  "gclaw/default": "google/gemini-3-flash-preview",
  "gclaw/flash": "google/gemini-2.5-flash",
  "gclaw/nano": "google/gemini-2.5-flash-lite",
  "gclaw/thinking": "google/gemini-2.5-pro",
};

export const ALL_SKILLS = [
  "web_search", "code_interpreter", "image_generation",
  "knowledge_base", "deep_research", "memory", "browser",
] as const;

export const SKILL_LABELS: Record<string, string> = {
  web_search: "Web Search",
  code_interpreter: "Code Interpreter",
  image_generation: "Image Generation",
  knowledge_base: "Knowledge Base",
  deep_research: "Deep Research",
  memory: "Memory",
  browser: "Browser Control",
};

export const DEFAULT_MODEL = "gclaw/default";
export const GUEST_DEFAULT_MODEL = "gclaw/nano";
