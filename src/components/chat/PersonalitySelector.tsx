import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, Code, BarChart3, BookOpen, Shield, Heart, Eye,
  Lightbulb, Crosshair, User as UserIcon,
} from "lucide-react";

export type Personality = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  is_default: boolean;
  sort_order: number;
};

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Sparkles, Code, BarChart3, BookOpen, Shield, Heart, Eye,
  Lightbulb, Crosshair, User: UserIcon,
};

function getIcon(iconName: string) {
  return ICON_MAP[iconName] || Sparkles;
}

interface PersonalitySelectorProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function PersonalitySelector({ selectedId, onSelect }: PersonalitySelectorProps) {
  const [personalities, setPersonalities] = useState<Personality[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.from("personalities").select("*").order("sort_order")
      .then(({ data }) => { if (data) setPersonalities(data as Personality[]); });
  }, []);

  const selected = personalities.find((p) => p.id === selectedId) || personalities.find((p) => p.is_default);
  const SelectedIcon = selected ? getIcon(selected.icon) : Sparkles;

  if (personalities.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 min-h-[44px] max-w-[140px] md:max-w-[180px]">
          <SelectedIcon className="h-4 w-4 shrink-0" />
          <span className="truncate text-xs">{selected?.name || "Personality"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <ScrollArea className="max-h-72">
          <div className="space-y-1">
            {personalities.map((p) => {
              const Icon = getIcon(p.icon);
              const isSelected = p.id === (selectedId || selected?.id);
              return (
                <button
                  key={p.id}
                  className={`flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors min-h-[44px] ${
                    isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent"
                  }`}
                  onClick={() => { onSelect(p.id); setOpen(false); }}
                >
                  <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{p.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
