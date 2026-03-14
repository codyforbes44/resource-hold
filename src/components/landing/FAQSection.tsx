import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What makes gBot different from NemoClaw or OpenClaw?",
    a: "gBot combines the enterprise-grade model pipeline from NVIDIA NeMo with the open-source agent orchestration of the OpenClaw ecosystem. Unlike NemoClaw (proprietary) or OpenClaw (community-only), gBot bridges both worlds — offering enterprise security with open-source transparency and hardware flexibility.",
  },
  {
    q: "Which AI models does gBot support?",
    a: "gBot supports multi-provider model routing including Google Gemini, OpenAI GPT models, and NVIDIA NIM inference microservices. You can switch providers per-agent or per-conversation, and add custom fine-tuned models via the NeMo pipeline.",
  },
  {
    q: "Can I run gBot on non-NVIDIA hardware?",
    a: "Yes. gBot is hardware-agnostic by design. While it leverages NVIDIA NeMo for training workflows, the inference and agent runtime supports AMD ROCm, Intel oneAPI, and standard CPU deployments.",
  },
  {
    q: "Is gBot truly open source?",
    a: "The gBot Core platform is fully open-source under a permissive license. Enterprise features (SSO, audit logging, SLA support) are available as a commercial offering. The community ecosystem — templates, plugins, integrations — is always open.",
  },
  {
    q: "How does voice agent support work?",
    a: "gBot integrates with ElevenLabs for real-time conversational voice agents with sub-200ms latency. Voice agents can be deployed alongside text-based agents, sharing the same underlying model and system prompts.",
  },
  {
    q: "What security certifications does gBot target?",
    a: "gBot is architected for SOC 2 Type II compliance with features including end-to-end encryption, role-based access control, audit logging, data residency controls, and zero-trust network architecture.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="border-t border-border/30 py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Frequently Asked <span className="text-gradient-green">Questions</span>
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
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
      </div>
    </section>
  );
};

export default FAQSection;
