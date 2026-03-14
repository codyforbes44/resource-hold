import SectionWrapper from "./SectionWrapper";
import SectionHeader from "./SectionHeader";
import { PILLARS } from "@/constants/landing";

const OverviewSection = () => {
  return (
    <SectionWrapper id="overview" borderTop={false}>
      <SectionHeader description="gBot merges NVIDIA's NeMo framework for model training and inference with the OpenClaw ecosystem's open-source agent orchestration — creating a unified platform for building, deploying, and managing enterprise AI agents at any scale.">
        What is <span className="text-gradient-green">gBot</span>?
      </SectionHeader>

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((p) => (
          <div
            key={p.title}
            className="group rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:glow-green hover:-translate-y-1"
          >
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-110">
              <p.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
};

export default OverviewSection;
