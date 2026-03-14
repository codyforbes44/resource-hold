import { Bot, Brain, Layers, Lock, Workflow, Headphones, Shield, Wrench, Users, Cpu, Code, Rocket, Globe, Mic } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// --- Nav ---
export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Comparison", href: "#comparison" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "Ecosystem", href: "#ecosystem" },
  { label: "FAQ", href: "#faq" },
] as const;

// --- Hero Stats ---
export const HERO_STATS = [
  { value: "3+", label: "AI Providers" },
  { value: "∞", label: "Hardware Support" },
  { value: "100%", label: "Open Source" },
] as const;

// --- Overview Pillars ---
export interface Pillar {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export const PILLARS: Pillar[] = [
  { icon: Shield, title: "Enterprise Security", desc: "Multi-layer authentication, data governance, and privacy controls built into every agent deployment." },
  { icon: Cpu, title: "Hardware Agnostic", desc: "Run on NVIDIA, AMD, Intel, or cloud GPUs. No vendor lock-in — gBot adapts to your infrastructure." },
  { icon: Globe, title: "Open-Source First", desc: "Built on NeMo and OpenClaw — fully transparent, community-driven, with enterprise support options." },
  { icon: Mic, title: "Voice + Multimodal", desc: "Native voice agents, image understanding, and multimodal interactions powered by state-of-the-art models." },
];

// --- Features ---
export interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export const FEATURES: Feature[] = [
  { icon: Brain, title: "Multi-Provider Intelligence", desc: "Switch between Google Gemini, OpenAI, and NVIDIA NIM models with a single toggle. Best-in-class model routing." },
  { icon: Bot, title: "Autonomous Agent Workflows", desc: "Build complex multi-step agent pipelines with conditional logic, tool use, and human-in-the-loop approval gates." },
  { icon: Headphones, title: "Voice Agent Engine", desc: "Real-time conversational voice agents with ElevenLabs integration. Sub-200ms latency for natural dialogue." },
  { icon: Lock, title: "Zero-Trust Security", desc: "End-to-end encryption, SOC 2 compliance-ready architecture, role-based access control, and audit logging." },
  { icon: Layers, title: "NeMo Model Pipeline", desc: "Fine-tune, evaluate, and deploy custom models using NVIDIA NeMo's training framework — directly from gBot." },
  { icon: Workflow, title: "OpenClaw Orchestration", desc: "Leverage the Claw ecosystem's agent coordination protocol for multi-agent collaboration and task decomposition." },
];

// --- Partners ---
export const PARTNERS = [
  "NVIDIA", "Google Cloud", "Salesforce", "Cisco",
  "Adobe", "CrowdStrike", "ServiceNow", "Databricks",
] as const;

// --- Comparison ---
export type ComparisonStatus = "yes" | "no" | "partial";

export interface ComparisonRow {
  feature: string;
  gbot: ComparisonStatus;
  openclaw: ComparisonStatus;
  nemoclaw: ComparisonStatus;
}

export const COMPARISON_DATA: ComparisonRow[] = [
  { feature: "Open Source", gbot: "yes", openclaw: "yes", nemoclaw: "no" },
  { feature: "Multi-Provider Models", gbot: "yes", openclaw: "partial", nemoclaw: "no" },
  { feature: "Hardware Agnostic", gbot: "yes", openclaw: "yes", nemoclaw: "no" },
  { feature: "Voice Agents", gbot: "yes", openclaw: "no", nemoclaw: "partial" },
  { feature: "Enterprise Security", gbot: "yes", openclaw: "partial", nemoclaw: "yes" },
  { feature: "NeMo Integration", gbot: "yes", openclaw: "no", nemoclaw: "yes" },
  { feature: "Community Ecosystem", gbot: "yes", openclaw: "yes", nemoclaw: "no" },
  { feature: "Self-Hosted Option", gbot: "yes", openclaw: "yes", nemoclaw: "no" },
];

// --- Roadmap ---
export interface Milestone {
  phase: string;
  date: string;
  title: string;
  items: string[];
  active: boolean;
}

export const MILESTONES: Milestone[] = [
  { phase: "Phase 1", date: "Q1 2026", title: "Foundation", items: ["Landing page & brand identity", "Core UI component library", "Dark theme design system"], active: true },
  { phase: "Phase 2", date: "Q2 2026", title: "AI Agent Core", items: ["Multi-provider chat interface", "Voice agent (ElevenLabs)", "Model switching (Gemini, GPT, NIM)"], active: false },
  { phase: "Phase 3", date: "Q3 2026", title: "Enterprise Features", items: ["Role-based access control", "Agent orchestration engine", "Audit logging & compliance"], active: false },
  { phase: "Phase 4", date: "Q4 2026", title: "Ecosystem Launch", items: ["Plugin marketplace", "Community agent templates", "Self-hosted deployment guide"], active: false },
];

// --- Why It Matters ---
export interface Layer {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  desc: string;
  color: string;
}

export const LAYERS: Layer[] = [
  { icon: Cpu, title: "Chip Layer", subtitle: "NVIDIA · AMD · Intel", desc: "gBot is hardware-agnostic by design. Deploy on any GPU architecture — from datacenter H100s to edge devices.", color: "text-primary" },
  { icon: Code, title: "Middleware Layer", subtitle: "NeMo · OpenClaw · CUDA", desc: "The orchestration backbone — combining NeMo's training pipeline with OpenClaw's agent coordination protocol.", color: "text-gbot-blue" },
  { icon: Rocket, title: "Application Layer", subtitle: "gBot Platform", desc: "Where it all comes together — a production-ready interface for building, deploying, and managing AI agents.", color: "text-primary" },
];

// --- Ecosystem ---
export interface EcosystemVariant {
  icon: LucideIcon;
  name: string;
  desc: string;
  badge: string;
}

export const ECOSYSTEM_VARIANTS: EcosystemVariant[] = [
  { icon: Bot, name: "gBot Core", desc: "The foundational agent platform — open-source, self-hostable, community-driven.", badge: "Free" },
  { icon: Shield, name: "gBot Enterprise", desc: "SOC 2 compliant, SSO, audit logging, priority support, and SLA guarantees.", badge: "Coming Soon" },
  { icon: Wrench, name: "gBot Builder", desc: "No-code agent builder with visual workflow editor and pre-built templates.", badge: "Coming Soon" },
  { icon: Users, name: "gBot Community", desc: "Shared agent templates, plugins, and integrations contributed by the community.", badge: "Open" },
];

// --- FAQs ---
export interface FAQ {
  q: string;
  a: string;
}

export const FAQS: FAQ[] = [
  { q: "What makes gBot different from NemoClaw or OpenClaw?", a: "gBot combines the enterprise-grade model pipeline from NVIDIA NeMo with the open-source agent orchestration of the OpenClaw ecosystem. Unlike NemoClaw (proprietary) or OpenClaw (community-only), gBot bridges both worlds — offering enterprise security with open-source transparency and hardware flexibility." },
  { q: "Which AI models does gBot support?", a: "gBot supports multi-provider model routing including Google Gemini, OpenAI GPT models, and NVIDIA NIM inference microservices. You can switch providers per-agent or per-conversation, and add custom fine-tuned models via the NeMo pipeline." },
  { q: "Can I run gBot on non-NVIDIA hardware?", a: "Yes. gBot is hardware-agnostic by design. While it leverages NVIDIA NeMo for training workflows, the inference and agent runtime supports AMD ROCm, Intel oneAPI, and standard CPU deployments." },
  { q: "Is gBot truly open source?", a: "The gBot Core platform is fully open-source under a permissive license. Enterprise features (SSO, audit logging, SLA support) are available as a commercial offering. The community ecosystem — templates, plugins, integrations — is always open." },
  { q: "How does voice agent support work?", a: "gBot integrates with ElevenLabs for real-time conversational voice agents with sub-200ms latency. Voice agents can be deployed alongside text-based agents, sharing the same underlying model and system prompts." },
  { q: "What security certifications does gBot target?", a: "gBot is architected for SOC 2 Type II compliance with features including end-to-end encryption, role-based access control, audit logging, data residency controls, and zero-trust network architecture." },
];

// --- Footer ---
export const FOOTER_LINKS = [
  { label: "GitHub", href: "#" },
  { label: "Documentation", href: "#" },
  { label: "Discord", href: "#" },
  { label: "License", href: "#" },
] as const;
