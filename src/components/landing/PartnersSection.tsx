const partners = [
  "NVIDIA", "Google Cloud", "Salesforce", "Cisco", "Adobe",
  "CrowdStrike", "ServiceNow", "Databricks",
];

const PartnersSection = () => {
  return (
    <section className="border-t border-border/30 py-16">
      <div className="container">
        <p className="mb-10 text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Trusted by leading enterprise platforms
        </p>
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-4">
          {partners.map((name) => (
            <div
              key={name}
              className="flex items-center justify-center rounded-lg border border-border/30 bg-card/50 px-6 py-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
