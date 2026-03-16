import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import { Badge } from "@/components/ui/badge";
import OverviewSection from "@/components/landing/OverviewSection";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import PartnersSection from "@/components/landing/PartnersSection";
import ComparisonTable from "@/components/landing/ComparisonTable";
import RoadmapTimeline from "@/components/landing/RoadmapTimeline";
import WhyItMatters from "@/components/landing/WhyItMatters";
import ArchitectureSection from "@/components/landing/ArchitectureSection";
import EcosystemSection from "@/components/landing/EcosystemSection";
import FAQSection from "@/components/landing/FAQSection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Skip to content */}
      <a
        href="#features"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
      >
        Skip to content
      </a>
      <Navbar />
      <main>
        <HeroSection />
        <OverviewSection />
        <FeaturesGrid />
        <PartnersSection />
        <ComparisonTable />
        <RoadmapTimeline />
        <WhyItMatters />
        <EcosystemSection />
        <FAQSection />
      </main>
      <Footer />

      {/* Version Badge */}
      <div className="fixed bottom-4 right-4 z-50">
        <Badge
          variant="outline"
          className="font-mono text-[10px] tracking-widest bg-card/80 backdrop-blur-sm border-glow glow-brand px-3 py-1.5 uppercase text-muted-foreground"
        >
          gClaw_
        </Badge>
      </div>
    </div>
  );
};

export default Index;
