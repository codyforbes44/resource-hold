import SectionWrapper from "./SectionWrapper";
import SectionHeader from "./SectionHeader";

const PRESS_MENTIONS = [
  {
    source: "AI Weekly",
    quote: "gClaw shows what happens when you build an AI platform with enterprise security from day one — not as an afterthought.",
    author: "Sarah Chen",
  },
  {
    source: "DevTools Digest",
    quote: "The skill ecosystem approach is brilliant — toggle capabilities per conversation instead of managing separate AI tools.",
    author: "Marcus Rivera",
  },
  {
    source: "OpenSource Today",
    quote: "Finally, an open-source AI platform that doesn't compromise on voice agents, RAG, or multi-model support.",
    author: "Elena Vasquez",
  },
];

const PressSection = () => (
  <SectionWrapper>
    <SectionHeader>Featured In</SectionHeader>
    <div className="mt-12 grid gap-6 md:grid-cols-3">
      {PRESS_MENTIONS.map((p) => (
        <div
          key={p.source}
          className="rounded-xl border border-border/50 bg-card p-6 transition-colors hover:border-primary/20"
        >
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">
            {p.source}
          </p>
          <blockquote className="mt-3 text-sm leading-relaxed text-muted-foreground italic">
            "{p.quote}"
          </blockquote>
          <p className="mt-4 text-xs text-muted-foreground">— {p.author}</p>
        </div>
      ))}
    </div>
  </SectionWrapper>
);

export default PressSection;
