import { Check, X, Minus } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import SectionWrapper from "./SectionWrapper";
import SectionHeader from "./SectionHeader";
import { COMPARISON_DATA, type ComparisonStatus } from "@/constants/landing";

const StatusIcon = ({ status }: { status: ComparisonStatus }) => {
  if (status === "yes") return <Check className="mx-auto h-5 w-5 text-primary" aria-label="Yes" />;
  if (status === "no") return <X className="mx-auto h-5 w-5 text-muted-foreground/40" aria-label="No" />;
  return <Minus className="mx-auto h-5 w-5 text-muted-foreground" aria-label="Partial" />;
};

const ComparisonCard = ({ row }: { row: typeof COMPARISON_DATA[0] }) => (
  <div className="rounded-lg border border-border/50 bg-card p-4">
    <h3 className="font-display text-sm font-semibold mb-3">{row.feature}</h3>
    <div className="grid grid-cols-3 gap-2 text-center">
      {(["gclaw", "openclaw", "nemoclaw"] as const).map((key) => (
        <div key={key} className="flex flex-col items-center gap-1">
          <StatusIcon status={row[key]} />
          <span className={`text-xs ${key === "gclaw" ? "font-bold text-primary" : "text-muted-foreground"}`}>
            {key === "gclaw" ? "gClaw" : key === "openclaw" ? "OpenClaw" : "NemoClaw"}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const ComparisonTable = () => {
  return (
    <SectionWrapper id="comparison">
      <SectionHeader description="gClaw combines the best of both worlds — open-source flexibility with enterprise capability.">
        How &gt; gClaw <span className="text-gradient-brand">Compares</span><span className="ml-0.5 inline-block w-[2px] h-[1.1em] bg-primary align-middle animate-[blink_1s_step-end_infinite]" />
      </SectionHeader>

      {/* Desktop table */}
      <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-xl border border-border/50 hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 bg-card hover:bg-card">
              <TableHead className="w-[200px] text-foreground">Feature</TableHead>
              <TableHead className="text-center font-display font-bold text-primary">&gt; gClaw</TableHead>
              <TableHead className="text-center text-muted-foreground">OpenClaw</TableHead>
              <TableHead className="text-center text-muted-foreground">NemoClaw</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {COMPARISON_DATA.map((row) => (
              <TableRow key={row.feature} className="border-border/30 hover:bg-accent/30">
                <TableCell className="font-medium">{row.feature}</TableCell>
                <TableCell><StatusIcon status={row.gclaw} /></TableCell>
                <TableCell><StatusIcon status={row.openclaw} /></TableCell>
                <TableCell><StatusIcon status={row.nemoclaw} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="mt-12 grid gap-3 sm:hidden">
        {COMPARISON_DATA.map((row) => (
          <ComparisonCard key={row.feature} row={row} />
        ))}
      </div>
    </SectionWrapper>
  );
};

export default ComparisonTable;
