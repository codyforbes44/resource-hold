import { Check, X, Minus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Status = "yes" | "no" | "partial";

const features: { feature: string; gbot: Status; openclaw: Status; nemoclaw: Status }[] = [
  { feature: "Open Source", gbot: "yes", openclaw: "yes", nemoclaw: "no" },
  { feature: "Multi-Provider Models", gbot: "yes", openclaw: "partial", nemoclaw: "no" },
  { feature: "Hardware Agnostic", gbot: "yes", openclaw: "yes", nemoclaw: "no" },
  { feature: "Voice Agents", gbot: "yes", openclaw: "no", nemoclaw: "partial" },
  { feature: "Enterprise Security", gbot: "yes", openclaw: "partial", nemoclaw: "yes" },
  { feature: "NeMo Integration", gbot: "yes", openclaw: "no", nemoclaw: "yes" },
  { feature: "Community Ecosystem", gbot: "yes", openclaw: "yes", nemoclaw: "no" },
  { feature: "Self-Hosted Option", gbot: "yes", openclaw: "yes", nemoclaw: "no" },
];

const StatusIcon = ({ status }: { status: Status }) => {
  if (status === "yes") return <Check className="mx-auto h-5 w-5 text-primary" />;
  if (status === "no") return <X className="mx-auto h-5 w-5 text-muted-foreground/40" />;
  return <Minus className="mx-auto h-5 w-5 text-muted-foreground" />;
};

const ComparisonTable = () => {
  return (
    <section id="comparison" className="border-t border-border/30 py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            How gBot <span className="text-gradient-green">Compares</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            gBot combines the best of both worlds — open-source flexibility with enterprise capability.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-xl border border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 bg-card hover:bg-card">
                <TableHead className="w-[200px] text-foreground">Feature</TableHead>
                <TableHead className="text-center font-display font-bold text-primary">gBot</TableHead>
                <TableHead className="text-center text-muted-foreground">OpenClaw</TableHead>
                <TableHead className="text-center text-muted-foreground">NemoClaw</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((row) => (
                <TableRow key={row.feature} className="border-border/30 hover:bg-accent/30">
                  <TableCell className="font-medium">{row.feature}</TableCell>
                  <TableCell><StatusIcon status={row.gbot} /></TableCell>
                  <TableCell><StatusIcon status={row.openclaw} /></TableCell>
                  <TableCell><StatusIcon status={row.nemoclaw} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
};

export default ComparisonTable;
