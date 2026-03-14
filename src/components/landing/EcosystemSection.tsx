import { Bot, Shield, Wrench, Users } from "lucide-react";

const variants = [
  {
    icon: Bot,
    name: "gBot Core",
    desc: "The foundational agent platform — open-source, self-hostable, community-driven.",
    badge: "Free",
  },
  {
    icon: Shield,
    name: "gBot Enterprise",
    desc: "SOC 2 compliant, SSO, audit logging, priority support, and SLA guarantees.",
    badge: "Coming Soon",
  },
  {
    icon: Wrench,
    name: "gBot Builder",
    desc: "No-code agent builder with visual workflow editor and pre-built templates.",
    badge: "Coming Soon",
  },
  {
    icon: Users,
    name: "gBot Community",
    desc: "Shared agent templates, plugins, and integrations contributed by the community.",
    badge: "Open",
  },
];

const EcosystemSection = () => {
  return (
    <section id="ecosystem" className="border-t border-border/30 py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            The gBot <span className="text-gradient-green">Ecosystem</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            A family of products and community resources built around the gBot platform.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-2">
          {variants.map((v) => (
            <div
              key={v.name}
              className="rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-primary/30 hover:glow-green"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <v.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                  {v.badge}
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{v.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EcosystemSection;
