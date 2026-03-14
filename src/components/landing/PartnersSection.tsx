import SectionWrapper from "./SectionWrapper";
import { PARTNERS } from "@/constants/landing";

const PartnersSection = () => {
  return (
    <SectionWrapper>
      <p className="mb-10 text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Trusted by leading enterprise platforms
      </p>
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-8">
        {PARTNERS.map((name) => (
          <div
            key={name}
            className="flex items-center justify-center rounded-lg border border-border/30 bg-card/50 px-4 py-3 text-sm font-semibold text-muted-foreground transition-all duration-300 hover:border-primary/30 hover:text-foreground sm:px-6 sm:py-4"
          >
            {name}
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
};

export default PartnersSection;
