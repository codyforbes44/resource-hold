import SectionWrapper from "./SectionWrapper";
import SectionHeader from "./SectionHeader";
import { LAYERS } from "@/constants/landing";

const WhyItMatters = () => {
  return (
    <SectionWrapper>
      <SectionHeader description="A full-stack AI agent strategy across three critical layers — from silicon to software.">
        Why <span className="text-gradient-brand">gClaw</span> Matters
      </SectionHeader>

      <div className="mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-3">
        {LAYERS.map((l, i) => (
          <div
            key={l.title}
            className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-8 transition-all duration-300 hover:border-primary/30 hover:-translate-y-1"
          >
            <div className="absolute -right-4 -top-4 text-8xl font-display font-black text-muted/20 transition-transform duration-300 group-hover:scale-110">
              {i + 1}
            </div>
            <l.icon className={`mb-4 h-8 w-8 ${l.color}`} />
            <h3 className="font-display text-lg font-bold">{l.title}</h3>
            <p className="mt-1 text-xs font-medium text-primary">{l.subtitle}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{l.desc}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
};

export default WhyItMatters;
