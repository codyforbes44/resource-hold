import { Shield, Cpu, Globe, Mic } from "lucide-react";

const pillars = [
  {
    icon: Shield,
    title: "Enterprise Security",
    desc: "Multi-layer authentication, data governance, and privacy controls built into every agent deployment.",
  },
  {
    icon: Cpu,
    title: "Hardware Agnostic",
    desc: "Run on NVIDIA, AMD, Intel, or cloud GPUs. No vendor lock-in — gBot adapts to your infrastructure.",
  },
  {
    icon: Globe,
    title: "Open-Source First",
    desc: "Built on NeMo and OpenClaw — fully transparent, community-driven, with enterprise support options.",
  },
  {
    icon: Mic,
    title: "Voice + Multimodal",
    desc: "Native voice agents, image understanding, and multimodal interactions powered by state-of-the-art models.",
  },
];

const OverviewSection = () => {
  return (
    <section id="overview" className="py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            What is <span className="text-gradient-green">gBot</span>?
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            gBot merges NVIDIA's NeMo framework for model training and inference with the 
            OpenClaw ecosystem's open-source agent orchestration — creating a unified platform 
            for building, deploying, and managing enterprise AI agents at any scale.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="group rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:glow-green"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <p.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OverviewSection;
