import { Bot } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border/30 py-12">
      <div className="container">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <span>g</span>
            <span className="text-gradient-green">Bot</span>
          </div>

          {/* Links */}
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
            <a href="#" className="hover:text-foreground transition-colors">Discord</a>
            <a href="#" className="hover:text-foreground transition-colors">License</a>
          </div>
        </div>

        <div className="mt-8 border-t border-border/30 pt-6 text-center text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} gBot. Open-source AI agent platform.
            Built on NVIDIA NeMo & OpenClaw.
          </p>
          <p className="mt-1">
            NVIDIA, NeMo, and NIM are trademarks of NVIDIA Corporation.
            Google, Gemini are trademarks of Google LLC.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
