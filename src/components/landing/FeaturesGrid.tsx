import { Bot, Brain, Layers, Lock, Workflow, Headphones } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Multi-Provider Intelligence",
    desc: "Switch between Google Gemini, OpenAI, and NVIDIA NIM models with a single toggle. Best-in-class model routing.",
  },
  {
    icon: Bot,
    title: "Autonomous Agent Workflows",
    desc: "Build complex multi-step agent pipelines with conditional logic, tool use, and human-in-the-loop approval gates.",
  },
  {
    icon: Headphones,
    title: "Voice Agent Engine",
    desc: "Real-time conversational voice agents with ElevenLabs integration. Sub-200ms latency for natural dialogue.",
  },
  {
    icon: Lock,
    title: "Zero-Trust Security",
    desc: "End-to-end encryption, SOC 2 compliance-ready architecture, role-based access control, and audit logging.",
  },
  {
    icon: Layers,
    title: "NeMo Model Pipeline",
    desc: "Fine-tune, evaluate, and deploy custom models using NVIDIA NeMo's training framework — directly from gBot.",
  },
  {
    icon: Workflow,
    title: "OpenClaw Orchestration",
    desc: "Leverage the Claw ecosystem's agent coordination protocol for multi-agent collaboration and task decomposition.",
  },
];

const FeaturesGrid = () => {
  return (
    <section id="features" className="py-20 md:py-28 border-t border-border/30">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Built for <span className="text-gradient-green">Production</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every feature designed for enterprise deployment — from model selection to security compliance.
          </p>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border/50 bg-border/50 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card p-8 transition-colors hover:bg-accent/50"
            >
              <f.icon className="mb-4 h-6 w-6 text-primary" />
              <h3 className="font-display text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
