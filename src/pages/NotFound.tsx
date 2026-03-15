import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import logoGclaw from "@/assets/logo-gclaw.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <img src={logoGclaw} alt="gClaw logo" className="h-10 w-10" />
        </div>
        <h1 className="font-display text-6xl font-bold text-foreground">404</h1>
        <p className="mt-3 text-lg text-muted-foreground">This page doesn't exist in the gClaw universe.</p>
        <Button asChild className="mt-8 glow-brand">
          <a href="/">Return to Home</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
