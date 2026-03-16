import {
  Bot,
  Brain,
  Layers,
  Lock,
  Workflow,
  Headphones,
  Shield,
  Wrench,
  Users,
  Cpu,
  Code,
  Rocket,
  Globe,
  Mic,
  Database,
  Eye,
  Terminal,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// --- Nav ---
export const NAV_LINKS = [
  { label: "Platform", href: "#platform" },
  { label: "Features", href: "#features" },
  { label: "Architecture", href: "#architecture" },
  { label: "Ecosystem", href: "#ecosystem" },
  { label: "FAQ", href: "#faq" },
] as const;

// --- Hero Stats ---
export const HERO_STATS = [
  { value: "5+", label: "AI Models" },
  { value: "7", label: "Skill Modules" },
  { value: "100%", label: "Open Source" },
] as const;

// --- Platform Capabilities (shipped features) ---
export interface Capability {
  icon: LucideIcon;
  title: string;
  desc: string;
  badge: string;
}

export const CAPABILITIES: Capability[] = [
  {
    icon: Brain,
    title: "Multi-Model Chat",
    desc: "Switch between Gemini 3 Flash, Gemini 2.5 Pro, GPT-5, and GPT-5 Mini per-conversation. Streaming responses with markdown rendering and code highlighting.",
    badge: "Live",
  },
  {
    icon: Headphones,
    title: "Voice Agents",
    desc: "Real-time conversational voice agents powered by ElevenLabs. Natural dialogue with automatic conversation persistence.",
    badge: "Live",
  },
  {
    icon: Database,
    title: "Knowledge Base / RAG",
    desc: "Upload documents, auto-chunk and embed with vector search (pgvector). The AI retrieves relevant context from your files during chat.",
    badge: "Live",
  },
  {
    icon: Globe,
    title: "Web Search & Browser",
    desc: "Firecrawl-powered real-time web search and full-page browsing. Get cited answers from live content or scrape any URL directly.",
    badge: "Live",
  },
  {
    icon: Eye,
    title: "Image Generation",
    desc: "Generate images directly in chat using Gemini's multimodal capabilities. Describe what you need, get visual output inline.",
    badge: "Live",
  },
  {
    icon: Shield,
    title: "RBAC & Governance",
    desc: "Role-based access control with server-side enforcement, audit logging, admin dashboard, and protected routes.",
    badge: "Live",
  },
  {
    icon: Brain,
    title: "Persistent Memory",
    desc: "gClaw remembers your preferences, context, and important details across sessions. It becomes uniquely yours over time.",
    badge: "Live",
  },
  {
    icon: Cpu,
    title: "Browser Control",
    desc: "Browse, scrape, and extract content from any web page. Read documentation, extract data, and analyze page content inline.",
    badge: "Live",
  },
];

// --- Overview Pillars ---
export interface Pillar {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export const PILLARS: Pillar[] = [
  {
    icon: Shield,
    title: "Enterprise Security",
    desc: "Role-based access, server-side auth enforcement, audit logging, and zero-trust architecture built into every layer.",
  },
  {
    icon: Cpu,
    title: "Hardware Agnostic",
    desc: "Runs on NVIDIA, AMD, Intel, or cloud GPUs. The platform adapts to your infrastructure — no vendor lock-in.",
  },
  {
    icon: Globe,
    title: "Open-Source First",
    desc: "Built on NeMo and OpenClaw — fully transparent, community-driven, with enterprise support options available.",
  },
  {
    icon: Sparkles,
    title: "Skill Ecosystem",
    desc: "Modular skill marketplace: web search, image generation, knowledge base, and code interpretation — toggle per conversation.",
  },
];

// --- Features ---
export interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export const FEATURES: Feature[] = [
  {
    icon: Brain,
    title: "Multi-Provider Intelligence",
    desc: "Route between Google Gemini, OpenAI GPT-5 family, and NVIDIA NIM models. Switch providers per-conversation with a single toggle.",
  },
  {
    icon: Bot,
    title: "Streaming Chat Interface",
    desc: "Production chat with real-time streaming, conversation persistence, search, inline rename, message actions, and suggested prompts.",
  },
  {
    icon: Headphones,
    title: "Voice Agent Engine",
    desc: "Conversational voice agents with ElevenLabs integration, automatic conversation saving, and seamless text/voice mode switching.",
  },
  {
    icon: Lock,
    title: "Server-Side Security",
    desc: "JWT-validated edge functions, RLS policies, server-side role checks, and audit logging. No client-side privilege escalation.",
  },
  {
    icon: Database,
    title: "RAG Knowledge Base",
    desc: "Upload documents, auto-chunk into embeddings via pgvector, and retrieve relevant context during chat with similarity search.",
  },
  {
    icon: Workflow,
    title: "gClaw Skills",
    desc: "Modular skill system: Web Search, Image Gen, Knowledge Base, Code Interpreter, Memory, Browser Control, and Deep Research — each toggleable per session.",
  },
  {
    icon: Brain,
    title: "Persistent Memory",
    desc: "Remembers you across sessions. Preferences, context, and important details are stored and recalled automatically.",
  },
  {
    icon: Globe,
    title: "Browser Control",
    desc: "Browse any URL, extract content as markdown, and use it as context. Powered by Firecrawl scraping.",
  },
];

// --- Comparison ---
export type ComparisonStatus = "yes" | "no" | "partial";

export interface ComparisonRow {
  feature: string;
  gclaw: ComparisonStatus;
  openclaw: ComparisonStatus;
  nemoclaw: ComparisonStatus;
}

export const COMPARISON_DATA: ComparisonRow[] = [
  { feature: "Open Source", gclaw: "yes", openclaw: "yes", nemoclaw: "no" },
  { feature: "Multi-Provider Models", gclaw: "yes", openclaw: "partial", nemoclaw: "no" },
  { feature: "Hardware Agnostic", gclaw: "yes", openclaw: "yes", nemoclaw: "no" },
  { feature: "Voice Agents", gclaw: "yes", openclaw: "no", nemoclaw: "partial" },
  { feature: "RAG / Knowledge Base", gclaw: "yes", openclaw: "no", nemoclaw: "partial" },
  { feature: "Enterprise RBAC", gclaw: "yes", openclaw: "partial", nemoclaw: "yes" },
  { feature: "Skill Marketplace", gclaw: "yes", openclaw: "partial", nemoclaw: "no" },
  { feature: "Self-Hosted Option", gclaw: "yes", openclaw: "yes", nemoclaw: "no" },
  { feature: "Persistent Memory", gclaw: "yes", openclaw: "yes", nemoclaw: "no" },
  { feature: "Browser Control", gclaw: "yes", openclaw: "yes", nemoclaw: "no" },
];

// --- Roadmap ---
export interface Milestone {
  phase: string;
  date: string;
  title: string;
  items: string[];
  active: boolean;
  completed?: boolean;
}

export const MILESTONES: Milestone[] = [
  {
    phase: "Phase 1",
    date: "Q1 2026",
    title: "Foundation",
    items: [
      "Landing page & brand identity",
      "Auth system with email/Google SSO",
      "Dark/light theme design system",
      "PWA with offline support",
    ],
    active: false,
    completed: true,
  },
  {
    phase: "Phase 2",
    date: "Q2 2026",
    title: "AI Agent Core",
    items: [
      "Multi-provider streaming chat",
      "Voice agent (ElevenLabs)",
      "RAG knowledge base with pgvector",
      "Skill marketplace (Web, Image, KB)",
    ],
    active: true,
  },
  {
    phase: "Phase 3",
    date: "Q3 2026",
    title: "Enterprise Features",
    items: [
      "Admin dashboard with analytics",
      "Role-based access control",
      "Audit logging & compliance",
      "Server-side pagination & filtering",
    ],
    active: false,
  },
  {
    phase: "Phase 4",
    date: "Q4 2026",
    title: "Ecosystem Launch",
    items: ["Plugin marketplace", "Community agent templates", "Self-hosted deployment guide", "noclaw edge runtime"],
    active: false,
  },
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
  {
    icon: Cpu,
    title: "Chip Layer",
    subtitle: "NVIDIA · AMD · Intel",
    desc: "Hardware-agnostic by design. Deploy on any GPU architecture — from datacenter H100s to edge devices.",
    color: "text-gclaw-red",
  },
  {
    icon: Code,
    title: "Middleware Layer",
    subtitle: "NeMo · OpenClaw · CUDA",
    desc: "The orchestration backbone — combining NeMo's training pipeline with OpenClaw's agent coordination protocol.",
    color: "text-gclaw-blue",
  },
  {
    icon: Rocket,
    title: "Application Layer",
    subtitle: "gClaw Platform",
    desc: "Production-ready interface for multi-model chat, voice agents, RAG, skills, RBAC, and admin governance.",
    color: "text-gclaw-green",
  },
];

// --- Ecosystem ---
export interface EcosystemVariant {
  icon: LucideIcon;
  name: string;
  desc: string;
  badge: string;
}

export const ECOSYSTEM_VARIANTS: EcosystemVariant[] = [
  {
    icon: Bot,
    name: "gClaw Core",
    desc: "The foundational agent platform — open-source, self-hostable, with multi-model chat, voice, RAG, and skill ecosystem.",
    badge: "Live",
  },
  {
    icon: Shield,
    name: "gClaw Enterprise",
    desc: "SOC 2 compliant, SSO, audit logging, priority support, and SLA guarantees.",
    badge: "Coming Soon",
  },
  {
    icon: Terminal,
    name: "noclaw",
    desc: "Minimal autonomous agent runtime in pure C (~88KB). Built for edge devices, IoT gateways, and resource-constrained environments.",
    badge: "Edge",
  },
  {
    icon: Wrench,
    name: "gClaw Builder",
    desc: "No-code agent builder with visual workflow editor and pre-built templates.",
    badge: "Coming Soon",
  },
  {
    icon: Users,
    name: "gClaw Community",
    desc: "Shared agent templates, plugins, and integrations contributed by the community.",
    badge: "Open",
  },
];

// --- FAQs ---
export interface FAQ {
  q: string;
  a: string;
}

export const FAQS: FAQ[] = [
  {
    q: "What can I do with gClaw today?",
    a: "gClaw is a live platform with multi-model chat (Gemini, GPT-5), conversational voice agents, RAG knowledge base with document upload and vector search, web search, browser control, image generation, persistent memory, an admin dashboard with RBAC and audit logging, and a PWA for mobile install. Everything listed as 'Live' on this page is shipped and working.",
  },
  {
    q: "Which AI models does gClaw support?",
    a: "gClaw supports Google Gemini 3 Flash, Gemini 2.5 Flash, Gemini 2.5 Pro, OpenAI GPT-5 Mini, and GPT-5. You can switch models per-conversation. Custom fine-tuned models can be added via the NeMo pipeline.",
  },
  {
    q: "How does the Knowledge Base / RAG work?",
    a: "Upload text, markdown, CSV, or JSON files. gClaw automatically chunks the content, generates vector embeddings, and stores them with pgvector. When you chat, the AI retrieves relevant chunks via cosine similarity search and uses them as context for grounded, cited responses.",
  },
  {
    q: "How does Persistent Memory work?",
    a: "When the Memory skill is enabled, gClaw proactively stores your preferences, context, and important details across sessions. It remembers your name, projects, coding preferences, and more — becoming uniquely personalized to you over time.",
  },
  {
    q: "What is Browser Control?",
    a: "The Browser Control skill lets gClaw browse any web page, extract its full content as markdown, and use it as context in your conversation. Powered by Firecrawl, it can read documentation, articles, product pages, and more — directly within chat.",
  },
  {
    q: "Is gClaw truly open source?",
    a: "The gClaw Core platform is fully open-source under a permissive license. Enterprise features (SSO, audit logging, SLA support) are available as a commercial offering. The community ecosystem — templates, plugins, integrations — is always open.",
  },
  {
    q: "How does voice agent support work?",
    a: "gClaw integrates with ElevenLabs for real-time conversational voice agents. Voice agents can be deployed alongside text-based agents, sharing the same underlying model. Conversations are automatically persisted.",
  },
  {
    q: "What security model does gClaw use?",
    a: "gClaw enforces server-side JWT validation on all edge functions, row-level security on all database tables, role-based access control via a dedicated user_roles table with security definer functions, and audit logging. Admin operations are verified server-side — no client-side privilege checks.",
  },
];

// --- Footer ---
export const FOOTER_LINKS = [
  { label: "Documentation", href: "#faq" },
  { label: "Architecture", href: "#architecture" },
  { label: "Ecosystem", href: "#ecosystem" },
] as const;
