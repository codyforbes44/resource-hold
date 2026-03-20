export type ModelGroup = {
  label: string;
  models: { value: string; label: string }[];
};

export const ALL_MODEL_GROUPS: ModelGroup[] = [
  {
    label: "Google",
    models: [
      { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
      { value: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
    ],
  },
  {
    label: "OpenAI",
    models: [
      { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
      { value: "openai/gpt-5", label: "GPT-5" },
      { value: "openai/gpt-5-nano", label: "GPT-5 Nano" },
      { value: "openai/gpt-5.2", label: "GPT-5.2" },
    ],
  },
  {
    label: "Zephel",
    models: [
      { value: "zephel/zephel", label: "Zephel" },
      { value: "zephel/zephel-pro", label: "Zephel Pro" },
      { value: "zephel/zephel-fast", label: "Zephel Fast" },
    ],
  },
  {
    label: "Anthropic",
    models: [
      { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
      { value: "anthropic/claude-opus-4", label: "Claude Opus 4" },
      { value: "anthropic/claude-haiku-3.5", label: "Claude Haiku 3.5" },
    ],
  },
];

export const MODEL_SKILL_COMPAT: Record<string, string[]> = {
  "google/gemini-3-flash-preview": ["web_search", "code_interpreter", "image_generation", "knowledge_base", "deep_research", "memory", "browser"],
  "google/gemini-2.5-flash": ["web_search", "code_interpreter", "image_generation", "knowledge_base", "deep_research", "memory", "browser"],
  "google/gemini-2.5-pro": ["web_search", "code_interpreter", "image_generation", "knowledge_base", "deep_research", "memory", "browser"],
  "google/gemini-2.5-flash-lite": ["web_search", "code_interpreter"],
  "google/gemini-3.1-pro-preview": ["web_search", "code_interpreter", "image_generation", "knowledge_base", "deep_research", "memory", "browser"],
  "openai/gpt-5-mini": ["web_search", "code_interpreter", "knowledge_base", "deep_research", "memory", "browser"],
  "openai/gpt-5": ["web_search", "code_interpreter", "knowledge_base", "deep_research", "memory", "browser"],
  "openai/gpt-5-nano": ["web_search", "code_interpreter"],
  "openai/gpt-5.2": ["web_search", "code_interpreter", "knowledge_base", "deep_research", "memory", "browser"],
  "zephel/zephel": ["web_search", "code_interpreter", "knowledge_base", "deep_research", "memory", "browser"],
  "zephel/zephel-pro": ["web_search", "code_interpreter", "knowledge_base", "deep_research", "memory", "browser"],
  "zephel/zephel-fast": ["web_search", "code_interpreter"],
  "anthropic/claude-sonnet-4": ["web_search", "code_interpreter", "image_generation", "knowledge_base", "deep_research", "memory", "browser"],
  "anthropic/claude-opus-4": ["web_search", "code_interpreter", "image_generation", "knowledge_base", "deep_research", "memory", "browser"],
  "anthropic/claude-haiku-3.5": ["web_search", "code_interpreter"],
};

export const SKILL_LABELS: Record<string, string> = {
  web_search: "Web Search",
  code_interpreter: "Code Interpreter",
  image_generation: "Image Generation",
  knowledge_base: "Knowledge Base",
  deep_research: "Deep Research",
  memory: "Memory",
  browser: "Browser Control",
};

export function getIncompatibleSkills(modelValue: string, activeSkillIds: string[]): string[] {
  const supported = MODEL_SKILL_COMPAT[modelValue] || [];
  return activeSkillIds.filter((skillId) => !supported.includes(skillId));
}

export function getFilteredModelGroups(
  allowedModels: string[] | null,
  activeSkillIds: string[]
) {
  return ALL_MODEL_GROUPS
    .map((group) => ({
      ...group,
      models: group.models
        .filter((m) => !allowedModels || allowedModels.includes(m.value))
        .map((m) => {
          const incompatibleSkills = getIncompatibleSkills(m.value, activeSkillIds);
          return {
            ...m,
            incompatibleSkills,
            isDisabled: incompatibleSkills.length > 0,
          };
        }),
    }))
    .filter((group) => group.models.length > 0);
}
