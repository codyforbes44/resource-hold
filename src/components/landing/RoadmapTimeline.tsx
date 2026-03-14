const milestones = [
  {
    phase: "Phase 1",
    date: "Q1 2026",
    title: "Foundation",
    items: ["Landing page & brand identity", "Core UI component library", "Dark theme design system"],
    active: true,
  },
  {
    phase: "Phase 2",
    date: "Q2 2026",
    title: "AI Agent Core",
    items: ["Multi-provider chat interface", "Voice agent (ElevenLabs)", "Model switching (Gemini, GPT, NIM)"],
    active: false,
  },
  {
    phase: "Phase 3",
    date: "Q3 2026",
    title: "Enterprise Features",
    items: ["Role-based access control", "Agent orchestration engine", "Audit logging & compliance"],
    active: false,
  },
  {
    phase: "Phase 4",
    date: "Q4 2026",
    title: "Ecosystem Launch",
    items: ["Plugin marketplace", "Community agent templates", "Self-hosted deployment guide"],
    active: false,
  },
];

const RoadmapTimeline = () => {
  return (
    <section id="roadmap" className="border-t border-border/30 py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            <span className="text-gradient-green">Roadmap</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Our path from open-source foundation to enterprise-ready AI agent platform.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl">
          <div className="relative space-y-8 border-l-2 border-border/50 pl-8">
            {milestones.map((m) => (
              <div key={m.phase} className="relative">
                {/* Dot */}
                <div
                  className={`absolute -left-[calc(2rem+5px)] top-1 h-3 w-3 rounded-full border-2 ${
                    m.active
                      ? "border-primary bg-primary animate-pulse-glow"
                      : "border-muted-foreground/40 bg-background"
                  }`}
                />
                <div className="flex items-baseline gap-3">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                    {m.phase}
                  </span>
                  <span className="text-xs text-muted-foreground">{m.date}</span>
                </div>
                <h3 className="mt-2 font-display text-lg font-semibold">{m.title}</h3>
                <ul className="mt-2 space-y-1">
                  {m.items.map((item) => (
                    <li key={item} className="text-sm text-muted-foreground">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RoadmapTimeline;
