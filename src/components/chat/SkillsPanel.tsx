import { useState } from "react";
import { Search, Code, ImageIcon, BookOpen, FlaskConical, X, Sparkles, Brain, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  badge: string;
  color: string;
}

const DEFAULT_SKILLS: Skill[] = [
  {
    id: "web_search",
    name: "Web Search",
    description: "Search the web for real-time information, news, and documentation. Powered by Firecrawl.",
    icon: Search,
    enabled: false,
    badge: "Firecrawl",
    color: "hsl(var(--gclaw-blue))",
  },
  {
    id: "code_interpreter",
    name: "Code Interpreter",
    description: "Write, explain, and debug code with syntax-highlighted output. Supports all major languages.",
    icon: Code,
    enabled: true,
    badge: "Built-in",
    color: "hsl(var(--gclaw-green))",
  },
  {
    id: "image_generation",
    name: "Image Generation",
    description: "Generate images from text prompts using AI. Results displayed inline in the conversation.",
    icon: ImageIcon,
    enabled: false,
    badge: "Gemini",
    color: "hsl(var(--gclaw-yellow))",
  },
  {
    id: "knowledge_base",
    name: "Knowledge Base",
    description: "Query uploaded documents and scraped web pages for grounded, context-aware answers.",
    icon: BookOpen,
    enabled: false,
    badge: "RAG",
    color: "hsl(var(--gclaw-red))",
  },
  {
    id: "deep_research",
    name: "Deep Research",
    description: "Chains web search with knowledge base for comprehensive, multi-source research answers.",
    icon: FlaskConical,
    enabled: false,
    badge: "Multi-Source",
    color: "hsl(270 70% 60%)",
  },
  {
    id: "memory",
    name: "Memory",
    description: "Remembers your preferences, context, and important details across sessions. Becomes uniquely yours over time.",
    icon: Brain,
    enabled: false,
    badge: "Persistent",
    color: "hsl(310 70% 55%)",
  },
  {
    id: "browser",
    name: "Browser Control",
    description: "Browse, scrape, and extract content from any web page. Read documentation, articles, and data directly.",
    icon: Globe,
    enabled: false,
    badge: "Firecrawl",
    color: "hsl(190 80% 45%)",
  },
];

interface SkillsPanelProps {
  open: boolean;
  onClose: () => void;
  skills: Skill[];
  onToggleSkill: (id: string) => void;
  knowledgeBasePanel?: React.ReactNode;
}

const SkillsPanel = ({ open, onClose, skills, onToggleSkill, knowledgeBasePanel }: SkillsPanelProps) => {
  if (!open) return null;

  return (
    <div className="flex w-72 flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm font-semibold">gClaw Skills</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-3">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="group rounded-lg border border-border/50 bg-background p-4 transition-all hover:border-primary/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${skill.color}20` }}
                  >
                    <skill.icon className="h-4 w-4" style={{ color: skill.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold truncate">{skill.name}</h4>
                    </div>
                    <Badge
                      variant="outline"
                      className="mt-1 text-[10px] px-1.5 py-0"
                      style={{ borderColor: `${skill.color}40`, color: skill.color }}
                    >
                      {skill.badge}
                    </Badge>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {skill.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={skill.enabled}
                  onCheckedChange={() => onToggleSkill(skill.id)}
                  className="shrink-0"
                />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {knowledgeBasePanel}

      <div className="border-t border-border p-3">
        <p className="text-[10px] text-muted-foreground text-center">
          Skills extend gClaw's capabilities via the OpenClaw plugin protocol.
        </p>
      </div>
    </div>
  );
};

export { DEFAULT_SKILLS };
export default SkillsPanel;
