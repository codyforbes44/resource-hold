import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import SectionWrapper from "./SectionWrapper";
import SectionHeader from "./SectionHeader";
import { FAQS } from "@/constants/landing";

const FAQSection = () => {
  return (
    <SectionWrapper id="faq">
      <SectionHeader>
        Frequently Asked <span className="text-gradient-brand">Questions</span>
      </SectionHeader>

      <div className="mx-auto mt-12 max-w-2xl">
        <Accordion type="single" collapsible className="space-y-2">
          {FAQS.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-lg border border-border/50 bg-card px-6 data-[state=open]:border-primary/30"
            >
              <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </SectionWrapper>
  );
};

export default FAQSection;
