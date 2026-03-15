import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Github, Zap } from "lucide-react";
import heroBg from "@/assets/hero-bg.png";
import { HERO_STATS } from "@/constants/landing";

const AnimatedCounter = ({ value, label }: { value: string; label: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("0");
  const numericPart = parseInt(value);
  const suffix = value.replace(/\d/g, "");

  useEffect(() => {
    if (!isInView) return;
    if (isNaN(numericPart)) {
      setDisplay(value);
      return;
    }
    let current = 0;
    const step = Math.max(1, Math.floor(numericPart / 20));
    const interval = setInterval(() => {
      current += step;
      if (current >= numericPart) {
        setDisplay(value);
        clearInterval(interval);
      } else {
        setDisplay(`${current}${suffix}`);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [isInView, numericPart, suffix, value]);

  return (
    <div ref={ref}>
      <div className="font-display text-3xl font-bold text-primary">{display}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
};

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-44 md:pb-32">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 -z-10">
        <img src={heroBg} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-gclaw-red/5 blur-[100px]" />
      </div>

      <div className="container text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-cycle-brand bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
        >
          <Zap className="h-3.5 w-3.5" />
          Open-Source · Hardware Agnostic · Enterprise Ready
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto max-w-4xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-7xl"
        >
          Enterprise AI Agents,{" "}
          <span className="text-cycle-brand">Redefined</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl"
        >
          gClaw is a multi-provider, hardware-agnostic AI agent platform built on NVIDIA NeMo
          and the OpenClaw ecosystem. Deploy voice, multimodal, and autonomous agents with
          enterprise-grade security — on any hardware.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <Button size="lg" className="glow-cycle-brand gap-2 px-8 text-base btn-hover-glow" asChild>
            <Link to="/chat">
              Launch gClaw
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="gap-2 border-border px-8 text-base">
            <Github className="h-4 w-4" />
            View on GitHub
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-8 border-t border-border/50 pt-10"
        >
          {HERO_STATS.map((stat) => (
            <AnimatedCounter key={stat.label} value={stat.value} label={stat.label} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
