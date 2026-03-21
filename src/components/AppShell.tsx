import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";
import logoSrc from "@/assets/logo-gclaw.png";

interface AppShellProps {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  backTo?: string;
  maxWidth?: string;
}

const AppShell = ({ title, badge, children, backTo = "/", maxWidth }: AppShellProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(backTo)} className="min-h-[44px] min-w-[44px]">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <img src={logoSrc} alt="gClaw" className="h-6 w-6" />
          <h1 className="font-display text-lg font-bold truncate">{title}</h1>
          {badge}
          <div className="flex-1" />
          <ThemeToggle />
        </div>
      </div>
      <div className={`container px-4 py-6 ${maxWidth || ""}`}>
        {children}
      </div>
    </div>
  );
};

export default AppShell;
