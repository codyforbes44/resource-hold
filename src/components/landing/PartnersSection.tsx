import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import SectionWrapper from "./SectionWrapper";
import SectionHeader from "./SectionHeader";
import { CAPABILITIES } from "@/constants/landing";

const PartnersSection = () => {
  return (
    <SectionWrapper id="platform">
      <SectionHeader description="Every capability listed below is shipped and working in the current release.">
        Platform <span className="text-gradient-brand">Capabilities</span>
        <span className="ml-0.5 inline-block w-[2px] h-[1.1em] bg-primary align-middle animate-[blink_1s_step-end_infinite]" />
      </SectionHeader>

      <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((cap) => (
          <div
            key={cap.title}
            className="group rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:glow-brand hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                <cap.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="rounded-full border border-gclaw-green/30 bg-gclaw-green/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gclaw-green">
                {cap.badge}
              </span>
            </div>
            <h3 className="font-display text-base font-semibold">{cap.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{cap.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Button size="lg" className="glow-cycle-brand gap-2" asChild>
          <Link to="/auth">
            Try It Now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </SectionWrapper>
  );
};

export default PartnersSection;
