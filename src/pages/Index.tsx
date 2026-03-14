import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import OverviewSection from "@/components/landing/OverviewSection";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import PartnersSection from "@/components/landing/PartnersSection";
import ComparisonTable from "@/components/landing/ComparisonTable";
import RoadmapTimeline from "@/components/landing/RoadmapTimeline";
import WhyItMatters from "@/components/landing/WhyItMatters";
import EcosystemSection from "@/components/landing/EcosystemSection";
import FAQSection from "@/components/landing/FAQSection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
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
    </div>
  );
};

export default Index;
