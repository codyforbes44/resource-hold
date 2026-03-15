import SectionWrapper from "./SectionWrapper";
import SectionHeader from "./SectionHeader";
import { ECOSYSTEM_VARIANTS } from "@/constants/landing";

const EcosystemSection = () => {
  return (
    <SectionWrapper id="ecosystem">
      <SectionHeader description="A family of products and community resources built around the gClaw platform.">
        The &gt; gClaw <span className="text-gradient-brand">Ecosystem</span><span className="ml-0.5 inline-block w-[2px] h-[1.1em] bg-primary align-middle animate-[blink_1s_step-end_infinite]" />
      </SectionHeader>

      <div className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-2">
        {ECOSYSTEM_VARIANTS.map((v) => (
          <div
            key={v.name}
            className="group rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:glow-brand hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                <v.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                {v.badge}
              </span>
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">{v.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
};

export default EcosystemSection;
