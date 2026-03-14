import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  borderTop?: boolean;
}

const SectionWrapper = ({ id, children, className, borderTop = true }: SectionWrapperProps) => {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      ref={ref}
      id={id}
      className={cn(
        "py-20 md:py-28",
        borderTop && "border-t border-border/30",
        className
      )}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="container">{children}</div>
    </motion.section>
  );
};

export default SectionWrapper;
