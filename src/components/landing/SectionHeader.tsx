import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  children: React.ReactNode;
  description?: string;
  className?: string;
}

const SectionHeader = ({ children, description, className }: SectionHeaderProps) => (
  <div className={cn("mx-auto max-w-2xl text-center", className)}>
    <h2 className="font-display text-3xl font-bold md:text-4xl">{children}</h2>
    {description && (
      <p className="mt-4 text-muted-foreground">{description}</p>
    )}
  </div>
);

export default SectionHeader;
