import { Cpu, Code, Rocket } from "lucide-react";

const layers = [
  {
    icon: Cpu,
    title: "Chip Layer",
    subtitle: "NVIDIA · AMD · Intel",
    desc: "gBot is hardware-agnostic by design. Deploy on any GPU architecture — from datacenter H100s to edge devices.",
    color: "text-primary",
  },
  {
    icon: Code,
    title: "Middleware Layer",
    subtitle: "NeMo · OpenClaw · CUDA",
    desc: "The orchestration backbone — combining NeMo's training pipeline with OpenClaw's agent coordination protocol.",
    color: "text-gbot-blue",
  },
  {
    icon: Rocket,
    title: "Application Layer",
    subtitle: "gBot Platform",
    desc: "Where it all comes together — a production-ready interface for building, deploying, and managing AI agents.",
    color: "text-primary",
  },
];

const WhyItMatters = () => {
  return (
    <section className="border-t border-border/30 py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Why <span className="text-gradient-green">gBot</span> Matters
          </h2>
          <p className="mt-4 text-muted-foreground">
            A full-stack AI agent strategy across three critical layers — from silicon to software.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-3">
          {layers.map((l, i) => (
            <div
              key={l.title}
              className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-8 transition-all hover:border-primary/30"
            >
              <div className="absolute -right-4 -top-4 text-8xl font-display font-black text-muted/20">
                {i + 1}
              </div>
              <l.icon className={`mb-4 h-8 w-8 ${l.color}`} />
              <h3 className="font-display text-lg font-bold">{l.title}</h3>
              <p className="mt-1 text-xs font-medium text-primary">{l.subtitle}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{l.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyItMatters;
