import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import {
  Search, Brain, Mic, BookOpen, Globe, Zap,
  ArrowRight, Sparkles, MessageSquare,
} from "lucide-react";
import logoSrc from "@/assets/logo-gclaw.png";

const FEATURES = [
  { icon: Search, title: "Web Search", desc: "Real-time web search powered by Firecrawl for up-to-date answers.", color: "hsl(var(--gclaw-blue))" },
  { icon: BookOpen, title: "Knowledge Base", desc: "Upload docs or scrape URLs — gClaw learns your data and answers from it.", color: "hsl(var(--gclaw-green))" },
  { icon: Mic, title: "Voice Agent", desc: "Natural voice conversations with ElevenLabs-powered speech synthesis.", color: "hsl(var(--gclaw-yellow))" },
  { icon: Brain, title: "Deep Reasoning", desc: "Chain-of-thought reasoning with transparent thinking process.", color: "hsl(var(--gclaw-red))" },
  { icon: Globe, title: "Browser Control", desc: "Navigate, extract, and interact with any web page autonomously.", color: "hsl(var(--primary))" },
  { icon: Zap, title: "Memory", desc: "Persistent memory that learns your preferences across sessions.", color: "hsl(var(--gclaw-yellow))" },
];

const TIERS = [
  { name: "gClaw", desc: "Balanced all-rounder for everyday tasks", badge: "Default" },
  { name: "gClaw Flash", desc: "Optimized for speed — fast and efficient", badge: "Fast" },
  { name: "gClaw Nano", desc: "Lightweight instant answers — free for guests", badge: "Free" },
  { name: "gClaw Thinking", desc: "Deep reasoning with visible chain-of-thought", badge: "Pro" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const Landing = () => (
  <div className="min-h-screen bg-background">
    {/* Nav */}
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container flex h-14 items-center gap-3 px-4">
        <img src={logoSrc} alt="gClaw" className="h-7 w-7" />
        <span className="font-display text-lg font-bold tracking-tight">gClaw</span>
        <div className="flex-1" />
        <ThemeToggle />
        <Button variant="ghost" size="sm" className="min-h-[44px]" asChild>
          <Link to="/auth">Sign In</Link>
        </Button>
        <Button size="sm" className="min-h-[44px] glow-brand" asChild>
          <Link to="/chat">Try Free <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
        </Button>
      </div>
    </nav>

    {/* Hero */}
    <section className="relative overflow-hidden">
      <div className="hero-mesh absolute inset-0 -z-10" />
      <div className="container px-4 py-20 md:py-32 text-center">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
            <Sparkles className="h-3 w-3 text-primary" /> Multi-Provider AI Agent Platform
          </span>
        </motion.div>
        <motion.h1
          className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          initial="hidden" animate="visible" variants={fadeUp} custom={1}
        >
          Your AI.{" "}
          <span className="text-gradient-brand">Your Rules.</span>
        </motion.h1>
        <motion.p
          className="mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground mb-8"
          initial="hidden" animate="visible" variants={fadeUp} custom={2}
        >
          Enterprise-grade AI agent platform with web search, knowledge base, voice,
          deep reasoning, and browser control — all in one interface.
        </motion.p>
        <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-3" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <Button size="lg" className="min-h-[48px] px-8 glow-brand btn-hover-glow text-base" asChild>
            <Link to="/chat"><MessageSquare className="mr-2 h-4 w-4" /> Start Chatting</Link>
          </Button>
          <Button variant="outline" size="lg" className="min-h-[48px] px-8 text-base" asChild>
            <Link to="/auth">Create Account</Link>
          </Button>
        </motion.div>
      </div>
    </section>

    {/* Features */}
    <section className="container px-4 py-16 md:py-24">
      <div className="text-center mb-12">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">Built-In Skills</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">Every skill works across all model tiers — toggle them on or off per conversation.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-colors"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp} custom={i}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg mb-4" style={{ backgroundColor: `${f.color}15` }}>
              <f.icon className="h-5 w-5" style={{ color: f.color }} />
            </div>
            <h3 className="font-display font-semibold mb-1">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>

    {/* Model Tiers */}
    <section className="border-t border-border">
      <div className="container px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">Model Tiers</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Choose the right balance of speed, cost, and reasoning depth.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {TIERS.map((t, i) => (
            <motion.div
              key={t.name}
              className="rounded-xl border border-border bg-card p-6 text-center hover:border-primary/30 transition-colors"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
            >
              <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary mb-3">{t.badge}</span>
              <h3 className="font-display font-bold text-lg mb-1">{t.name}</h3>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="border-t border-border">
      <div className="container px-4 py-16 md:py-20 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">Ready to get started?</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">No credit card required. Try gClaw Nano for free — upgrade anytime.</p>
        <Button size="lg" className="min-h-[48px] px-10 glow-brand btn-hover-glow text-base" asChild>
          <Link to="/chat"><Sparkles className="mr-2 h-4 w-4" /> Launch gClaw</Link>
        </Button>
      </div>
    </section>

    {/* Footer */}
    <footer className="border-t border-border py-8">
      <div className="container px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <img src={logoSrc} alt="gClaw" className="h-4 w-4" />
          <span>© {new Date().getFullYear()} gClaw. All rights reserved.</span>
        </div>
        <div className="flex gap-4">
          <Link to="/auth" className="hover:text-foreground transition-colors">Sign In</Link>
          <Link to="/chat" className="hover:text-foreground transition-colors">Chat</Link>
        </div>
      </div>
    </footer>
  </div>
);

export default Landing;
