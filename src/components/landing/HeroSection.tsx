import { Button } from "@/components/ui/button";
import { ArrowRight, Github, Zap } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-44 md:pb-32">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-gbot-blue/5 blur-[100px]" />
      </div>

      <div className="container text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Zap className="h-3.5 w-3.5" />
          Open-Source · Hardware Agnostic · Enterprise Ready
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-4xl font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl">
          Enterprise AI Agents,{" "}
          <span className="text-gradient-green">Redefined</span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          gBot is a multi-provider, hardware-agnostic AI agent platform built on NVIDIA NeMo 
          and the OpenClaw ecosystem. Deploy voice, multimodal, and autonomous agents with 
          enterprise-grade security — on any hardware.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button size="lg" className="glow-green gap-2 px-8 text-base">
            Launch gBot
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" className="gap-2 border-border px-8 text-base">
            <Github className="h-4 w-4" />
            View on GitHub
          </Button>
        </div>

        {/* Stats */}
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-8 border-t border-border/50 pt-10">
          {[
            { value: "3+", label: "AI Providers" },
            { value: "∞", label: "Hardware Support" },
            { value: "100%", label: "Open Source" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="font-display text-3xl font-bold text-primary">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
