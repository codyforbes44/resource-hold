import { Check } from "lucide-react";
import SectionWrapper from "./SectionWrapper";
import SectionHeader from "./SectionHeader";
import { MILESTONES } from "@/constants/landing";

const RoadmapTimeline = () => {
  return (
    <SectionWrapper id="roadmap">
      <SectionHeader description="What's shipped, what's in progress, and what's next.">
        <span className="text-gradient-brand">Roadmap</span>
      </SectionHeader>

      <div className="mx-auto mt-16 max-w-2xl">
        <div className="relative space-y-8 border-l-2 border-border/50 pl-8">
          {MILESTONES.map((m) => (
            <div key={m.phase} className="relative">
              <div
                className={`absolute -left-[calc(2rem+5px)] top-1 h-3 w-3 rounded-full border-2 ${
                  m.completed
                    ? "border-gclaw-green bg-gclaw-green"
                    : m.active
                    ? "border-primary bg-primary animate-pulse-glow"
                    : "border-muted-foreground/40 bg-background"
                }`}
              />
              <div className="flex items-baseline gap-3">
                <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                  m.completed
                    ? "bg-gclaw-green/10 text-gclaw-green"
                    : "bg-primary/10 text-primary"
                }`}>
                  {m.phase}
                </span>
                <span className="text-xs text-muted-foreground">{m.date}</span>
                {m.completed && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gclaw-green">
                    <Check className="h-3 w-3" /> Shipped
                  </span>
                )}
                {m.active && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    In Progress
                  </span>
                )}
              </div>
              <h3 className="mt-2 font-display text-lg font-semibold">{m.title}</h3>
              <ul className="mt-2 space-y-1">
                {m.items.map((item) => (
                  <li key={item} className="text-sm text-muted-foreground">• {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};

export default RoadmapTimeline;
