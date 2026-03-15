import SectionWrapper from "./SectionWrapper";
import SectionHeader from "./SectionHeader";
import { FEATURES } from "@/constants/landing";

const FeaturesGrid = () => {
  return (
    <SectionWrapper id="features">
      <SectionHeader description="Every feature designed for enterprise deployment — from model selection to security compliance.">
        Built for <span className="text-gradient-brand">Production</span>
      </SectionHeader>

      <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border/50 bg-border/50 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="bg-card p-6 sm:p-8 transition-colors hover:bg-accent/50"
          >
            <f.icon className="mb-4 h-6 w-6 text-primary" />
            <h3 className="font-display text-base font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
};

export default FeaturesGrid;
