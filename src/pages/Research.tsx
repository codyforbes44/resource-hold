import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, FlaskConical, Cpu, Layers, Rocket } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Milestone {
  id: string;
  phase: number;
  phase_title: string;
  milestone_title: string;
  description: string;
  status: string;
  notes: string;
  sort_order: number;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", className: "bg-primary/20 text-primary" },
  completed: { label: "Completed", className: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
  blocked: { label: "Blocked", className: "bg-destructive/20 text-destructive" },
};

const PHASE_ICONS = [FlaskConical, Cpu, Layers, Rocket];

const Research = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  const fetchMilestones = useCallback(async () => {
    const { data, error } = await supabase
      .from("research_milestones")
      .select("*")
      .order("phase")
      .order("sort_order");
    if (!error && data) setMilestones(data as Milestone[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchMilestones();
  }, [isAdmin, fetchMilestones]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("research_milestones")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    }
  };

  const saveNotes = async (id: string) => {
    const notes = editingNotes[id];
    if (notes === undefined) return;
    const { error } = await supabase
      .from("research_milestones")
      .update({ notes })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, notes } : m)));
      setEditingNotes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast({ title: "Saved", description: "Notes updated." });
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  // Group by phase
  const phases = Array.from(new Set(milestones.map((m) => m.phase))).sort();

  return (
    <AppShell title="AGI Research Tracker" badge={<Badge variant="secondary">Admin</Badge>}>
      <div className="mx-auto max-w-4xl space-y-6">
        {phases.map((phase) => {
          const phaseMilestones = milestones.filter((m) => m.phase === phase);
          const completed = phaseMilestones.filter((m) => m.status === "completed").length;
          const total = phaseMilestones.length;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          const PhaseIcon = PHASE_ICONS[(phase - 1) % PHASE_ICONS.length];

          return (
            <Card key={phase} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <PhaseIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      Phase {phase}: {phaseMilestones[0]?.phase_title}
                    </CardTitle>
                    <div className="mt-2 flex items-center gap-3">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {completed}/{total} ({pct}%)
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Accordion type="multiple">
                  {phaseMilestones.map((m) => {
                    const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.not_started;
                    return (
                      <AccordionItem key={m.id} value={m.id}>
                        <AccordionTrigger className="hover:no-underline gap-2">
                          <div className="flex items-center gap-2 text-left flex-1">
                            <span className="text-sm font-medium">{m.milestone_title}</span>
                            <Badge className={cfg.className} variant="outline">
                              {cfg.label}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pl-1">
                            <p className="text-sm text-muted-foreground">{m.description}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">Status:</span>
                              <Select value={m.status} onValueChange={(v) => updateStatus(m.id, v)}>
                                <SelectTrigger className="h-8 w-40 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(STATUS_CONFIG).map(([val, c]) => (
                                    <SelectItem key={val} value={val} className="text-xs">
                                      {c.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <span className="text-xs font-medium">Notes:</span>
                              <Textarea
                                className="min-h-[60px] text-xs"
                                placeholder="Add progress notes..."
                                value={editingNotes[m.id] ?? m.notes}
                                onChange={(e) =>
                                  setEditingNotes((prev) => ({ ...prev, [m.id]: e.target.value }))
                                }
                              />
                              {editingNotes[m.id] !== undefined && editingNotes[m.id] !== m.notes && (
                                <Button size="sm" className="h-7 text-xs" onClick={() => saveNotes(m.id)}>
                                  <Save className="mr-1 h-3 w-3" /> Save Notes
                                </Button>
                              )}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
};

export default Research;
