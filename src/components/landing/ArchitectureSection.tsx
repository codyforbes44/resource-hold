import { motion } from "framer-motion";
import SectionWrapper from "./SectionWrapper";
import SectionHeader from "./SectionHeader";
import { Cpu, Code, Rocket, Terminal, Layers } from "lucide-react";

const STACK_LAYERS = [
  {
    label: "Application Layer",
    name: "> gClaw",
    desc: "Unified platform — chat UI, agent management, voice agents, model switching. The single pane of glass for your AI stack.",
    icon: Rocket,
    colorVar: "--gclaw-green",
    badge: "You Are Here",
  },
  {
    label: "Orchestration Layer",
    name: "OpenClaw + Claw",
    desc: "Agent coordination protocol, tool use, multi-agent collaboration, task decomposition, and plugin ecosystem.",
    icon: Layers,
    colorVar: "--gclaw-blue",
    badge: "Open Source",
  },
  {
    label: "Training & Inference Layer",
    name: "NVIDIA NeMo",
    desc: "Model fine-tuning, evaluation, and deployment pipeline. Enterprise-grade training on any scale.",
    icon: Cpu,
    colorVar: "--gclaw-yellow",
    badge: "Enterprise",
  },
  {
    label: "Edge / Lightweight Runtime",
    name: "noclaw",
    desc: "Minimal C-based autonomous agent for edge devices, IoT, and resource-constrained environments. ~88KB footprint.",
    icon: Terminal,
    colorVar: "--gclaw-red",
    badge: "Minimal",
  },
];

const ArchitectureSection = () => {
  return (
    <SectionWrapper id="architecture">
      <SectionHeader description="Four layers, one unified stack. From datacenter GPUs to edge microcontrollers — gClaw orchestrates the full AI agent lifecycle.">
        Stack <span className="text-gradient-brand">Architecture</span>
        <span className="ml-0.5 inline-block w-[2px] h-[1.1em] bg-primary align-middle animate-[blink_1s_step-end_infinite]" />
      </SectionHeader>

      <div className="mx-auto mt-16 max-w-3xl space-y-0">
        {STACK_LAYERS.map((layer, i) => (
          <motion.div
            key={layer.name}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.12 }}
            className="relative"
          >
            {/* Connector line */}
            {i < STACK_LAYERS.length - 1 && (
              <div className="absolute left-8 top-full z-10 h-6 w-px border-l-2 border-dashed border-border/60" />
            )}

            <div
              className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:-translate-y-0.5"
              style={{
                borderLeftWidth: "3px",
                borderLeftColor: `hsl(var(${layer.colorVar}))`,
              }}
            >
              {/* Background layer number */}
              <div className="absolute -right-2 -top-2 font-display text-7xl font-black text-muted/10 select-none">
                {i + 1}
              </div>

              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: `hsl(var(${layer.colorVar}) / 0.12)`,
                  }}
                >
                  <layer.icon
                    className="h-6 w-6"
                    style={{ color: `hsl(var(${layer.colorVar}))` }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {layer.label}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: `hsl(var(${layer.colorVar}) / 0.15)`,
                        color: `hsl(var(${layer.colorVar}))`,
                      }}
                    >
                      {layer.badge}
                    </span>
                  </div>
                  <h3 className="mt-1 font-display text-xl font-bold">
                    {layer.name}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {layer.desc}
                  </p>
                </div>
              </div>

              {/* Flow arrow indicator */}
              {i < STACK_LAYERS.length - 1 && (
                <div className="absolute bottom-0 left-8 translate-y-1/2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-card border border-border/60">
                  <svg width="10" height="10" viewBox="0 0 10 10" className="text-muted-foreground">
                    <path d="M5 2 L5 8 M2.5 5.5 L5 8 L7.5 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>

            {/* Spacer for connector */}
            {i < STACK_LAYERS.length - 1 && <div className="h-6" />}
          </motion.div>
        ))}
      </div>

      {/* Bottom summary */}
      <div className="mx-auto mt-12 max-w-2xl text-center">
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">&gt; gClaw</span> unifies these layers into a single deployable stack — 
          from <span style={{ color: "hsl(var(--gclaw-yellow))" }}>training</span> to{" "}
          <span style={{ color: "hsl(var(--gclaw-blue))" }}>orchestration</span> to{" "}
          <span style={{ color: "hsl(var(--gclaw-red))" }}>edge execution</span>.
        </p>
      </div>
    </SectionWrapper>
  );
};

export default ArchitectureSection;
