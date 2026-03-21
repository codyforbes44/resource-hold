import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Sparkles, Code, BarChart3, BookOpen, Shield, Heart, Eye,
  Lightbulb, Crosshair, Trash2, Plus, Pencil, Save, X,
  User as UserIcon,
} from "lucide-react";

type Personality = {
  id: string;
  name: string;
  slug: string;
  description: string;
  system_prompt_modifier: string;
  icon: string;
  is_default: boolean;
  sort_order: number;
};

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Sparkles, Code, BarChart3, BookOpen, Shield, Heart, Eye,
  Lightbulb, Crosshair, User: UserIcon,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

function getIcon(iconName: string) {
  return ICON_MAP[iconName] || Sparkles;
}

interface PersonalitiesTabProps {
  personalities: Personality[];
  onAction: (action: string, payload?: any) => Promise<void>;
  onRefresh: () => void;
}

const PersonalitiesTab = ({ personalities, onAction, onRefresh }: PersonalitiesTabProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", system_prompt_modifier: "", icon: "Sparkles", is_default: false });
  const [saving, setSaving] = useState(false);

  const startEdit = (p: Personality) => {
    setEditingId(p.id);
    setCreating(false);
    setForm({ name: p.name, slug: p.slug, description: p.description, system_prompt_modifier: p.system_prompt_modifier, icon: p.icon, is_default: p.is_default });
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setForm({ name: "", slug: "", description: "", system_prompt_modifier: "", icon: "Sparkles", is_default: false });
  };

  const cancel = () => { setEditingId(null); setCreating(false); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) { toast.error("Name and slug are required"); return; }
    setSaving(true);
    try {
      if (creating) {
        await onAction("create_personality", form);
        toast.success("Personality created");
      } else if (editingId) {
        await onAction("update_personality", { id: editingId, ...form });
        toast.success("Personality updated");
      }
      cancel();
      onRefresh();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await onAction("delete_personality", { id });
      toast.success("Personality deleted");
      onRefresh();
    } catch (err: any) { toast.error(err.message); }
  };

  const renderForm = () => (
    <div className="rounded-lg border border-primary/30 bg-card p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }))} className="min-h-[44px]" />
        <Input placeholder="Slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className="min-h-[44px] font-mono text-xs" />
      </div>
      <Input placeholder="Short description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="min-h-[44px]" />
      <Textarea placeholder="System prompt modifier..." value={form.system_prompt_modifier} onChange={(e) => setForm((f) => ({ ...f, system_prompt_modifier: e.target.value }))} rows={5} />
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-muted-foreground">Icon:</span>
        {ICON_OPTIONS.map((ic) => {
          const Ic = ICON_MAP[ic];
          return (
            <button key={ic} onClick={() => setForm((f) => ({ ...f, icon: ic }))} className={`p-1.5 rounded-md ${form.icon === ic ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-accent"}`}>
              <Ic className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch checked={form.is_default} onCheckedChange={(v) => setForm((f) => ({ ...f, is_default: v }))} />
          <span className="text-xs text-muted-foreground">Default personality</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={cancel} className="min-h-[44px]"><X className="h-4 w-4 mr-1" /> Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="min-h-[44px]"><Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI Personalities ({personalities.length})</h3>
        <Button size="sm" onClick={startCreate} className="min-h-[44px]"><Plus className="h-4 w-4 mr-1" /> New</Button>
      </div>

      {creating && renderForm()}

      <ScrollArea className="h-[calc(100vh-18rem)]">
        <div className="space-y-2">
          {personalities.map((p) => {
            const Icon = getIcon(p.icon);
            if (editingId === p.id) return <div key={p.id}>{renderForm()}</div>;
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{p.name}</p>
                    {p.is_default && <Badge variant="secondary" className="text-[10px] h-4">Default</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{p.system_prompt_modifier.length} chars prompt</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={() => startEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PersonalitiesTab;
