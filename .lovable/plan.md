

# gBot — Enterprise AI Agent Platform

## Vision

Build **gBot**, a best-in-class enterprise AI agent platform that combines the strengths of NVIDIA's NeMo framework and the OpenClaw ecosystem. Positioned as a multi-provider, hardware-agnostic, open-source AI agent platform with voice/multimodal capabilities and enterprise-grade security — leveraging your Google and NVIDIA certifications.

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────┐
│                     gBot Frontend                       │
│  Landing Page → Dashboard → Agent Builder → Chat UI     │
└──────────────┬──────────────────────────────┬───────────┘
               │                              │
     ┌─────────▼──────────┐        ┌──────────▼──────────┐
     │  Marketing Site     │        │  Agent Platform UI   │
     │  (NemoClaw-style)   │        │  Multi-provider AI   │
     │  - Hero / Features  │        │  - Chat interface    │
     │  - Comparison table │        │  - Voice (ElevenLabs)│
     │  - Roadmap timeline │        │  - Model switcher    │
     │  - FAQ / Ecosystem  │        │  - Agent management  │
     └────────────────────┘        └──────────┬───────────┘
                                              │
                              ┌───────────────▼────────────┐
                              │   Supabase Edge Functions   │
                              │  - Lovable AI Gateway       │
                              │  - ElevenLabs Voice         │
                              │  - Auth & RLS               │
                              └────────────────────────────┘
```

## Implementation Plan

### Phase 1 — Marketing Landing Page (NemoClaw-inspired)

Dark theme site with NVIDIA green accent, mirroring the NemoClaw screenshots:

- **Navbar**: gBot logo, nav links (Features, Comparison, Roadmap, FAQ, Ecosystem), language selector
- **Hero Section**: "gBot — Enterprise AI Agents, Redefined" with gradient text, description paragraph, CTA buttons
- **Overview Section**: "What is gBot?" with narrative content referencing NeMo + OpenClaw lineage
- **Features Grid**: 4 cards — Enterprise Security, Open-Source Customization, Task Automation, Multi-Provider Integration
- **Partners Section**: Enterprise partnerships grid (Salesforce, Cisco, Google, Adobe, CrowdStrike)
- **Comparison Table**: gBot vs OpenClaw vs NemoClaw across key attributes
- **Roadmap Timeline**: Vertical timeline with milestones
- **Why It Matters**: Industry impact section with 3-layer strategy cards (Chip, Middleware, Application)
- **Ecosystem Section**: Claw family variant cards
- **FAQ Accordion**: Common questions
- **Footer**: References, links, trademark notices

### Phase 2 — Functional AI Agent Interface

- **Auth**: Supabase auth with login/signup
- **Chat UI**: Streaming chat interface using Lovable AI Gateway as default provider
- **Model Switcher**: Toggle between Google Gemini, OpenAI GPT-5, with UI for future NVIDIA NIM integration
- **Voice Mode**: ElevenLabs conversational AI agent integration for voice interactions
- **Agent Management**: Create/configure/deploy agent profiles with custom system prompts

### Phase 3 — Enterprise Features

- **User roles** table (admin/user/moderator) with RLS
- **Data governance** dashboard
- **Multi-agent orchestration** UI

## Technical Details

### Theme
- Dark background matching NemoClaw: `hsl(222, 84%, 4.9%)` (already the dark theme)
- Primary accent: NVIDIA green `hsl(90, 100%, 45%)` blended with Google blue
- Force dark mode by default

### File Structure (Phase 1)
```text
src/
  components/
    landing/
      Navbar.tsx
      HeroSection.tsx
      OverviewSection.tsx
      FeaturesGrid.tsx
      PartnersSection.tsx
      ComparisonTable.tsx
      RoadmapTimeline.tsx
      WhyItMatters.tsx
      EcosystemSection.tsx
      FAQSection.tsx
      Footer.tsx
  pages/
    Index.tsx          (landing page composing all sections)
    Dashboard.tsx      (Phase 2)
    Chat.tsx           (Phase 2)
```

### Key Dependencies to Add
- `react-markdown` (for AI chat rendering in Phase 2)
- `@elevenlabs/react` (for voice agent in Phase 2)

### Routing
- `/` — Landing page
- `/dashboard` — Agent management (Phase 2)
- `/chat` — AI chat interface (Phase 2)
- `/login` — Auth (Phase 2)

## Recommendation

Start with **Phase 1** — the marketing landing page. This establishes gBot's brand identity and competitive positioning immediately, drawing from both NemoClaw's enterprise credibility and OpenClaw's open-source community appeal. Phase 2 (functional AI) builds on top with Lovable AI Gateway + ElevenLabs voice, making gBot a working platform, not just a website.

