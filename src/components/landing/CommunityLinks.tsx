import { MessageSquare, BookOpen, Github, Download } from "lucide-react";
import SectionWrapper from "./SectionWrapper";
import SectionHeader from "./SectionHeader";

const LINKS = [
  {
    icon: MessageSquare,
    title: "Discord",
    desc: "Join the community",
    href: "#",
  },
  {
    icon: BookOpen,
    title: "Documentation",
    desc: "Learn the ropes",
    href: "#faq",
  },
  {
    icon: Github,
    title: "GitHub",
    desc: "View the source",
    href: "#",
  },
  {
    icon: Download,
    title: "Skill Hub",
    desc: "Download skills",
    href: "#ecosystem",
  },
];

const CommunityLinks = () => (
  <SectionWrapper>
    <SectionHeader>Community</SectionHeader>
    <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
      {LINKS.map((l) => (
        <a
          key={l.title}
          href={l.href}
          className="group flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card p-6 text-center transition-all hover:border-primary/30 hover:shadow-lg"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
            <l.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono text-sm font-semibold">{l.title}</p>
            <p className="text-xs text-muted-foreground">{l.desc}</p>
          </div>
        </a>
      ))}
    </div>
  </SectionWrapper>
);

export default CommunityLinks;
